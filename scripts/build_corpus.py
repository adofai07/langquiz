"""
Build the Polish Bible (UBG) inflected word-form quiz corpus.

Extracts all 5 inflecting Polish word categories verified via spaCy (`pl_core_news_md`)
+ Morfeusz2 (SGJP dictionary):
  - 'v': finite conjugated verbs
  - 'p': verbal participles (ppas, pact, pcon, pant)
  - 'n': inflected nouns (surface != lemma)
  - 'a': inflected adjectives (surface != lemma)
  - 'r': inflected pronouns & determiners (surface != lemma)

Reuses existing direct English translations cached in `raw_data/en_llm_translations.json`
(falling back to `raw_data/en_bsb.json` if a verse is uncached).

Usage:
    python scripts/build_corpus.py
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import morfeusz2
import spacy

from fix_lemmas import disambiguate

ROOT = Path(__file__).resolve().parent.parent
PL_PATH = ROOT / "pl_ubg.json"
EN_LLM_CACHE = ROOT / "raw_data" / "en_llm_translations.json"
EN_BSB_PATH = ROOT / "raw_data" / "en_bsb.json"
OUT_DIR = ROOT / "public" / "data" / "pl-bible-ubg"
CHUNKS_DIR = OUT_DIR / "chunks"

BOOKS_META: List[Tuple[str, str, str]] = [
    ("gn", "Księga Rodzaju", "Genesis"),
    ("ex", "Księga Wyjścia", "Exodus"),
    ("lv", "Księga Kapłańska", "Leviticus"),
    ("nm", "Księga Liczb", "Numbers"),
    ("dt", "Księga Powtórzonego Prawa", "Deuteronomy"),
    ("js", "Księga Jozuego", "Joshua"),
    ("jz", "Księga Sędziów", "Judges"),
    ("rt", "Księga Rut", "Ruth"),
    ("1sm", "1 Księga Samuela", "1 Samuel"),
    ("2sm", "2 Księga Samuela", "2 Samuel"),
    ("1rs", "1 Księga Królewska", "1 Kings"),
    ("2rs", "2 Księga Królewska", "2 Kings"),
    ("1cr", "1 Księga Kronik", "1 Chronicles"),
    ("2cr", "2 Księga Kronik", "2 Chronicles"),
    ("ed", "Księga Ezdrasza", "Ezra"),
    ("ne", "Księga Nehemiasza", "Nehemiah"),
    ("et", "Księga Estery", "Esther"),
    ("job", "Księga Hioba", "Job"),
    ("sl", "Księga Psalmów", "Psalms"),
    ("pv", "Księga Przysłów", "Proverbs"),
    ("ec", "Księga Kaznodziei", "Ecclesiastes"),
    ("ct", "Pieśń nad Pieśniami", "Song of Solomon"),
    ("is", "Księga Izajasza", "Isaiah"),
    ("jr", "Księga Jeremiasza", "Jeremiah"),
    ("lm", "Lamentacje", "Lamentations"),
    ("ez", "Księga Ezechiela", "Ezekiel"),
    ("dn", "Księga Daniela", "Daniel"),
    ("os", "Księga Ozeasza", "Hosea"),
    ("jl", "Księga Joela", "Joel"),
    ("am", "Księga Amosa", "Amos"),
    ("ob", "Księga Abdiasza", "Obadiah"),
    ("jn", "Księga Jonasza", "Jonah"),
    ("mq", "Księga Micheasza", "Micah"),
    ("na", "Księga Nahuma", "Nahum"),
    ("hc", "Księga Habakuka", "Habakkuk"),
    ("sf", "Księga Sofoniasza", "Zephaniah"),
    ("ag", "Księga Aggeusza", "Haggai"),
    ("zc", "Księga Zachariasza", "Zechariah"),
    ("ml", "Księga Malachiasza", "Malachi"),
    ("mt", "Ewangelia Mateusza", "Matthew"),
    ("mc", "Ewangelia Marka", "Mark"),
    ("lc", "Ewangelia Łukasza", "Luke"),
    ("jo", "Ewangelia Jana", "John"),
    ("atos", "Dzieje Apostolskie", "Acts"),
    ("rm", "List do Rzymian", "Romans"),
    ("1co", "1 List do Koryntian", "1 Corinthians"),
    ("2co", "2 List do Koryntian", "2 Corinthians"),
    ("gl", "List do Galacjan", "Galatians"),
    ("ef", "List do Efezjan", "Ephesians"),
    ("fp", "List do Filipian", "Philippians"),
    ("cl", "List do Kolosan", "Colossians"),
    ("1ts", "1 List do Tesaloniczan", "1 Thessalonians"),
    ("2ts", "2 List do Tesaloniczan", "2 Thessalonians"),
    ("1tm", "1 List do Tymoteusza", "1 Timothy"),
    ("2tm", "2 List do Tymoteusza", "2 Timothy"),
    ("tt", "List do Tytusa", "Titus"),
    ("fm", "List do Filemona", "Philemon"),
    ("hb", "List do Hebrajczyków", "Hebrews"),
    ("tg", "List Jakuba", "James"),
    ("1pe", "1 List Piotra", "1 Peter"),
    ("2pe", "2 List Piotra", "2 Peter"),
    ("1jo", "1 List Jana", "1 John"),
    ("2jo", "2 List Jana", "2 John"),
    ("3jo", "3 List Jana", "3 John"),
    ("jd", "List Judy", "Jude"),
    ("ap", "Objawienie Jana", "Revelation"),
]

FINITE_VERB_TAGS = {"fin", "praet", "impt", "bedzie", "imps", "winien"}
PARTICIPLE_TAGS = {"ppas", "pact", "pcon", "pant"}
PRONOUN_TAGS = {"ppron12", "ppron3", "siebie"}
PRONOUN_LEMMAS = {
    "ten", "tamten", "taki", "swój", "mój", "twój", "nasz", "wasz",
    "który", "jaki", "czyj", "wszystek", "każdy", "żaden", "sam", "ów",
    "kto", "co", "ktoś", "coś", "nikt", "nic", "ktokolwiek", "cokolwiek",
}
TRAILING_CLITIC_TAGS = {"aglt", "part"}
EXCLUDED_VERB_SPACY_TAGS = {"ADJ", "QUB", "PART", "CONJ", "SCONJ", "CCONJ", "ADP", "ADV", "NUM", "PRON", "DET", "INTJ"}
WORD_RE = re.compile(r"^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+$")


def clean_lemma(raw_lemma: str, keep_case: bool = False) -> str:
    base = raw_lemma.split(":", 1)[0].strip()
    return base if keep_case else base.lower()


def is_valid_infinitive(lemma: str) -> bool:
    return len(lemma) >= 3 and (lemma.endswith("ć") or lemma.endswith("c")) and bool(WORD_RE.match(lemma))


class PolishMorphAnalyzer:
    def __init__(self) -> None:
        self.morf = morfeusz2.Morfeusz()
        self._cache: Dict[str, Dict[str, List[str]]] = {}
        self._pure_verb_cache: Dict[str, bool] = {}

    def is_unambiguous_finite_verb(self, surface: str) -> bool:
        s_low = surface.lower()
        cached = self._pure_verb_cache.get(s_low)
        if cached is not None:
            return cached
        buckets = self.analyze_word(surface)
        if not buckets["v"] or any(buckets[k] for k in ("p", "n", "a", "r")):
            self._pure_verb_cache[s_low] = False
            return False
        analyses = self.morf.analyse(surface)
        if not analyses:
            self._pure_verb_cache[s_low] = False
            return False
        max_node = max(end for _, end, _ in analyses)
        pure = all(
            (end == max_node and tag.split(":", 1)[0] in FINITE_VERB_TAGS)
            or (end < max_node and tag.split(":", 1)[0] in FINITE_VERB_TAGS)
            or (start > 0 and tag.split(":", 1)[0] in TRAILING_CLITIC_TAGS)
            for start, end, (_orth, _lem, tag, *_rest) in analyses
        )
        self._pure_verb_cache[s_low] = pure
        return pure

    def analyze_word(self, surface: str) -> Dict[str, List[str]]:
        """
        Return verified Morfeusz2 inflected lemma lists bucketed by category ('v', 'p', 'n', 'a', 'r')
        plus base/default forms ('v_base', 'n_base', 'a_base', 'r_base') for a single orthographic Polish word.
        """
        s_low = surface.lower()
        cache_key = f"{int(surface[0].isupper())}:{s_low}" if surface else ""
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        buckets: Dict[str, List[str]] = {
            "v": [], "p": [], "n": [], "a": [], "r": [],
            "v_base": [], "n_base": [], "a_base": [], "r_base": [],
        }
        if not WORD_RE.match(s_low):
            self._cache[cache_key] = buckets
            return buckets

        analyses = self.morf.analyse(surface)
        if not analyses:
            self._cache[cache_key] = buckets
            return buckets

        max_node = max(end for _, end, _ in analyses)
        adj: Dict[int, List[Tuple[int, str, str]]] = {}
        for start, end, (_orth, lemma, tag, *_rest) in analyses:
            pos = tag.split(":", 1)[0]
            adj.setdefault(start, []).append((end, lemma, pos))

        def can_reach_end_via_clitics(node: int) -> bool:
            if node == max_node:
                return True
            for nxt, _lem, pos in adj.get(node, []):
                if pos in TRAILING_CLITIC_TAGS and can_reach_end_via_clitics(nxt):
                    return True
            return False

        seen: Dict[str, set] = {k: set() for k in buckets}
        for end, raw_lem, pos in adj.get(0, []):
            # Finite verbs (may have trailing -m, -ś, -śmy, -ście, -by)
            if pos in FINITE_VERB_TAGS and can_reach_end_via_clitics(end):
                lem = clean_lemma(raw_lem)
                if is_valid_infinitive(lem):
                    if lem != s_low and lem not in seen["v"]:
                        seen["v"].add(lem)
                        buckets["v"].append(lem)
                    elif lem == s_low and lem not in seen["v_base"]:
                        seen["v_base"].add(lem)
                        buckets["v_base"].append(lem)
                continue

            # All other categories must span the full orthographic token
            if end != max_node:
                continue

            if pos == "inf":
                lem = clean_lemma(raw_lem)
                if is_valid_infinitive(lem) and lem not in seen["v_base"]:
                    seen["v_base"].add(lem)
                    buckets["v_base"].append(lem)
            elif pos in PARTICIPLE_TAGS:
                lem = clean_lemma(raw_lem)
                if is_valid_infinitive(lem) and lem != s_low and lem not in seen["p"]:
                    seen["p"].add(lem)
                    buckets["p"].append(lem)
            elif pos in PRONOUN_TAGS:
                lem = clean_lemma(raw_lem)
                if lem and WORD_RE.match(lem) and lem != "się":
                    if lem != s_low and lem not in seen["r"]:
                        seen["r"].add(lem)
                        buckets["r"].append(lem)
                    elif lem == s_low and lem not in seen["r_base"]:
                        seen["r_base"].add(lem)
                        buckets["r_base"].append(lem)
            elif pos == "subst":
                lem_case = clean_lemma(raw_lem, keep_case=True)
                lem_low = lem_case.lower()
                if lem_low in PRONOUN_LEMMAS:
                    if lem_low != s_low and lem_low not in seen["r"]:
                        seen["r"].add(lem_low)
                        buckets["r"].append(lem_low)
                    elif lem_low == s_low and lem_low not in seen["r_base"]:
                        seen["r_base"].add(lem_low)
                        buckets["r_base"].append(lem_low)
                elif len(lem_low) >= 2 and WORD_RE.match(lem_low):
                    if lem_low != s_low:
                        # Skip spurious proper-noun homographs (e.g. lowercase 'lud' -> toponym 'Luda')
                        if lem_case[0].isupper() and surface[0].islower():
                            continue
                        out_lem = lem_case if lem_case[0].isupper() else lem_low
                        if out_lem.lower() not in seen["n"]:
                            seen["n"].add(out_lem.lower())
                            buckets["n"].append(out_lem)
                    else:
                        out_lem = lem_case if (lem_case[0].isupper() and surface[0].isupper()) else lem_low
                        if out_lem.lower() not in seen["n_base"]:
                            seen["n_base"].add(out_lem.lower())
                            buckets["n_base"].append(out_lem)
            elif pos == "adj":
                lem = clean_lemma(raw_lem)
                if len(lem) >= 2 and WORD_RE.match(lem):
                    if lem in PRONOUN_LEMMAS:
                        if lem != s_low and lem not in seen["r"]:
                            seen["r"].add(lem)
                            buckets["r"].append(lem)
                        elif lem == s_low and lem not in seen["r_base"]:
                            seen["r_base"].add(lem)
                            buckets["r_base"].append(lem)
                    elif lem != s_low and lem not in seen["a"]:
                        seen["a"].add(lem)
                        buckets["a"].append(lem)
                    elif lem == s_low and lem not in seen["a_base"]:
                        seen["a_base"].add(lem)
                        buckets["a_base"].append(lem)

        self._cache[cache_key] = buckets
        return buckets


def pick_best(candidates: List[str], spacy_lemma: str, next_lower: Optional[str] = None) -> str:
    if len(candidates) == 1:
        return candidates[0]
    if next_lower == "się" and "stać" in candidates:
        return "stać"
    spacy_head = clean_lemma(spacy_lemma.split()[0]) if spacy_lemma else ""
    for c in candidates:
        if c.lower() == spacy_head:
            return c
    return candidates[0]


def extract_forms(
    doc: spacy.tokens.Doc,
    en_text: str,
    analyzer: PolishMorphAnalyzer,
) -> List[List[object]]:
    """Extract [start, end, lemma, kind] for all inflected Polish words."""
    matches: List[List[object]] = []
    pl_text = doc.text
    n = len(doc)

    for i, tok in enumerate(doc):
        if tok.is_punct or tok.is_space:
            continue
        surf = tok.text
        if not WORD_RE.match(surf):
            continue

        start = tok.idx
        end = start + len(surf)
        buckets = analyzer.analyze_word(surf)
        next_lower = doc[i + 1].text.lower() if i + 1 < n else None

        # 0. Unambiguous Morfeusz2 finite verbs (rescues verbs like 'kala' that spaCy mistags as NOUN/ADV)
        if analyzer.is_unambiguous_finite_verb(surf):
            lem = pick_best(buckets["v"], tok.lemma_, next_lower)
            lem = disambiguate(surf, lem, pl_text, en_text, start, end)
            matches.append([start, end, lem, "v"])
            continue

        if tok.pos_ in ("ADP", "CCONJ", "SCONJ", "PART", "ADV", "INTJ", "NUM", "SYM", "X"):
            continue

        # 1. Finite verbs ('v') & infinitives ('v', base=1)
        if tok.pos_ in ("VERB", "AUX") and tok.tag_ not in EXCLUDED_VERB_SPACY_TAGS:
            verb_forms = tok.morph.get("VerbForm")
            if verb_forms and "Inf" in verb_forms and "Fin" not in verb_forms:
                if buckets["v_base"]:
                    lem = pick_best(buckets["v_base"], tok.lemma_, next_lower)
                    matches.append([start, end, lem, "v", 1])
                    continue
            elif tok.tag_ not in ("PPAS", "PACT", "PCON", "PANT", "GER"):
                if buckets["v"]:
                    lem = pick_best(buckets["v"], tok.lemma_, next_lower)
                    lem = disambiguate(surf, lem, pl_text, en_text, start, end)
                    matches.append([start, end, lem, "v"])
                    continue
                if buckets["v_base"]:
                    lem = pick_best(buckets["v_base"], tok.lemma_, next_lower)
                    matches.append([start, end, lem, "v", 1])
                    continue

        # 2. Verbal participles ('p')
        if (tok.tag_ in ("PPAS", "PACT", "PCON", "PANT") or "VerbForm=Part" in str(tok.morph)) and buckets["p"]:
            lem = pick_best(buckets["p"], tok.lemma_)
            matches.append([start, end, lem, "p"])
            continue

        # 3. Pronouns & Determiners ('r')
        if tok.pos_ in ("PRON", "DET"):
            if buckets["r"]:
                lem = pick_best(buckets["r"], tok.lemma_)
                matches.append([start, end, lem, "r"])
                continue
            if buckets["r_base"]:
                lem = pick_best(buckets["r_base"], tok.lemma_)
                matches.append([start, end, lem, "r", 1])
                continue

        # 4. Nouns ('n') — note spaCy sometimes mislabels declined nouns like 'oliwą' as ADJ with tag SUBST
        if tok.pos_ in ("NOUN", "PROPN") or (tok.tag_ == "SUBST" and not buckets["a"]):
            if buckets["n"]:
                lem = pick_best(buckets["n"], tok.lemma_)
                matches.append([start, end, lem, "n"])
                continue
            if buckets["n_base"]:
                lem = pick_best(buckets["n_base"], tok.lemma_)
                matches.append([start, end, lem, "n", 1])
                continue

        # 5. Adjectives ('a') — also catch participles if spaCy missed PPAS tag but Morfeusz knows only ppas
        if tok.pos_ == "ADJ" or tok.tag_ == "ADJ":
            if buckets["r"]:
                lem = pick_best(buckets["r"], tok.lemma_)
                matches.append([start, end, lem, "r"])
                continue
            if buckets["r_base"]:
                lem = pick_best(buckets["r_base"], tok.lemma_)
                matches.append([start, end, lem, "r", 1])
                continue
            if buckets["a"]:
                lem = pick_best(buckets["a"], tok.lemma_)
                matches.append([start, end, lem, "a"])
                continue
            if buckets["a_base"]:
                lem = pick_best(buckets["a_base"], tok.lemma_)
                matches.append([start, end, lem, "a", 1])
                continue
            if buckets["p"]:
                lem = pick_best(buckets["p"], tok.lemma_)
                matches.append([start, end, lem, "p"])
                continue

    return matches


def main() -> None:
    t0 = time.time()
    print("Loading Polish UBG and cached English translations...", flush=True)
    pl_books = json.loads(PL_PATH.read_text(encoding="utf-8-sig"))
    en_llm = json.loads(EN_LLM_CACHE.read_text(encoding="utf-8")) if EN_LLM_CACHE.exists() else {}
    en_bsb = json.loads(EN_BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if EN_BSB_PATH.exists() else None

    assert len(pl_books) == 66, "Expected 66 books in pl_ubg.json"

    print("Loading spaCy pl_core_news_md + Morfeusz2...", flush=True)
    nlp = spacy.load("pl_core_news_md", disable=["ner", "parser"])
    analyzer = PolishMorphAnalyzer()

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

    heb_acrostic_re = re.compile(r"\s+[\u0590-\u05ff]\s+[A-Za-z]+$")
    en_acrostic_re = re.compile(
        r"\s+(?:[\u0590-\u05ff]\s+)?(?:Alef|Bet|Beth|Gimel|Dalet|Daleth|He|Waw|Vav|Zain|Zayin|Het|Chet|Tet|Teth|Jod|Yod|Kaf|Kaph|Lamed|Mem|Nun|Samech|Samekh|Ajin|Ayin|Pe|Cade|Tsade|Kof|Qof|Resz|Resh|Szin|Shin|Taw|Tav)\.?\s*$"
    )

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        book_id = BOOKS_META[bi][0]
        bsb_map = {}
        if en_bsb:
            bsb_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in en_bsb[bi]["chapters"]
            }
        for ci, verses in enumerate(pl_books[bi]["chapters"], 1):
            for vi, pl_text in enumerate(verses, 1):
                key = f"{book_id}:{ci}:{vi}"
                cleaned_pl = heb_acrostic_re.sub("", pl_text.strip())
                en_text = en_llm.get(key) or bsb_map.get(ci, {}).get(vi, "")
                if cleaned_pl != pl_text.strip():
                    en_text = en_acrostic_re.sub("", en_text)
                flat_items.append((bi, ci, vi, cleaned_pl, en_text))

    print(f"Processing {len(flat_items)} Polish verses (v, p, n, a, r)...", flush=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    counts = {"v": 0, "p": 0, "n": 0, "a": 0, "r": 0}
    quiz_verses = 0

    texts = (item[3] for item in flat_items)
    for (bi, ci, vi, pl_text, en_text), doc in zip(flat_items, nlp.pipe(texts, batch_size=512)):
        forms = extract_forms(doc, en_text, analyzer)
        if not forms:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": pl_text,
            "t": en_text,
            "m": forms,
        })
        quiz_verses += 1
        for sp in forms:
            if len(sp) < 5:
                counts[sp[3]] += 1

    manifest_books = []
    for bi, (book_id, pl_name, en_name) in enumerate(BOOKS_META):
        entries = book_entries[bi]
        chunk_rel = f"chunks/{bi + 1:02d}-{book_id}.json"
        (OUT_DIR / chunk_rel).write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        manifest_books.append({
            "index": bi,
            "id": book_id,
            "nativeName": pl_name,
            "plName": pl_name,
            "enName": en_name,
            "chunkFile": chunk_rel,
            "verseCount": len(entries),
        })

    manifest = {
        "id": "pl-bible-ubg",
        "language": "pl",
        "title": "Bible",
        "subtitle": "Uwspółcześniona Biblia Gdańska · Direct English",
        "translationSource": "UBG → EN",
        "totalVerses": len(flat_items),
        "quizVerses": quiz_verses,
        "totalVerbs": counts["v"],
        "categories": ["v", "p", "n", "a", "r"],
        "formCounts": counts,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Done in {time.time() - t0:.1f}s! Verses: {quiz_verses} | Inflected Counts: {counts}", flush=True)

    for label, bi, c, v in [("Gen 3:13", 0, 3, 13), ("Num 7:43", 3, 7, 43)]:
        e = next((x for x in book_entries[bi] if x["c"] == c and x["v"] == v), None)
        if e:
            print(f"\n--- PL {label} ---")
            print([(e["o"][sp[0]:sp[1]], sp[2], sp[3], "base" if len(sp) > 4 else "infl") for sp in e["m"]])


if __name__ == "__main__":
    main()
