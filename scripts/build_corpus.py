"""
Build the Polish Bible (UBG) + English (BSB) verb-form quiz corpus.

Uses spaCy (`pl_core_news_md`) for contextual POS disambiguation combined with
Morfeusz2 (SGJP Polish morphological dictionary) for gold-standard finite verb
verification and infinitive lemmatization.

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

ROOT = Path(__file__).resolve().parent.parent
PL_PATH = ROOT / "pl_ubg.json"
EN_PATH = ROOT / "raw_data" / "en_bsb.json"
OUT_DIR = ROOT / "public" / "data" / "pl-bible-ubg"
CHUNKS_DIR = OUT_DIR / "chunks"

# Canonical Polish + English book names aligned 1-to-1 with pl_ubg.json & BSB.json (66 books)
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
TRAILING_CLITIC_TAGS = {"aglt", "part"}
EXCLUDED_SPACY_TAGS = {"ADJ", "QUB", "PART", "CONJ", "SCONJ", "CCONJ", "ADP", "ADV", "NUM", "PRON", "DET", "INTJ"}
WORD_RE = re.compile(r"^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+$")


def clean_lemma(raw_lemma: str) -> str:
    """Strip Morfeusz2 homonym tag suffix (e.g. 'stać:Vp' -> 'stać')."""
    return raw_lemma.split(":", 1)[0].strip().lower()


def is_valid_infinitive(lemma: str) -> bool:
    """Check that a Polish lemma is a genuine infinitive ending in -ć or -c."""
    return len(lemma) >= 3 and (lemma.endswith("ć") or lemma.endswith("c")) and bool(WORD_RE.match(lemma))


class PolishVerbAnalyzer:
    def __init__(self) -> None:
        self.morf = morfeusz2.Morfeusz()
        self._cache: Dict[str, List[str]] = {}

    def finite_verb_lemmas(self, surface_lower: str) -> List[str]:
        """
        Return verified Polish infinitive lemmas if `surface_lower` can be analyzed by
        Morfeusz2 as a conjugated finite verb (optionally with trailing clitics like
        -m, -ś, -śmy, -ście, -by).
        """
        cached = self._cache.get(surface_lower)
        if cached is not None:
            return cached

        if not WORD_RE.match(surface_lower):
            self._cache[surface_lower] = []
            return []

        analyses = self.morf.analyse(surface_lower)
        if not analyses:
            self._cache[surface_lower] = []
            return []

        max_node = max(end for _, end, _ in analyses)

        # Build adjacency from node -> list of (end_node, lemma, pos_tag)
        adj: Dict[int, List[Tuple[int, str, str]]] = {}
        for start, end, (_orth, lemma, tag, *_rest) in analyses:
            pos = tag.split(":", 1)[0]
            adj.setdefault(start, []).append((end, lemma, pos))

        # Check valid paths starting at node 0 with a finite verb tag,
        # optionally followed ONLY by clitic/particle tags (aglt, part) to max_node.
        def can_reach_end_via_clitics(node: int) -> bool:
            if node == max_node:
                return True
            for nxt, _lem, pos in adj.get(node, []):
                if pos in TRAILING_CLITIC_TAGS and can_reach_end_via_clitics(nxt):
                    return True
            return False

        lemmas: List[str] = []
        seen = set()
        for end, raw_lem, pos in adj.get(0, []):
            if pos in FINITE_VERB_TAGS and can_reach_end_via_clitics(end):
                lem = clean_lemma(raw_lem)
                if is_valid_infinitive(lem) and lem != surface_lower and lem not in seen:
                    seen.add(lem)
                    lemmas.append(lem)

        self._cache[surface_lower] = lemmas
        return lemmas


def pick_best_lemma(
    candidates: List[str],
    spacy_lemma: str,
    next_token_lower: Optional[str],
) -> str:
    """Disambiguate when Morfeusz2 returns multiple finite-verb lemmas."""
    if len(candidates) == 1:
        return candidates[0]

    # Special high-frequency Polish biblical disambiguation:
    # "stanie się" -> "stać" (to happen/become), whereas "stanie" alone often -> "stanąć" (to stand)
    if next_token_lower == "się" and "stać" in candidates:
        return "stać"

    spacy_head = clean_lemma(spacy_lemma.split()[0]) if spacy_lemma else ""
    if spacy_head in candidates:
        return spacy_head

    # Prefer imperfective/shorter standard lemma or first SGJP candidate
    return candidates[0]


def extract_verbs(doc: spacy.tokens.Doc, analyzer: PolishVerbAnalyzer) -> List[List[object]]:
    """
    Extract [start_char, end_char, infinitive_lemma] tuples for conjugated finite verbs.
    """
    matches: List[List[object]] = []
    n = len(doc)
    for i, tok in enumerate(doc):
        if tok.pos_ not in ("VERB", "AUX"):
            continue
        if tok.tag_ in EXCLUDED_SPACY_TAGS:
            continue
        # Skip pure infinitives in the original text (trivial if answer == hint)
        verb_forms = tok.morph.get("VerbForm")
        if verb_forms and "Inf" in verb_forms and "Fin" not in verb_forms:
            continue

        surface = tok.text
        surface_lower = surface.lower()

        candidates = analyzer.finite_verb_lemmas(surface_lower)
        if not candidates:
            continue

        # Additional guard: skip homographs where spaCy explicitly says non-finite participle
        if tok.tag_ in ("PPAS", "PACT", "PCON", "PANT", "GER"):
            continue

        next_lower = doc[i + 1].text.lower() if i + 1 < n else None
        lemma = pick_best_lemma(candidates, tok.lemma_, next_lower)
        matches.append([tok.idx, tok.idx + len(surface), lemma])

    return matches


def main() -> None:
    t0 = time.time()
    print("Loading Polish UBG and English BSB datasets...")
    pl_books = json.loads(PL_PATH.read_text(encoding="utf-8-sig"))
    en_data = json.loads(EN_PATH.read_text(encoding="utf-8-sig"))
    en_books = en_data["books"]

    assert len(pl_books) == 66 and len(en_books) == 66, "Expected 66 books in both corpora"

    print("Loading spaCy pl_core_news_md + Morfeusz2...")
    nlp = spacy.load("pl_core_news_md", disable=["ner", "parser"])
    analyzer = PolishVerbAnalyzer()

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

    # Flatten verses to leverage spaCy nlp.pipe batch processing
    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        pl_chapters = pl_books[bi]["chapters"]
        en_map = {
            c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
            for c in en_books[bi]["chapters"]
        }
        for ci, verses in enumerate(pl_chapters, 1):
            for vi, pl_text in enumerate(verses, 1):
                en_text = en_map[ci][vi]
                flat_items.append((bi, ci, vi, pl_text.strip(), en_text))

    print(f"Processing {len(flat_items)} verses with spaCy + Morfeusz2...")
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    total_verbs = 0
    quiz_verses = 0

    texts = (item[3] for item in flat_items)
    for (bi, ci, vi, pl_text, en_text), doc in zip(flat_items, nlp.pipe(texts, batch_size=512)):
        verbs = extract_verbs(doc, analyzer)
        if not verbs:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": pl_text,
            "t": en_text,
            "m": verbs,
        })
        quiz_verses += 1
        total_verbs += len(verbs)

    manifest_books = []
    for bi, (book_id, pl_name, en_name) in enumerate(BOOKS_META):
        entries = book_entries[bi]
        chunk_rel = f"chunks/{bi + 1:02d}-{book_id}.json"
        chunk_path = OUT_DIR / chunk_rel
        chunk_path.write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        manifest_books.append({
            "index": bi,
            "id": book_id,
            "plName": pl_name,
            "enName": en_name,
            "chunkFile": chunk_rel,
            "verseCount": len(entries),
        })

    manifest = {
        "id": "pl-bible-ubg",
        "language": "pl",
        "title": "Bible",
        "subtitle": "Uwspółcześniona Biblia Gdańska · Berean Standard Bible",
        "translationSource": "BSB",
        "totalVerses": len(flat_items),
        "quizVerses": quiz_verses,
        "totalVerbs": total_verbs,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    elapsed = time.time() - t0
    print(f"Done in {elapsed:.1f}s! Quiz verses: {quiz_verses}/{len(flat_items)}, total verb blanks: {total_verbs}")

    # Verify Genesis 3:13 specifically
    gen_entries = book_entries[0]
    gen313 = next((e for e in gen_entries if e["c"] == 3 and e["v"] == 13), None)
    print("\n--- Genesis 3:13 Verification ---")
    if gen313:
        print("Original:", gen313["o"])
        print("Translation:", gen313["t"])
        print("Blanks:", [(gen313["o"][s:e], lem) for s, e, lem in gen313["m"]])
    else:
        print("WARNING: Genesis 3:13 not found!")


if __name__ == "__main__":
    main()
