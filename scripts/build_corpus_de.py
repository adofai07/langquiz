"""
Build the German Bible (Schlachter 1951) verb-form quiz corpus.

Uses spaCy (`de_core_news_md`) STTS POS tagging (VVFIN, VAFIN, VMFIN, VVPP, VAPP,
VMPP, VVIMP, VAIMP) to identify conjugated verbs and verbal past participles, and
lemmatizes all unique verb surface forms via a local OpenAI-compatible LLM endpoint
(default http://localhost:8000) for gold-standard German infinitive
accuracy on both modern and 1951 Schlachter forms (e.g. aß -> essen, ward -> werden,
getan -> tun, sollest -> sollen, muß -> müssen).

Usage:
    python scripts/build_corpus_de.py
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

import spacy

ROOT = Path(__file__).resolve().parent.parent
DE_PATH = ROOT / "de_sch1951.json"
BSB_PATH = ROOT / "raw_data" / "en_bsb.json"
LEMMA_CACHE_PATH = ROOT / "raw_data" / "de_verb_lemmas.json"
OUT_DIR = ROOT / "public" / "data" / "de-bible-sch1951"
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

# Canonical German + English book names aligned 1-to-1 with de_sch1951.json (66 books)
BOOKS_META: List[Tuple[str, str, str]] = [
    ("gn", "1. Mose", "Genesis"),
    ("ex", "2. Mose", "Exodus"),
    ("lv", "3. Mose", "Leviticus"),
    ("nm", "4. Mose", "Numbers"),
    ("dt", "5. Mose", "Deuteronomy"),
    ("js", "Josua", "Joshua"),
    ("jz", "Richter", "Judges"),
    ("rt", "Ruth", "Ruth"),
    ("1sm", "1. Samuel", "1 Samuel"),
    ("2sm", "2. Samuel", "2 Samuel"),
    ("1rs", "1. Könige", "1 Kings"),
    ("2rs", "2. Könige", "2 Kings"),
    ("1cr", "1. Chronik", "1 Chronicles"),
    ("2cr", "2. Chronik", "2 Chronicles"),
    ("ed", "Esra", "Ezra"),
    ("ne", "Nehemia", "Nehemiah"),
    ("et", "Esther", "Esther"),
    ("job", "Hiob", "Job"),
    ("sl", "Psalmen", "Psalms"),
    ("pv", "Sprüche", "Proverbs"),
    ("ec", "Prediger", "Ecclesiastes"),
    ("ct", "Hohelied", "Song of Solomon"),
    ("is", "Jesaja", "Isaiah"),
    ("jr", "Jeremia", "Jeremiah"),
    ("lm", "Klagelieder", "Lamentations"),
    ("ez", "Hesekiel", "Ezekiel"),
    ("dn", "Daniel", "Daniel"),
    ("os", "Hosea", "Hosea"),
    ("jl", "Joel", "Joel"),
    ("am", "Amos", "Amos"),
    ("ob", "Obadja", "Obadiah"),
    ("jn", "Jona", "Jonah"),
    ("mq", "Micha", "Micah"),
    ("na", "Nahum", "Nahum"),
    ("hc", "Habakuk", "Habakuk"),
    ("sf", "Zephanja", "Zephaniah"),
    ("ag", "Haggai", "Haggai"),
    ("zc", "Sacharja", "Zechariah"),
    ("ml", "Maleachi", "Malachi"),
    ("mt", "Matthäus", "Matthew"),
    ("mc", "Markus", "Mark"),
    ("lc", "Lukas", "Luke"),
    ("jo", "Johannes", "John"),
    ("atos", "Apostelgeschichte", "Acts"),
    ("rm", "Römer", "Romans"),
    ("1co", "1. Korinther", "1 Corinthians"),
    ("2co", "2. Korinther", "2 Corinthians"),
    ("gl", "Galater", "Galatians"),
    ("ef", "Epheser", "Ephesians"),
    ("fp", "Philipper", "Philippians"),
    ("cl", "Kolosser", "Colossians"),
    ("1ts", "1. Thessalonicher", "1 Thessalonians"),
    ("2ts", "2. Thessalonicher", "2 Thessalonians"),
    ("1tm", "1. Timotheus", "1 Timothy"),
    ("2tm", "2. Timotheus", "2 Timothy"),
    ("tt", "Titus", "Titus"),
    ("fm", "Philemon", "Philemon"),
    ("hb", "Hebräer", "Hebrews"),
    ("tg", "Jakobus", "James"),
    ("1pe", "1. Petrus", "1 Peter"),
    ("2pe", "2. Petrus", "2 Peter"),
    ("1jo", "1. Johannes", "1 John"),
    ("2jo", "2. Johannes", "2 John"),
    ("3jo", "3. Johannes", "3 John"),
    ("jd", "Judas", "Jude"),
    ("ap", "Offenbarung", "Revelation"),
]

TARGET_STTS_TAGS = {"VVFIN", "VAFIN", "VMFIN", "VVPP", "VAPP", "VMPP", "VVIMP", "VAIMP"}
DE_WORD_RE = re.compile(r"^[A-Za-zÄÖÜäöüßẞ]+$")

# Deterministic high-frequency & archaic 1951 overrides (instant, 100% reliable)
KNOWN_LEMMAS: Dict[str, str] = {
    "ist": "sein", "bin": "sein", "bist": "sein", "sind": "sein", "seid": "sein",
    "war": "sein", "warst": "sein", "wart": "sein", "waren": "sein", "wäre": "sein",
    "wärest": "sein", "wären": "sein", "wäret": "sein", "sei": "sein", "seist": "sein",
    "seiest": "sein", "seien": "sein", "seiet": "sein", "gewesen": "sein",
    "hat": "haben", "habe": "haben", "hast": "haben", "habt": "haben", "habet": "haben",
    "hatte": "haben", "hattest": "haben", "hatten": "haben", "hattet": "haben",
    "hätte": "haben", "hättest": "haben", "hätten": "haben", "hättet": "haben", "gehabt": "haben",
    "wird": "werden", "werde": "werden", "wirst": "werden", "werdet": "werden",
    "wurde": "werden", "wurdest": "werden", "wurden": "werden", "wurdet": "werden",
    "ward": "werden", "wardst": "werden", "würde": "werden", "würdest": "werden",
    "würden": "werden", "würdet": "werden", "geworden": "werden", "worden": "werden",
    "sprach": "sprechen", "sprachst": "sprechen", "sprachen": "sprechen", "spricht": "sprechen",
    "sprichst": "sprechen", "sprich": "sprechen", "gesprochen": "sprechen",
    "tat": "tun", "tatest": "tun", "taten": "tun", "tatet": "tun", "tut": "tun",
    "tust": "tun", "tue": "tun", "tuest": "tun", "tuet": "tun", "täte": "tun", "getan": "tun",
    "aß": "essen", "aßest": "essen", "aßen": "essen", "aßt": "essen", "ißt": "essen",
    "isst": "essen", "iß": "essen", "gegessen": "essen",
    "muß": "müssen", "muss": "müssen", "mußt": "müssen", "musst": "müssen",
    "mußte": "müssen", "musste": "müssen", "mußten": "müssen", "müßte": "müssen", "müßt": "müssen",
    "soll": "sollen", "sollst": "sollen", "sollest": "sollen", "sollt": "sollen",
    "sollet": "sollen", "sollte": "sollen", "solltest": "sollen", "sollten": "sollen",
    "will": "wollen", "willst": "wollen", "wollt": "wollen", "wollet": "wollen",
    "wollte": "wollen", "wolltest": "wollen", "wollten": "wollen",
    "kann": "können", "kannst": "können", "könnt": "können", "könnet": "können",
    "konnte": "können", "konntest": "können", "konnten": "können", "könnte": "können",
    "darf": "dürfen", "darfst": "dürfen", "dürft": "dürfen", "durfte": "dürfen", "dürfte": "dürfen",
    "mag": "mögen", "magst": "mögen", "mögt": "mögen", "mochte": "mögen", "möchte": "mögen",
    "ließ": "lassen", "ließest": "lassen", "ließen": "lassen", "läßt": "lassen",
    "lässt": "lassen", "laß": "lassen", "lass": "lassen", "laßt": "lassen", "gelassen": "lassen",
    "gab": "geben", "gabst": "geben", "gaben": "geben", "gibt": "geben", "gibst": "geben",
    "gib": "geben", "gebe": "geben", "gäbe": "geben", "gegeben": "geben",
    "nahm": "nehmen", "nahmst": "nehmen", "nahmen": "nehmen", "nimmt": "nehmen",
    "nimmst": "nehmen", "nimm": "nehmen", "genommen": "nehmen",
    "kam": "kommen", "kamst": "kommen", "kamen": "kommen", "kommt": "kommen",
    "kommst": "kommen", "komm": "kommen", "kommet": "kommen", "gekommen": "kommen",
    "ging": "gehen", "gingst": "gehen", "gingen": "gehen", "geht": "gehen",
    "gehst": "gehen", "geh": "gehen", "gehe": "gehen", "gehet": "gehen", "gegangen": "gehen",
    "sah": "sehen", "sahst": "sehen", "sahen": "sehen", "sieht": "sehen",
    "siehst": "sehen", "siehe": "sehen", "sieh": "sehen", "gesehen": "sehen",
    "stand": "stehen", "standest": "stehen", "standen": "stehen", "steht": "stehen",
    "stehst": "stehen", "steh": "stehen", "stehe": "stehen", "gestanden": "stehen",
    "weiß": "wissen", "weißt": "wissen", "wußte": "wissen", "wusste": "wissen",
    "wußten": "wissen", "wüßte": "wissen", "gewußt": "wissen", "gewusst": "wissen",
    "schlief": "schlafen", "schliefen": "schlafen", "schläft": "schlafen", "geschlafen": "schlafen",
    "schuf": "schaffen", "schufen": "schaffen", "geschaffen": "schaffen",
    "gebot": "gebieten", "geboten": "gebieten", "gebietet": "gebieten",
}

LEMMA_SYSTEM_PROMPT = (
    "You are an expert German historical and modern linguist (Schlachter 1951 Bible). "
    "For each entry in the input JSON object mapping a German conjugated verb or past participle "
    "to an example sentence where it appears, return its standard lowercase German dictionary infinitive "
    "(e.g., 'sprach' -> 'sprechen', 'aß' -> 'essen', 'ward' -> 'werden', 'getan' -> 'tun', "
    "'wanderte' -> 'wandern', 'verschloß' -> 'verschließen', 'zugesellt' -> 'zugesellen', "
    "'machte' in 'machte sich ... auf' -> 'machen' [only the base verb without separated prefix]). "
    "If a word is NOT actually a German verb form (e.g., a noun, adjective, or adverb), return empty string \"\". "
    "Return ONLY a valid JSON object mapping the exact input keys to their lowercase German infinitive strings."
)


def is_valid_german_infinitive(lemma: str) -> bool:
    return (
        len(lemma) >= 3
        and lemma == lemma.lower()
        and bool(DE_WORD_RE.match(lemma))
        and (lemma.endswith("en") or lemma.endswith("ern") or lemma.endswith("eln") or lemma in ("tun", "sein"))
    )


def lemmatize_batch(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": LEMMA_SYSTEM_PROMPT},
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
            elif is_valid_german_infinitive(v):
                out[k] = v
    return out


def lemmatize_batch_with_retry(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    results: Dict[str, str] = {}
    remaining = dict(batch)
    for attempt in range(2):
        if not remaining:
            break
        try:
            got = lemmatize_batch(remaining, model_name)
            results.update(got)
            remaining = {k: v for k, v in remaining.items() if k not in results}
        except Exception:
            if attempt == 0 and len(remaining) > 1:
                items = list(remaining.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    try:
                        results.update(lemmatize_batch(sub, model_name))
                    except Exception:
                        pass
                remaining = {k: v for k, v in remaining.items() if k not in results}
    return results


def main() -> None:
    t0 = time.time()
    print("Loading German Schlachter 1951 dataset...", flush=True)
    de_books = json.loads(DE_PATH.read_text(encoding="utf-8-sig"))
    assert len(de_books) == 66, "Expected 66 books in de_sch1951.json"

    # Optional BSB seed fallback (will be replaced by direct DE->EN LLM translations)
    bsb_books = json.loads(BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if BSB_PATH.exists() else None

    print("Loading spaCy de_core_news_md (POS/STTS tagger)...", flush=True)
    nlp = spacy.load("de_core_news_md", disable=["ner", "parser", "lemmatizer"])

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        en_map = {}
        if bsb_books:
            en_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in bsb_books[bi]["chapters"]
            }
        for ci, verses in enumerate(de_books[bi]["chapters"], 1):
            for vi, de_text in enumerate(verses, 1):
                en_seed = en_map.get(ci, {}).get(vi, "")
                flat_items.append((bi, ci, vi, de_text.strip(), en_seed))

    print(f"POS-tagging {len(flat_items)} German verses...", flush=True)
    raw_spans: List[List[Tuple[int, int, str]]] = []
    unique_forms: Dict[str, str] = {}

    texts = (item[3] for item in flat_items)
    for (_, _, _, de_text, _), doc in zip(flat_items, nlp.pipe(texts, batch_size=512)):
        spans: List[Tuple[int, int, str]] = []
        for tok in doc:
            if tok.tag_ not in TARGET_STTS_TAGS:
                continue
            if tok.pos_ not in ("VERB", "AUX"):
                continue
            surf = tok.text
            if not DE_WORD_RE.match(surf):
                continue
            s_low = surf.lower()
            spans.append((tok.idx, tok.idx + len(surf), s_low))
            if s_low not in KNOWN_LEMMAS and s_low not in unique_forms:
                unique_forms[s_low] = de_text[:180]
        raw_spans.append(spans)

    print(
        f"POS-tagging done in {time.time() - t0:.1f}s | Unique verb forms to lemmatize: {len(unique_forms)}",
        flush=True,
    )

    lemma_map: Dict[str, str] = dict(KNOWN_LEMMAS)
    if LEMMA_CACHE_PATH.exists():
        lemma_map.update(json.loads(LEMMA_CACHE_PATH.read_text(encoding="utf-8")))

    todo = [(w, ctx) for w, ctx in unique_forms.items() if w not in lemma_map]
    print(f"Lemmatizing {len(todo)} uncached unique German verb forms...", flush=True)

    if todo:
        model_name = resolve_model()
        batches = [dict(todo[i : i + 35]) for i in range(0, len(todo), 35)]
        t_lem = time.time()
        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
            futs = [pool.submit(lemmatize_batch_with_retry, b, model_name) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                got = fut.result()
                lemma_map.update(got)
                done += 1
                if done % 25 == 0 or done == len(batches):
                    print(f"  [{done}/{len(batches)}] {len(lemma_map)} lemmas ({time.time() - t_lem:.1f}s)", flush=True)

        LEMMA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        LEMMA_CACHE_PATH.write_text(json.dumps(lemma_map, ensure_ascii=False, indent=2), encoding="utf-8")

    # Assemble book chunks
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    quiz_verses = 0
    total_verbs = 0

    for (bi, ci, vi, de_text, en_seed), spans in zip(flat_items, raw_spans):
        verbs = []
        for start, end, s_low in spans:
            lemma = lemma_map.get(s_low, "")
            if not lemma or not is_valid_german_infinitive(lemma):
                continue
            # Skip forms identical to their infinitive (e.g. 1st/3rd pl present 'trösten' == 'trösten')
            if s_low == lemma:
                continue
            verbs.append([start, end, lemma])
        if not verbs:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": de_text,
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
        "id": "de-bible-sch1951",
        "language": "de",
        "title": "Bible",
        "subtitle": "Schlachter 1951 · Direct English",
        "translationSource": "SCH1951 → EN",
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
        print("\n--- German Genesis 3:13 Verification ---")
        print("Original:", gen313["o"])
        print("Blanks:", [(gen313["o"][s:e], lem) for s, e, lem in gen313["m"]])


if __name__ == "__main__":
    main()
