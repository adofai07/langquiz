"""
Build the German Bible (Schlachter 1951) inflected word-form quiz corpus.

Extracts all 5 inflecting German word categories via spaCy (`de_core_news_md` STTS):
  - 'v': finite conjugated verbs (VVFIN, VAFIN, VMFIN, VVIMP, VAIMP)
  - 'p': verbal past participles (VVPP, VAPP, VMPP)
  - 'n': inflected nouns (NN where surface != lemma)
  - 'a': inflected attributive adjectives (ADJA where surface != lemma)
  - 'r': inflected pronouns & determiners/articles (ART, PPER, PPOSAT, PDS, PRELS, PIS, PWS where surface != lemma)

Lemmatizes unique verb/participle/archaic forms via local OpenAI-compatible LLM
(reusing cached lemmas + all 29,228 cached direct English translations in
`raw_data/en_llm_translations_de.json`).
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
EN_LLM_CACHE = ROOT / "raw_data" / "en_llm_translations_de.json"
BSB_PATH = ROOT / "raw_data" / "en_bsb.json"
LEMMA_CACHE_PATH = ROOT / "raw_data" / "de_verb_lemmas.json"
NOUN_LEMMA_CACHE_PATH = ROOT / "raw_data" / "de_noun_adj_lemmas.json"
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
    ("hc", "Habakuk", "Habakkuk"),
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

FINITE_VERB_TAGS = {"VVFIN", "VAFIN", "VMFIN", "VVIMP", "VAIMP"}
PARTICIPLE_TAGS = {"VVPP", "VAPP", "VMPP"}
PRONOUN_DET_TAGS = {"ART", "PPER", "PPOSAT", "PPOSS", "PDS", "PDAT", "PRELS", "PRELAT", "PIS", "PIAT", "PWS", "PWAT"}
DE_WORD_RE = re.compile(r"^[A-Za-zÄÖÜäöüßẞ]+$")

# Deterministic German pronoun/determiner base forms
PRONOUN_LEMMAS: Dict[str, str] = {
    "der": "der", "die": "der", "das": "der", "den": "der", "dem": "der", "des": "der",
    "deren": "der", "dessen": "der", "denen": "der",
    "ein": "ein", "eine": "ein", "einen": "ein", "einem": "ein", "einer": "ein", "eines": "ein",
    "kein": "kein", "keine": "kein", "keinen": "kein", "keinem": "kein", "keiner": "kein", "keines": "kein",
    "ich": "ich", "mich": "ich", "mir": "ich", "meiner": "ich",
    "du": "du", "dich": "du", "dir": "du", "deiner": "du",
    "er": "er", "ihn": "er", "ihm": "er", "seiner": "er",
    "sie": "sie", "ihr": "ihr", "ihnen": "sie",
    "es": "es",
    "wir": "wir", "uns": "wir", "unser": "unser",
    "euch": "ihr", "euer": "euer",
    "mein": "mein", "meine": "mein", "meinen": "mein", "meinem": "mein", "meines": "mein",
    "dein": "dein", "deine": "dein", "deinen": "dein", "deinem": "dein", "deines": "dein",
    "sein": "sein", "seine": "sein", "seinen": "sein", "seinem": "sein", "seines": "sein",
    "ihre": "ihr", "ihren": "ihr", "ihrem": "ihr", "ihres": "ihr", "ihrer": "ihr",
    "unsere": "unser", "unseren": "unser", "unserem": "unser", "unseres": "unser", "unserer": "unser",
    "unsre": "unser", "unsren": "unser", "unsrem": "unser", "unsres": "unser", "unsrer": "unser",
    "eure": "euer", "euren": "euer", "eurem": "euer", "eures": "euer", "eurer": "euer",
    "dieser": "dieser", "diese": "dieser", "dieses": "dieser", "diesen": "dieser", "diesem": "dieser",
    "jener": "jener", "jene": "jener", "jenes": "jener", "jenen": "jener", "jenem": "jener",
    "welcher": "welcher", "welche": "welcher", "welches": "welcher", "welchen": "welcher", "welchem": "welcher",
    "jeder": "jeder", "jede": "jeder", "jedes": "jeder", "jeden": "jeder", "jedem": "jeder",
    "alle": "all", "allen": "all", "aller": "all", "alles": "all", "allem": "all",
    "mancher": "mancher", "manche": "mancher", "manches": "mancher", "manchen": "mancher", "manchem": "mancher",
    "solcher": "solcher", "solche": "solcher", "solches": "solcher", "solchen": "solcher", "solchem": "solcher",
    "wen": "wer", "wem": "wer", "wessen": "wer",
}

ARCHAIC_NOUN_DATIVE_PROMPT = (
    "You are a German linguist normalizing Schlachter 1951 Bible nouns and attributive adjectives. "
    "For each entry in the input JSON object mapping an inflected German noun (capitalized) or attributive adjective "
    "to a short context, return its standard German dictionary base form (nominative singular capitalized for nouns, "
    "uninflected lowercase base for adjectives; e.g. 'Weibe' -> 'Weib', 'Tage' -> 'Tag', 'Heiligtums' -> 'Heiligtum', "
    "'Wassern' -> 'Wasser', 'silberne' -> 'silbern', 'finstern' -> 'finster'). "
    "If the word is already in its exact base form (e.g. 'Schlange' -> 'Schlange', 'Weib' -> 'Weib'), return that base form unchanged. "
    "Return ONLY a valid JSON object mapping the exact input keys to their dictionary base forms."
)


def is_valid_german_infinitive(lemma: str) -> bool:
    return (
        len(lemma) >= 3
        and lemma == lemma.lower()
        and bool(DE_WORD_RE.match(lemma))
        and (lemma.endswith("en") or lemma.endswith("ern") or lemma.endswith("eln") or lemma in ("tun", "sein"))
    )


def lemmatize_generic_batch(batch: Dict[str, str], model_name: str, system_prompt: str) -> Dict[str, str]:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
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
        raise ValueError("Empty content from model")
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        return {}
    out: Dict[str, str] = {}
    for k in batch:
        val = parsed.get(k)
        if isinstance(val, str):
            v = val.strip()
            if v and DE_WORD_RE.match(v):
                out[k] = v
    return out


def lemmatize_generic_batch_with_retry(
    batch: Dict[str, str], model_name: str, system_prompt: str
) -> Dict[str, str]:
    results: Dict[str, str] = {}
    remaining = dict(batch)
    for attempt in range(2):
        if not remaining:
            break
        try:
            results.update(lemmatize_generic_batch(remaining, model_name, system_prompt))
            remaining = {k: v for k, v in remaining.items() if k not in results}
        except Exception:
            if attempt == 0 and len(remaining) > 1:
                items = list(remaining.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if not sub:
                        continue
                    try:
                        results.update(lemmatize_generic_batch(sub, model_name, system_prompt))
                    except Exception:
                        pass
                remaining = {k: v for k, v in remaining.items() if k not in results}
    return results


def main() -> None:
    t0 = time.time()
    print("Loading German Schlachter 1951 dataset + cached translations...", flush=True)
    de_books = json.loads(DE_PATH.read_text(encoding="utf-8-sig"))
    en_llm = json.loads(EN_LLM_CACHE.read_text(encoding="utf-8")) if EN_LLM_CACHE.exists() else {}
    bsb_books = json.loads(BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if BSB_PATH.exists() else None
    verb_lemmas: Dict[str, str] = (
        json.loads(LEMMA_CACHE_PATH.read_text(encoding="utf-8")) if LEMMA_CACHE_PATH.exists() else {}
    )
    noun_adj_cache: Dict[str, str] = (
        json.loads(NOUN_LEMMA_CACHE_PATH.read_text(encoding="utf-8")) if NOUN_LEMMA_CACHE_PATH.exists() else {}
    )

    print("Loading spaCy de_core_news_md...", flush=True)
    nlp = spacy.load("de_core_news_md", disable=["ner", "parser"])

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        book_id = BOOKS_META[bi][0]
        bsb_map = {}
        if bsb_books:
            bsb_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in bsb_books[bi]["chapters"]
            }
        for ci, verses in enumerate(de_books[bi]["chapters"], 1):
            for vi, de_text in enumerate(verses, 1):
                key = f"{book_id}:{ci}:{vi}"
                en_text = en_llm.get(key) or bsb_map.get(ci, {}).get(vi, "")
                flat_items.append((bi, ci, vi, de_text.strip(), en_text))

    print(f"Tagging {len(flat_items)} German verses (v, p, n, a, r)...", flush=True)
    raw_tokens_per_verse: List[List[Tuple[int, int, str, str, str]]] = []
    archaic_nouns_to_check: Dict[str, str] = {}

    texts = (item[3] for item in flat_items)
    for (_, _, _, de_text, _), doc in zip(flat_items, nlp.pipe(texts, batch_size=512)):
        toks: List[Tuple[int, int, str, str, str]] = []
        for tok in doc:
            surf = tok.text
            if not DE_WORD_RE.match(surf):
                continue
            start = tok.idx
            end = start + len(surf)
            tag = tok.tag_
            s_low = surf.lower()

            if tag in FINITE_VERB_TAGS and tok.pos_ in ("VERB", "AUX"):
                toks.append((start, end, surf, "v", verb_lemmas.get(s_low, "")))
            elif tag in PARTICIPLE_TAGS and tok.pos_ in ("VERB", "AUX"):
                toks.append((start, end, surf, "p", verb_lemmas.get(s_low, "")))
            elif tag in PRONOUN_DET_TAGS and tok.pos_ in ("PRON", "DET"):
                lem = PRONOUN_LEMMAS.get(s_low)
                if lem and lem != s_low:
                    toks.append((start, end, surf, "r", lem))
            elif tag == "ADJA" and tok.pos_ == "ADJ":
                lem = tok.lemma_.lower()
                if DE_WORD_RE.match(lem) and lem != s_low:
                    toks.append((start, end, surf, "a", lem))
            elif tag == "NN" and tok.pos_ == "NOUN":
                sp_lem = tok.lemma_
                if not DE_WORD_RE.match(sp_lem):
                    continue
                # Archaic 1951 dative -e nouns (like Weibe, Tage, Hause, Lande) often aren't lemmatized by modern spaCy
                if sp_lem.lower() == s_low and "Case=Dat" in str(tok.morph) and s_low.endswith("e") and len(s_low) >= 4:
                    if surf not in noun_adj_cache and surf not in archaic_nouns_to_check:
                        archaic_nouns_to_check[surf] = de_text[:140]
                    toks.append((start, end, surf, "n", ""))
                elif sp_lem.lower() != s_low:
                    toks.append((start, end, surf, "n", sp_lem))
        raw_tokens_per_verse.append(toks)

    print(
        f"Tagging done in {time.time() - t0:.1f}s | Archaic dative nouns to check: {len(archaic_nouns_to_check)}",
        flush=True,
    )

    if archaic_nouns_to_check:
        model_name = resolve_model()
        items = list(archaic_nouns_to_check.items())
        batches = [dict(items[i : i + 35]) for i in range(0, len(items), 35)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            futs = [
                pool.submit(lemmatize_generic_batch_with_retry, b, model_name, ARCHAIC_NOUN_DATIVE_PROMPT)
                for b in batches
            ]
            for fut in concurrent.futures.as_completed(futs):
                noun_adj_cache.update(fut.result())
        NOUN_LEMMA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        NOUN_LEMMA_CACHE_PATH.write_text(json.dumps(noun_adj_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    counts = {"v": 0, "p": 0, "n": 0, "a": 0, "r": 0}
    quiz_verses = 0

    for (bi, ci, vi, de_text, en_text), toks in zip(flat_items, raw_tokens_per_verse):
        forms = []
        for start, end, surf, kind, lem in toks:
            s_low = surf.lower()
            if kind in ("v", "p"):
                if not lem or not is_valid_german_infinitive(lem) or lem == s_low:
                    continue
                forms.append([start, end, lem, kind])
            elif kind == "n":
                resolved = lem or noun_adj_cache.get(surf, "")
                if not resolved or resolved.lower() == s_low or not DE_WORD_RE.match(resolved):
                    continue
                forms.append([start, end, resolved, "n"])
            else:
                if not lem or lem.lower() == s_low:
                    continue
                forms.append([start, end, lem, kind])
        if not forms:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": de_text,
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
        "id": "de-bible-sch1951",
        "language": "de",
        "title": "Bible",
        "subtitle": "Schlachter 1951 · Direct English",
        "translationSource": "SCH1951 → EN",
        "totalVerses": len(flat_items),
        "quizVerses": quiz_verses,
        "totalVerbs": counts["v"],
        "formCounts": counts,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Done in {time.time() - t0:.1f}s! Verses: {quiz_verses} | Counts: {counts}", flush=True)
    for label, bi, c, v in [("Gen 3:13", 0, 3, 13), ("Num 7:43", 3, 7, 43)]:
        e = next((x for x in book_entries[bi] if x["c"] == c and x["v"] == v), None)
        if e:
            print(f"\n--- DE {label} ---")
            print([(e["o"][s:en], lem, k) for s, en, lem, k in e["m"]])


if __name__ == "__main__":
    main()
