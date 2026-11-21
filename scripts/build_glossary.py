"""
Build concise per-corpus English glossaries (`glossary.json`) for all unique lemmas
across Polish (UBG), German (Schlachter 1951), and Czech (Bible kralická) corpora.

Each `public/data/<corpus>/glossary.json` maps `<lemma> -> "<concise English gloss>"`
so row 04 (Translation) can display exact base-form meanings alongside the verse.

Caches progress incrementally in `raw_data/glossary_<lang>.json`.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = os.environ.get("LLM_ENDPOINT", "http://localhost:8000/v1/chat/completions")
MODEL = os.environ.get("LLM_MODEL", "")

CORPORA = {
    "pl": ("pl-bible-ubg", "Polish (Uwspółcześniona Biblia Gdańska)"),
    "de": ("de-bible-sch1951", "German (Schlachter 1951 Bible)"),
    "cs": ("cs-bible-bkr", "Early Modern Czech (1613 Bible kralická)"),
}

KIND_LABELS = {
    "v": "verb",
    "p": "participle/verb",
    "n": "noun",
    "a": "adjective",
    "r": "pronoun/determiner",
}
KIND_PRIORITY = {"v": 0, "p": 1, "n": 2, "a": 3, "r": 4}


def resolve_model() -> str:
    if MODEL:
        return MODEL
    models_url = ENDPOINT.rsplit("/chat/completions", 1)[0] + "/models"
    with urllib.request.urlopen(models_url, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data["data"][0]["id"])


def make_system_prompt(lang_desc: str) -> str:
    return (
        f"You are an expert bilingual lexicographer for {lang_desc} to English. "
        "The user provides a JSON object mapping exact dictionary lemmas to {\"pos\": ..., \"in\": \"...[[word]]...\"}. "
        "Return ONLY a valid JSON object mapping each exact input lemma key to its concise, standard English dictionary meaning "
        "(1 to 4 words max, no parenthetical notes, no grammar labels, no trailing period). "
        "CRITICAL RULES: "
        "1. Define ONLY the dictionary lemma key itself (highlighted in [[brackets]] in the short snippet). NEVER define a neighboring word from the snippet! "
        "2. For verbs and participles (pos='verb' or 'participle/verb'), ALWAYS start with 'to ' (e.g. Czech 'pravit' -> 'to say, speak', 'hynout' -> 'to perish', German 'ziehen' -> 'to draw, pull, go', Polish 'zwieść' -> 'to deceive'). "
        "3. For nouns, give the concise English noun (e.g. 'woman', 'fleece', 'garment, clothing'; for proper names, give the standard English biblical name e.g. 'Hospodin' -> 'the LORD', 'Mojžíš' -> 'Moses', 'Jericho'). "
        "4. For adjectives and pronouns, give the concise English equivalent (e.g. 'needy', 'righteous', 'who', 'my', 'you', 'this, that')."
    )


def call_batch(
    batch: Dict[str, dict],
    model_name: str,
    system_prompt: str,
) -> Dict[str, str]:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.0,
        "max_tokens": min(4096, max(1024, len(batch) * 45)),
        "reasoning_effort": "low",
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"].get("content")
    if not content:
        raise ValueError("Empty content")
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("Response is not a JSON object")

    out: Dict[str, str] = {}
    for k in batch:
        val = parsed.get(k)
        if isinstance(val, str):
            clean = " ".join(val.strip().rstrip(".").split())
            if clean and len(clean) <= 64:
                out[k] = clean
    return out


def call_batch_with_retry(
    batch: Dict[str, dict],
    model_name: str,
    system_prompt: str,
) -> Dict[str, str]:
    result: Dict[str, str] = {}
    remaining = dict(batch)
    for attempt in range(3):
        if not remaining:
            break
        try:
            result.update(call_batch(remaining, model_name, system_prompt))
            remaining = {k: v for k, v in remaining.items() if k not in result}
        except Exception:
            if len(remaining) > 1:
                items = list(remaining.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if not sub:
                        continue
                    try:
                        result.update(call_batch(sub, model_name, system_prompt))
                    except Exception:
                        pass
                remaining = {k: v for k, v in remaining.items() if k not in result}
            else:
                time.sleep(0.5)
    return result


def make_snippet(orig: str, start: int, end: int) -> str:
    """Extract a tight +/- 2-word window with the target surface form wrapped in [[...]]."""
    before = orig[:start].split()
    after = orig[end:].split()
    left = " ".join(before[-2:])
    right = " ".join(after[:2])
    mid = f"[[{orig[start:end]}]]"
    return " ".join(part for part in (left, mid, right) if part)


def collect_lemmas(corpus_dir: Path) -> Dict[str, Tuple[str, str]]:
    """Return {lemma: (primary_kind, tight_bracketed_snippet)} for all lemmas in corpus."""
    lemmas: Dict[str, Tuple[str, str]] = {}
    for chunk_path in sorted((corpus_dir / "chunks").glob("*.json")):
        entries = json.loads(chunk_path.read_text(encoding="utf-8"))
        for e in entries:
            orig = e["o"]
            for s, en, lem, k in e["m"]:
                prev = lemmas.get(lem)
                if prev is None or KIND_PRIORITY[k] < KIND_PRIORITY[prev[0]]:
                    lemmas[lem] = (k, make_snippet(orig, s, en))
    return lemmas


def build_for_lang(lang: str, model_name: str, workers: int, batch_size: int, force: bool = False) -> None:
    t0 = time.time()
    corpus_id, lang_desc = CORPORA[lang]
    corpus_dir = ROOT / "public" / "data" / corpus_id
    cache_path = ROOT / "raw_data" / f"glossary_{lang}.json"
    out_path = corpus_dir / "glossary.json"

    lemmas = collect_lemmas(corpus_dir)
    cache: Dict[str, str] = (
        {} if force else (json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {})
    )

    missing = {
        lem: {"pos": KIND_LABELS[k], "in": snippet}
        for lem, (k, snippet) in lemmas.items()
        if lem not in cache
    }
    print(
        f"[{lang}] {corpus_id}: {len(lemmas)} unique lemmas ({len(cache)} cached, {len(missing)} to gloss)...",
        flush=True,
    )

    if missing:
        sys_prompt = make_system_prompt(lang_desc)
        items = list(missing.items())
        batches = [dict(items[i : i + batch_size]) for i in range(0, len(items), batch_size)]
        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            futs = [pool.submit(call_batch_with_retry, b, model_name, sys_prompt) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                cache.update(fut.result())
                done += 1
                if done % 25 == 0 or done == len(batches):
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                    print(
                        f"  [{lang}] {done}/{len(batches)} batches ({len(cache)}/{len(lemmas)} glossed, {time.time() - t0:.1f}s)",
                        flush=True,
                    )

    # Emit compact glossary containing only active corpus lemmas
    final_glossary = {lem: cache[lem] for lem in sorted(lemmas) if lem in cache}
    out_path.write_text(
        json.dumps(final_glossary, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    missing_final = len(lemmas) - len(final_glossary)
    size_kb = out_path.stat().st_size / 1024
    print(
        f"[{lang}] Wrote {out_path.relative_to(ROOT)} ({len(final_glossary)}/{len(lemmas)} glossed, {missing_final} missing, {size_kb:.1f} KB) in {time.time() - t0:.1f}s",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build English lemma glossaries for VERBA corpora.")
    parser.add_argument("--lang", nargs="+", choices=["pl", "de", "cs"], default=["cs", "pl", "de"])
    parser.add_argument("--workers", type=int, default=32)
    parser.add_argument("--batch-size", type=int, default=40)
    parser.add_argument("--force", action="store_true", help="Ignore existing cache and regenerate all glosses.")
    args = parser.parse_args()

    model_name = resolve_model()
    for lang in args.lang:
        build_for_lang(lang, model_name, args.workers, args.batch_size, force=args.force)


if __name__ == "__main__":
    main()
