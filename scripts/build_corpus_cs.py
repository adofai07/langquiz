"""
Build the Czech Bible (Bible kralická / BKR) verb-form quiz corpus.

Uses Charles University's UDPipe Czech PDT tagger/lemmatizer (`spacy-udpipe`,
`czech-pdt-ud-2.5-191206.udpipe`) for contextual Czech POS/morphological tagging
and lemmatization, rescuing any archaic 1613 Bible kralická forms not recognized
by modern PDT via a local OpenAI-compatible LLM endpoint (default localhost:8000).

Usage:
    python scripts/build_corpus_cs.py
"""

from __future__ import annotations

import concurrent.futures
import json
import os
import re
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Tuple

import spacy_udpipe

ROOT = Path(__file__).resolve().parent.parent
CS_PATH = ROOT / "cs_bkr.json"
BSB_PATH = ROOT / "raw_data" / "en_bsb.json"
RESCUE_CACHE_PATH = ROOT / "raw_data" / "cs_verb_lemmas_rescue.json"
OUT_DIR = ROOT / "public" / "data" / "cs-bible-bkr"
CHUNKS_DIR = OUT_DIR / "chunks"

ENDPOINT = os.environ.get("LLM_ENDPOINT", "http://localhost:8000/v1/chat/completions")
MODEL = os.environ.get("LLM_MODEL", "")


def resolve_model() -> str:
    if MODEL:
        return MODEL
    models_url = ENDPOINT.rsplit("/chat/completions", 1)[0] + "/models"
    with urllib.request.urlopen(models_url, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data["data"][0]["id"])

BOOKS_META: List[Tuple[str, str, str]] = [
    ("gn", "1. Mojžíšova", "Genesis"),
    ("ex", "2. Mojžíšova", "Exodus"),
    ("lv", "3. Mojžíšova", "Leviticus"),
    ("nm", "4. Mojžíšova", "Numbers"),
    ("dt", "5. Mojžíšova", "Deuteronomy"),
    ("js", "Jozue", "Joshua"),
    ("jz", "Soudců", "Judges"),
    ("rt", "Rút", "Ruth"),
    ("1sm", "1. Samuelova", "1 Samuel"),
    ("2sm", "2. Samuelova", "2 Samuel"),
    ("1rs", "1. Královská", "1 Kings"),
    ("2rs", "2. Královská", "2 Kings"),
    ("1cr", "1. Letopisů", "1 Chronicles"),
    ("2cr", "2. Letopisů", "2 Chronicles"),
    ("ed", "Ezdráš", "Ezra"),
    ("ne", "Nehemjáš", "Nehemiah"),
    ("et", "Ester", "Esther"),
    ("job", "Jób", "Job"),
    ("sl", "Žalmy", "Psalms"),
    ("pv", "Přísloví", "Proverbs"),
    ("ec", "Kazatel", "Ecclesiastes"),
    ("ct", "Píseň písní", "Song of Solomon"),
    ("is", "Izajáš", "Isaiah"),
    ("jr", "Jeremjáš", "Jeremiah"),
    ("lm", "Pláč", "Lamentations"),
    ("ez", "Ezechiel", "Ezekiel"),
    ("dn", "Daniel", "Daniel"),
    ("os", "Ozeáš", "Hosea"),
    ("jl", "Jóel", "Joel"),
    ("am", "Ámos", "Amos"),
    ("ob", "Abdijáš", "Obadiah"),
    ("jn", "Jonáš", "Jonah"),
    ("mq", "Micheáš", "Micah"),
    ("na", "Nahum", "Nahum"),
    ("hc", "Abakuk", "Habakkuk"),
    ("sf", "Sofonjáš", "Zephaniah"),
    ("ag", "Ageus", "Haggai"),
    ("zc", "Zacharjáš", "Zechariah"),
    ("ml", "Malachiáš", "Malachi"),
    ("mt", "Matouš", "Matthew"),
    ("mc", "Marek", "Mark"),
    ("lc", "Lukáš", "Luke"),
    ("jo", "Jan", "John"),
    ("atos", "Skutky apoštolské", "Acts"),
    ("rm", "Římanům", "Romans"),
    ("1co", "1. Korintským", "1 Corinthians"),
    ("2co", "2. Korintským", "2 Corinthians"),
    ("gl", "Galatským", "Galatians"),
    ("ef", "Efezským", "Ephesians"),
    ("fp", "Filipským", "Philippians"),
    ("cl", "Koloským", "Colossians"),
    ("1ts", "1. Tesalonickým", "1 Thessalonians"),
    ("2ts", "2. Tesalonickým", "2 Thessalonians"),
    ("1tm", "1. Timoteovi", "1 Timothy"),
    ("2tm", "2. Timoteovi", "2 Timothy"),
    ("tt", "Titovi", "Titus"),
    ("fm", "Filemonovi", "Philemon"),
    ("hb", "Židům", "Hebrews"),
    ("tg", "Jakubův", "James"),
    ("1pe", "1. Petrův", "1 Peter"),
    ("2pe", "2. Petrův", "2 Peter"),
    ("1jo", "1. Janův", "1 John"),
    ("2jo", "2. Janův", "2 John"),
    ("3jo", "3. Janův", "3 John"),
    ("jd", "Judův", "Jude"),
    ("ap", "Zjevení Janovo", "Revelation"),
]

CS_WORD_RE = re.compile(r"^[A-Za-zÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž]+$")
# PDT verb sub-POS prefixes we want: VB (present/future), Vp (past l-participle), Vi (imperative), Vc (conditional), Vs (passive part.)
VALID_PDT_PREFIXES = ("VB", "Vp", "Vi", "Vc", "Vs")

RESCUE_PROMPT = (
    "You are an expert Czech historical and modern linguist (Bible kralická). "
    "For each entry in the input JSON object mapping a Czech conjugated verb form to an example verse, "
    "return its standard lowercase Czech dictionary infinitive (ending in -t, -ti, -ci, or -ct, e.g., "
    "'posvěť' -> 'posvětit', 'řekl' -> 'říci', 'buď' -> 'být', 'jděte' -> 'jít', 'nebojte' -> 'bát'). "
    "If the word is an infinitive itself (e.g. 'míti', 'učiniti') or NOT a conjugated Czech verb form, return empty string \"\". "
    "Return ONLY a valid JSON object mapping the exact input keys to lowercase Czech infinitives."
)


def clean_pdt_lemma(raw: str) -> str:
    """Strip Czech PDT lemma suffixes like 'být-1' or 'říci_:W'."""
    base = re.split(r"[-_`^]", raw, maxsplit=1)[0].strip().lower()
    return base


def is_valid_cs_infinitive(lemma: str) -> bool:
    return (
        len(lemma) >= 3
        and lemma == lemma.lower()
        and bool(CS_WORD_RE.match(lemma))
        and (lemma.endswith("t") or lemma.endswith("ti") or lemma.endswith("ci") or lemma.endswith("ct"))
    )


def rescue_batch(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": RESCUE_PROMPT},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.0,
        "max_tokens": min(4096, max(512, len(batch) * 45)),
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
    parsed = json.loads(body["choices"][0]["message"]["content"])
    if not isinstance(parsed, dict):
        return {}
    out: Dict[str, str] = {}
    for k in batch:
        val = parsed.get(k)
        if isinstance(val, str):
            v = val.strip().lower()
            if v == "":
                out[k] = ""
            elif is_valid_cs_infinitive(v):
                out[k] = v
    return out


def rescue_batch_with_retry(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    results: Dict[str, str] = {}
    remaining = dict(batch)
    for attempt in range(2):
        if not remaining:
            break
        try:
            results.update(rescue_batch(remaining, model_name))
            remaining = {k: v for k, v in remaining.items() if k not in results}
        except Exception:
            if attempt == 0 and len(remaining) > 1:
                items = list(remaining.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    try:
                        results.update(rescue_batch(sub, model_name))
                    except Exception:
                        pass
                remaining = {k: v for k, v in remaining.items() if k not in results}
    return results


def main() -> None:
    t0 = time.time()
    print("Loading Czech Bible kralická dataset...", flush=True)
    cs_books = json.loads(CS_PATH.read_text(encoding="utf-8-sig"))
    assert len(cs_books) == 66, "Expected 66 books in cs_bkr.json"

    bsb_books = json.loads(BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if BSB_PATH.exists() else None

    print("Loading Charles University Czech UDPipe PDT model...", flush=True)
    nlp = spacy_udpipe.load("cs")

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        en_map = {}
        if bsb_books:
            en_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in bsb_books[bi]["chapters"]
            }
        for ci, verses in enumerate(cs_books[bi]["chapters"], 1):
            for vi, cs_text in enumerate(verses, 1):
                en_seed = en_map.get(ci, {}).get(vi, "")
                flat_items.append((bi, ci, vi, cs_text.strip(), en_seed))

    print(f"Tagging {len(flat_items)} Czech verses with UDPipe PDT...", flush=True)
    # Each raw span: (start, end, surface_lower, pdt_lemma_or_empty)
    raw_spans: List[List[Tuple[int, int, str, str]]] = []
    needs_rescue: Dict[str, str] = {}

    for idx_v, (_, _, _, cs_text, _) in enumerate(flat_items):
        doc = nlp(cs_text)
        spans: List[Tuple[int, int, str, str]] = []
        tlen = len(cs_text)
        cursor = 0
        for tok in doc:
            tok_text = tok.text
            pos = cs_text.find(tok_text, cursor)
            if pos == -1:
                continue
            start = pos
            end = pos + len(tok_text)
            cursor = end

            if tok.pos_ not in ("VERB", "AUX"):
                continue
            # Guard against UDPipe multi-word splits like 'aby' -> 'a' + 'by'
            if start > 0 and cs_text[start - 1].isalpha():
                continue
            if end < tlen and cs_text[end].isalpha():
                continue
            surf = cs_text[start:end]
            if not CS_WORD_RE.match(surf):
                continue

            s_low = surf.lower()
            tag = tok.tag_ or ""
            is_foreign = "Foreign=Yes" in str(tok.morph)

            # Skip genuine bare infinitives (Vf) unless flagged Foreign=Yes (e.g. archaic imperative 'posvěť')
            if tag.startswith("Vf") and not is_foreign:
                continue
            if not tag.startswith(VALID_PDT_PREFIXES) and not is_foreign:
                continue

            lemma = clean_pdt_lemma(tok.lemma_)
            if not is_foreign and is_valid_cs_infinitive(lemma) and lemma != s_low:
                spans.append((start, end, s_low, lemma))
            else:
                spans.append((start, end, s_low, ""))
                if s_low not in needs_rescue:
                    needs_rescue[s_low] = cs_text[:180]
        raw_spans.append(spans)
        if (idx_v + 1) % 5000 == 0:
            print(f"  Tagged {idx_v + 1}/{len(flat_items)} verses ({time.time() - t0:.1f}s)", flush=True)

    print(
        f"UDPipe tagging done in {time.time() - t0:.1f}s | Archaic/unknown forms to rescue: {len(needs_rescue)}",
        flush=True,
    )

    rescue_map: Dict[str, str] = {}
    if RESCUE_CACHE_PATH.exists():
        rescue_map.update(json.loads(RESCUE_CACHE_PATH.read_text(encoding="utf-8")))

    todo = [(w, ctx) for w, ctx in needs_rescue.items() if w not in rescue_map]
    if todo:
        model_name = resolve_model()
        print(f"Rescuing {len(todo)} Czech archaic verb lemmas...", flush=True)
        batches = [dict(todo[i : i + 35]) for i in range(0, len(todo), 35)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
            futs = [pool.submit(rescue_batch_with_retry, b, model_name) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                rescue_map.update(fut.result())
        RESCUE_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        RESCUE_CACHE_PATH.write_text(json.dumps(rescue_map, ensure_ascii=False, indent=2), encoding="utf-8")

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    quiz_verses = 0
    total_verbs = 0

    for (bi, ci, vi, cs_text, en_seed), spans in zip(flat_items, raw_spans):
        verbs = []
        for start, end, s_low, pdt_lemma in spans:
            lemma = pdt_lemma or rescue_map.get(s_low, "")
            if not lemma or not is_valid_cs_infinitive(lemma) or lemma == s_low:
                continue
            verbs.append([start, end, lemma])
        if not verbs:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": cs_text,
            "t": en_seed,
            "m": verbs,
        })
        quiz_verses += 1
        total_verbs += len(verbs)

    manifest_books = []
    for bi, (book_id, native_name, en_name) in enumerate(BOOKS_META):
        entries = book_entries[bi]
        chunk_rel = f"chunks/{bi + 1:02d}-{book_id}.json"
        (OUT_DIR / chunk_rel).write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        manifest_books.append({
            "index": bi,
            "id": book_id,
            "nativeName": native_name,
            "enName": en_name,
            "chunkFile": chunk_rel,
            "verseCount": len(entries),
        })

    manifest = {
        "id": "cs-bible-bkr",
        "language": "cs",
        "title": "Bible",
        "subtitle": "Bible kralická · Direct English",
        "translationSource": "BKR → EN",
        "totalVerses": len(flat_items),
        "quizVerses": quiz_verses,
        "totalVerbs": total_verbs,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Done in {time.time() - t0:.1f}s! Quiz verses: {quiz_verses}/{len(flat_items)}, total verb blanks: {total_verbs}",
        flush=True,
    )

    gen313 = next((e for e in book_entries[0] if e["c"] == 3 and e["v"] == 13), None)
    if gen313:
        print("\n--- Czech Genesis 3:13 Verification ---")
        print("Original:", gen313["o"])
        print("Blanks:", [(gen313["o"][s:e], lem) for s, e, lem in gen313["m"]])


if __name__ == "__main__":
    main()
