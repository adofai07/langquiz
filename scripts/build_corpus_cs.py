"""
Build the Czech Bible (Bible kralická / BKR) inflected word-form quiz corpus.

Extracts all 5 inflecting Czech word categories via Charles University's UDPipe
Czech PDT tagger/lemmatizer (`spacy-udpipe`):
  - 'v': finite verbs & Czech past l-participles (VB, Vp, Vi, Vc)
  - 'p': passive & adverbial verbal participles (Vs, Ve, Vm)
  - 'n': inflected nouns (NOUN/PROPN where surface != lemma)
  - 'a': inflected adjectives (ADJ where surface != lemma)
  - 'r': inflected pronouns & determiners (PRON/DET where surface != lemma)

Reuses cached archaic verb rescue lemmas (`raw_data/cs_verb_lemmas_rescue.json`)
and cached direct English translations (`raw_data/en_llm_translations_cs.json`).
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
EN_LLM_CACHE = ROOT / "raw_data" / "en_llm_translations_cs.json"
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
VERB_PDT_PREFIXES = ("VB", "Vp", "Vi", "Vc")
PART_PDT_PREFIXES = ("Vs", "Ve", "Vm")

RESCUE_PROMPT = (
    "You are an expert Czech historical and modern linguist (Bible kralická). "
    "For each entry in the input JSON object mapping a Czech conjugated verb form to an example verse, "
    "return its standard lowercase Czech dictionary infinitive (ending in -t, -ti, -ci, or -ct, e.g., "
    "'posvěť' -> 'posvětit', 'řekl' -> 'říci', 'buď' -> 'být', 'jděte' -> 'jít', 'nebojte' -> 'bát'). "
    "If the word is an infinitive itself (e.g. 'míti', 'učiniti') or NOT a conjugated Czech verb form, return empty string \"\". "
    "Return ONLY a valid JSON object mapping the exact input keys to lowercase Czech infinitives."
)


def clean_pdt_lemma(raw: str, keep_case: bool = False) -> str:
    base = re.split(r"[-_`^]", raw, maxsplit=1)[0].strip()
    return base if keep_case else base.lower()


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
        "max_tokens": min(4096, max(1024, len(batch) * 90)),
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
        return {}
    parsed = json.loads(content)
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


_WORKER_NLP = None


def _init_cs_worker() -> None:
    global _WORKER_NLP
    _WORKER_NLP = spacy_udpipe.load("cs")


def _tag_cs_chunk(
    items: List[Tuple[int, int, int, str, str]],
) -> Tuple[List[List[Tuple[int, int, str, str, str]]], Dict[str, str]]:
    nlp = _WORKER_NLP
    out_spans: List[List[Tuple[int, int, str, str, str]]] = []
    local_rescue: Dict[str, str] = {}

    for _, _, _, cs_text, _ in items:
        doc = nlp(cs_text)
        spans: List[Tuple[int, int, str, str, str]] = []
        tlen = len(cs_text)
        cursor = 0
        for tok in doc:
            tok_text = tok.text
            pos_idx = cs_text.find(tok_text, cursor)
            if pos_idx == -1:
                continue
            start = pos_idx
            end = pos_idx + len(tok_text)
            cursor = end

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

            if tok.pos_ in ("VERB", "AUX"):
                if tag.startswith("Vf") and not is_foreign:
                    continue
                if tag.startswith(PART_PDT_PREFIXES):
                    lem = clean_pdt_lemma(tok.lemma_)
                    if not is_foreign and is_valid_cs_infinitive(lem) and lem != s_low:
                        spans.append((start, end, s_low, "p", lem))
                    continue
                if not tag.startswith(VERB_PDT_PREFIXES) and not is_foreign:
                    continue
                lem = clean_pdt_lemma(tok.lemma_)
                if not is_foreign and is_valid_cs_infinitive(lem) and lem != s_low:
                    spans.append((start, end, s_low, "v", lem))
                else:
                    spans.append((start, end, s_low, "v", ""))
                    if s_low not in local_rescue:
                        local_rescue[s_low] = cs_text[:180]
            elif tok.pos_ in ("PRON", "DET"):
                lem = clean_pdt_lemma(tok.lemma_)
                if len(lem) >= 2 and CS_WORD_RE.match(lem) and lem != s_low:
                    spans.append((start, end, s_low, "r", lem))
            elif tok.pos_ in ("NOUN", "PROPN"):
                lem_case = clean_pdt_lemma(tok.lemma_, keep_case=(tok.pos_ == "PROPN"))
                if len(lem_case) >= 2 and CS_WORD_RE.match(lem_case) and lem_case.lower() != s_low:
                    spans.append((start, end, s_low, "n", lem_case))
            elif tok.pos_ == "ADJ":
                lem = clean_pdt_lemma(tok.lemma_)
                if len(lem) >= 2 and CS_WORD_RE.match(lem) and lem != s_low:
                    kind = "p" if ("VerbForm=Part" in str(tok.morph) and is_valid_cs_infinitive(lem)) else "a"
                    spans.append((start, end, s_low, kind, lem))

        out_spans.append(spans)
    return out_spans, local_rescue


def main() -> None:
    t0 = time.time()
    print("Loading Czech Bible kralická dataset + cached translations...", flush=True)
    cs_books = json.loads(CS_PATH.read_text(encoding="utf-8-sig"))
    en_llm = json.loads(EN_LLM_CACHE.read_text(encoding="utf-8")) if EN_LLM_CACHE.exists() else {}
    bsb_books = json.loads(BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if BSB_PATH.exists() else None
    rescue_map: Dict[str, str] = (
        json.loads(RESCUE_CACHE_PATH.read_text(encoding="utf-8")) if RESCUE_CACHE_PATH.exists() else {}
    )

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        book_id = BOOKS_META[bi][0]
        bsb_map = {}
        if bsb_books:
            bsb_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in bsb_books[bi]["chapters"]
            }
        for ci, verses in enumerate(cs_books[bi]["chapters"], 1):
            for vi, cs_text in enumerate(verses, 1):
                key = f"{book_id}:{ci}:{vi}"
                en_text = en_llm.get(key) or bsb_map.get(ci, {}).get(vi, "")
                flat_items.append((bi, ci, vi, cs_text.strip(), en_text))

    workers = min(8, os.cpu_count() or 4)
    print(f"Tagging {len(flat_items)} Czech verses (v, p, n, a, r) across {workers} workers...", flush=True)
    chunk_size = 1000
    slices = [flat_items[i : i + chunk_size] for i in range(0, len(flat_items), chunk_size)]

    raw_spans: List[List[Tuple[int, int, str, str, str]]] = []
    needs_rescue: Dict[str, str] = {}

    with concurrent.futures.ProcessPoolExecutor(max_workers=workers, initializer=_init_cs_worker) as pool:
        for spans_part, rescue_part in pool.map(_tag_cs_chunk, slices):
            raw_spans.extend(spans_part)
            for k, ctx in rescue_part.items():
                if k not in rescue_map and k not in needs_rescue:
                    needs_rescue[k] = ctx
            print(f"  Tagged {len(raw_spans)}/{len(flat_items)} verses ({time.time() - t0:.1f}s)", flush=True)

    if needs_rescue:
        model_name = resolve_model()
        items = list(needs_rescue.items())
        batches = [dict(items[i : i + 35]) for i in range(0, len(items), 35)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            futs = [pool.submit(rescue_batch, b, model_name) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                rescue_map.update(fut.result())
        RESCUE_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        RESCUE_CACHE_PATH.write_text(json.dumps(rescue_map, ensure_ascii=False, indent=2), encoding="utf-8")

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    counts = {"v": 0, "p": 0, "n": 0, "a": 0, "r": 0}
    quiz_verses = 0

    for (bi, ci, vi, cs_text, en_text), spans in zip(flat_items, raw_spans):
        forms = []
        for start, end, s_low, kind, lem in spans:
            resolved = lem or (rescue_map.get(s_low, "") if kind == "v" else "")
            if not resolved or resolved.lower() == s_low:
                continue
            if kind in ("v", "p") and not is_valid_cs_infinitive(resolved):
                continue
            forms.append([start, end, resolved, kind])
        if not forms:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": cs_text,
            "t": en_text,
            "m": forms,
        })
        quiz_verses += 1
        for _, _, _, k in forms:
            counts[k] += 1

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
        "totalVerbs": counts["v"],
        "formCounts": counts,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Done in {time.time() - t0:.1f}s! Verses: {quiz_verses} | Counts: {counts}", flush=True)


if __name__ == "__main__":
    main()
