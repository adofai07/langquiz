"""
Translate a Bible quiz corpus (Polish UBG or German Schlachter 1951) directly
into faithful, modern English using a local OpenAI-compatible LLM endpoint
(default: http://localhost:8000).

Usage:
    python scripts/translate_corpus.py --corpus pl-bible-ubg
    python scripts/translate_corpus.py --corpus de-bible-sch1951
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

DEFAULT_ENDPOINT = os.environ.get("LLM_ENDPOINT", "http://localhost:8000/v1/chat/completions")
DEFAULT_MODEL = os.environ.get("LLM_MODEL", "")


def resolve_model(endpoint: str, explicit_model: str) -> str:
    if explicit_model:
        return explicit_model
    models_url = endpoint.rsplit("/chat/completions", 1)[0] + "/models"
    with urllib.request.urlopen(models_url, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    models = data.get("data") or []
    if not models:
        raise RuntimeError(f"No models returned by {models_url}; pass --model explicitly.")
    return str(models[0]["id"])

CORPUS_CONFIGS = {
    "pl-bible-ubg": {
        "dir": ROOT / "public" / "data" / "pl-bible-ubg",
        "cache": ROOT / "raw_data" / "en_llm_translations.json",
        "subtitle": "Uwspółcześniona Biblia Gdańska · Direct English",
        "source_badge": "UBG → EN",
        "prompt": (
            "You are a precise biblical translator translating Polish (Uwspółcześniona Biblia Gdańska) "
            "into clear, natural modern English for a verb-conjugation quiz. "
            "Preserve the exact meaning, tense, mood, and person of the Polish verbs. "
            "Input is a JSON object mapping verse IDs to Polish verses. "
            "Return ONLY a valid JSON object mapping the exact same verse IDs to their English translations. "
            "No explanations, no markdown, no extra keys."
        ),
    },
    "de-bible-sch1951": {
        "dir": ROOT / "public" / "data" / "de-bible-sch1951",
        "cache": ROOT / "raw_data" / "en_llm_translations_de.json",
        "subtitle": "Schlachter 1951 · Direct English",
        "source_badge": "SCH1951 → EN",
        "prompt": (
            "You are a precise biblical translator translating German (Schlachter 1951 Bible) "
            "into clear, natural modern English for a verb-conjugation quiz. "
            "Preserve the exact meaning, tense, mood, and person of the German verbs (for example, "
            "reflect past vs perfect tense, modal verbs, and exact verb meanings like 'sprach' -> 'spoke'/'said', "
            "'antwortete' -> 'answered', 'verführte' -> 'deceived', 'aß' -> 'ate'). "
            "Input is a JSON object mapping verse IDs to German verses. "
            "Return ONLY a valid JSON object mapping the exact same verse IDs to their English translations. "
            "No explanations, no markdown, no extra keys."
        ),
    },
    "cs-bible-bkr": {
        "dir": ROOT / "public" / "data" / "cs-bible-bkr",
        "cache": ROOT / "raw_data" / "en_llm_translations_cs.json",
        "subtitle": "Bible kralická · Direct English",
        "source_badge": "BKR → EN",
        "prompt": (
            "You are a precise biblical translator translating Czech (Bible kralická) "
            "into clear, natural modern English for a verb-conjugation quiz. "
            "Preserve the exact meaning, tense, mood, and person of the Czech verbs (for example, "
            "translate 'řekl' as 'said', 'učinila' as 'have done'/'did', 'podvedl' as 'deceived', 'jedla jsem' as 'I ate'). "
            "Input is a JSON object mapping verse IDs to Czech verses. "
            "Return ONLY a valid JSON object mapping the exact same verse IDs to their English translations. "
            "No explanations, no markdown, no extra keys."
        ),
    },
}


def translate_batch(
    endpoint: str,
    model: str,
    system_prompt: str,
    batch: Dict[str, str],
    timeout: int = 90,
) -> Dict[str, str]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.1,
        "max_tokens": min(8192, max(1024, len(batch) * 140)),
        "reasoning_effort": "low",
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("Model output was not a JSON object")

    cleaned: Dict[str, str] = {}
    for k, src_text in batch.items():
        val = parsed.get(k)
        if isinstance(val, str):
            text = val.strip()
            if text and len(text) >= max(3, int(len(src_text) * 0.25)) and len(text) <= max(120, int(len(src_text) * 3.5)):
                cleaned[k] = text
    return cleaned


def translate_batch_with_retry(
    endpoint: str,
    model: str,
    system_prompt: str,
    batch: Dict[str, str],
) -> Dict[str, str]:
    results: Dict[str, str] = {}
    remaining = dict(batch)

    for attempt in range(2):
        if not remaining:
            break
        try:
            got = translate_batch(endpoint, model, system_prompt, remaining)
            results.update(got)
            remaining = {k: v for k, v in remaining.items() if k not in results}
        except Exception:
            if attempt == 0 and len(remaining) > 1:
                items = list(remaining.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if not sub:
                        continue
                    try:
                        results.update(translate_batch(endpoint, model, system_prompt, sub))
                    except Exception:
                        pass
                remaining = {k: v for k, v in remaining.items() if k not in results}

    for k, src_text in list(remaining.items()):
        try:
            results.update(translate_batch(endpoint, model, system_prompt, {k: src_text}))
        except Exception:
            pass

    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", default="pl-bible-ubg", choices=list(CORPUS_CONFIGS.keys()))
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--batch-size", type=int, default=25)
    parser.add_argument("--workers", type=int, default=48)
    parser.add_argument("--books", nargs="*", help="Optional book IDs (e.g. gn jo)")
    args = parser.parse_args()
    model_name = resolve_model(args.endpoint, args.model)

    cfg = CORPUS_CONFIGS[args.corpus]
    corpus_dir: Path = cfg["dir"]
    cache_path: Path = cfg["cache"]
    system_prompt: str = cfg["prompt"]

    manifest_path = corpus_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    cache: Dict[str, str] = {}
    if cache_path.exists():
        cache = json.loads(cache_path.read_text(encoding="utf-8"))

    target_books = manifest["books"]
    if args.books:
        wanted = set(args.books)
        target_books = [b for b in target_books if b["id"] in wanted]

    book_data: Dict[str, Tuple[Path, List[dict]]] = {}
    todo: List[Tuple[str, str]] = []
    total_verses = 0

    for book in target_books:
        chunk_path = corpus_dir / book["chunkFile"]
        entries = json.loads(chunk_path.read_text(encoding="utf-8"))
        book_data[book["id"]] = (chunk_path, entries)
        for entry in entries:
            key = f"{book['id']}:{entry['c']}:{entry['v']}"
            total_verses += 1
            if key not in cache:
                todo.append((key, entry["o"]))

    print(
        f"[{args.corpus}] Books: {len(target_books)} | Total verses: {total_verses} | "
        f"Cached: {total_verses - len(todo)} | To translate: {len(todo)}",
        flush=True,
    )

    t0 = time.time()
    if todo:
        batches = [dict(todo[i : i + args.batch_size]) for i in range(0, len(todo), args.batch_size)]
        done_batches = 0
        translated_now = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            futs = [
                pool.submit(translate_batch_with_retry, args.endpoint, model_name, system_prompt, b)
                for b in batches
            ]
            for fut in concurrent.futures.as_completed(futs):
                got = fut.result()
                cache.update(got)
                translated_now += len(got)
                done_batches += 1
                if done_batches % 25 == 0 or done_batches == len(batches):
                    dt = time.time() - t0
                    rate = translated_now / dt if dt > 0 else 0
                    print(
                        f"  [{done_batches}/{len(batches)}] {translated_now}/{len(todo)} verses "
                        f"({rate:.1f} v/s, {dt:.1f}s)",
                        flush=True,
                    )
                if done_batches % 100 == 0:
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    applied = 0
    fallback = 0
    for book in target_books:
        chunk_path, entries = book_data[book["id"]]
        for entry in entries:
            key = f"{book['id']}:{entry['c']}:{entry['v']}"
            if key in cache:
                entry["t"] = cache[key]
                applied += 1
            else:
                fallback += 1
        chunk_path.write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    if len(cache) >= int(manifest["quizVerses"] * 0.99):
        manifest["subtitle"] = cfg["subtitle"]
        manifest["translationSource"] = cfg["source_badge"]
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    dt = time.time() - t0
    print(f"Finished in {dt:.1f}s | Applied: {applied} | Fallback: {fallback}", flush=True)

    if "gn" in book_data:
        gen313 = next((e for e in book_data["gn"][1] if e["c"] == 3 and e["v"] == 13), None)
        if gen313:
            print(f"\n--- {args.corpus} Genesis 3:13 ---")
            print("Original:   ", gen313["o"])
            print("Translation:", gen313["t"])
            print("Forms:      ", [sp[2] for sp in gen313["m"]])


if __name__ == "__main__":
    main()
