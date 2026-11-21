"""
Build the Czech Bible (Bible kralická / BKR) inflected word-form quiz corpus.

Uses Charles University's MorphoDiTa + MorfFlex CZ 2.0 / PDT-C 1.0 tagger and
morphological dictionary (`ufal.morphodita`), which natively handles Early Modern
Czech imperatives (`Vi`), archaic `-ti` infinitives (`Vf`, cleanly excluded),
archaic `-ť` verbs (`Vt`, `Vq`), passive participles (`Vs`), and transgressives
(`Ve`, `Vm`):

  - 'v': finite verbs, past l-participles, imperatives, conditionals, archaic -ť verbs
         (VB, Vp, Vi, Vc, Vt, Vq)
  - 'p': passive participles, transgressives, and inflected verbal participles
         (Vs, Ve, Vm, AG, AM)
  - 'n': inflected nouns (NN where surface != lemma)
  - 'a': inflected adjectives (AA, AU, AC where surface != lemma)
  - 'r': inflected pronouns & determiners (P*, AO where surface != lemma)

Reuses cached direct English translations (`raw_data/en_llm_translations_cs.json`).
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Dict, List, Tuple

from ufal.morphodita import Forms, Tagger, TaggedLemmas, TokenRanges

ROOT = Path(__file__).resolve().parent.parent
CS_PATH = ROOT / "cs_bkr.json"
EN_LLM_CACHE = ROOT / "raw_data" / "en_llm_translations_cs.json"
BSB_PATH = ROOT / "raw_data" / "en_bsb.json"
TAGGER_PATH = (
    ROOT
    / "raw_data"
    / "morphodita-cs"
    / "czech-morfflex2.0-pdtc1.0-220710"
    / "czech-morfflex2.0-pdtc1.0-220710.tagger"
)
OUT_DIR = ROOT / "public" / "data" / "cs-bible-bkr"
CHUNKS_DIR = OUT_DIR / "chunks"

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

VERB_PREFIXES = ("VB", "Vp", "Vi", "Vc", "Vt", "Vq")
PASSIVE_PART_PREFIXES = ("Vs",)
TRANSGRESSIVE_PREFIXES = ("Ve", "Vm")
VERBAL_ADJ_PREFIXES = ("AG", "AM")
ADJ_PREFIXES = ("AA", "AU", "AC")

# Biblical imperatives occasionally mistagged by modern-news MorphoDiTa as rare nouns/particles
# or spelled archaically outside modern MorfFlex (e.g. "proklň" = modern "proklej").
IMPERATIVE_OVERRIDES: Dict[str, str] = {
    "budiž": "být",
    "dej": "dát",
    "pohleď": "pohledět",
    "oznam": "oznámit",
    "volej": "volat",
    "slož": "složit",
    "jez": "jíst",
    "proklň": "proklít",
}

# Archaic Czech verb spellings outside modern MorfFlex NO_GUESSER
ARCHAIC_VERB_OVERRIDES: Dict[str, str] = {
    "proklň": "proklít",
    "svítězím": "zvítězit",
    "svítězí": "zvítězit",
    "svítězil": "zvítězit",
}

EN_ALLCAPS_LORD_RE = re.compile(r"\bLORD\b")
MORFFLEX_DERIV_RE = re.compile(r"_\^\(\*(\d+)([^)]*)\)")


def derive_verbal_infinitive(short_lemma: str, raw_lemma: str, morpho, probe: TaggedLemmas) -> str | None:
    """Decode MorfFlex ^(*N...) derivation on AG/AM active participles (e.g. poskvrňující_^(*5ovat) -> poskvrňovat)."""
    m = MORFFLEX_DERIV_RE.search(raw_lemma)
    if not m:
        return None
    cut = int(m.group(1))
    add = re.split(r"[-_`^]", m.group(2), maxsplit=1)[0]
    if cut > len(short_lemma):
        return None
    base = ((short_lemma[:-cut] if cut > 0 else short_lemma) + add).lower()
    if not is_valid_cs_infinitive(base):
        return None
    if morpho.analyze(base, morpho.NO_GUESSER, probe) >= 0 and any(x.tag.startswith("Vf") for x in probe):
        return base
    return None

# Non-verb archaic -ť forms occasionally caught by MorphoDiTa's Vt tag
VT_NONVERB_OVERRIDES: Dict[str, Tuple[str, str] | None] = {
    "mneť": ("já", "r"),
    "většíť": None,
}

# Negated noun/adj homographs occasionally tagged as negated 1sg/3sg verbs
NEG_VERB_HOMOGRAPH_OVERRIDES: Dict[str, Tuple[str, str]] = {
    "nevinu": ("nevina", "n"),
    "nedělí": ("neděle", "n"),
    "nemocní": ("nemocný", "a"),
}

# Archaic non-inflecting words occasionally misclassified by modern MorfFlex
SKIP_EXACT_LOWER = {"podlé", "dvadceti", "třidceti", "čtyřidceti", "čtyřidcíti", "třidcíti"}

# Capitalized mid-sentence biblical proper names that collide with lowercase Czech verbs
PROPER_NAME_VERB_COLLISIONS = {
    "Bála", "Báli", "Bály", "Elí", "Léví", "Hul", "Séla", "Obil", "Uzen",
    "Nemra", "Kabul", "Rachal", "Ulam", "Jefte",
}


def is_valid_cs_infinitive(lemma: str) -> bool:
    return (
        len(lemma) >= 3
        and lemma == lemma.lower()
        and bool(CS_WORD_RE.match(lemma))
        and (lemma.endswith("t") or lemma.endswith("ti") or lemma.endswith("ci") or lemma.endswith("ct"))
    )


def restore_negated_nonverb_lemma(surf_low: str, lem: str, tag: str) -> str:
    """
    In PDT-C 1.0, MorfFlex strips `ne-` from negated nouns/adjectives (e.g.
    `nepravost` -> `pravost`, `nesličná` -> `sličný`). Restore `ne-` so uninflected
    forms like `nepravost` are not falsely blanked and inflected forms like
    `nepravosti` show their true dictionary base `nepravost`.
    """
    if len(tag) > 10 and tag[10] == "N" and surf_low.startswith("ne") and not lem.lower().startswith("ne"):
        if lem and lem[0].isupper():
            return "Ne" + lem[0].lower() + lem[1:]
        return "ne" + lem
    return lem


def is_known_in_morfflex(morpho, word: str, probe: TaggedLemmas) -> bool:
    return morpho.analyze(word, morpho.NO_GUESSER, probe) >= 0


def classify_token(
    surf: str,
    raw_lemma: str,
    short_lemma: str,
    tag: str,
    is_mid_sentence: bool,
    morpho,
    probe: TaggedLemmas,
) -> Tuple[str, str, bool] | None:
    """Return (lemma, kind, is_base) or None."""
    if not CS_WORD_RE.match(surf):
        return None
    s_low = surf.lower()
    if s_low in SKIP_EXACT_LOWER:
        return None
    t2 = tag[:2]

    # 1. Exact biblical homograph & archaic spelling overrides
    if s_low in ARCHAIC_VERB_OVERRIDES:
        return (ARCHAIC_VERB_OVERRIDES[s_low], "v", False)

    if t2 in ("NN", "TT", "Db", "II") and short_lemma.lower() == s_low and s_low in IMPERATIVE_OVERRIDES:
        return (IMPERATIVE_OVERRIDES[s_low], "v", False)

    if t2 in ("Vt", "Vq") and s_low in VT_NONVERB_OVERRIDES:
        ov = VT_NONVERB_OVERRIDES[s_low]
        return (ov[0], ov[1], False) if ov else None

    if t2 == "VB" and len(tag) > 10 and tag[10] == "N" and s_low in NEG_VERB_HOMOGRAPH_OVERRIDES:
        ov = NEG_VERB_HOMOGRAPH_OVERRIDES[s_low]
        return (ov[0], ov[1], False)

    # 2. Infinitives (modern -t and archaic -ti like jísti, býti, záviděti) -> 'v', is_base=True
    if t2 == "Vf":
        lem = short_lemma.lower()
        if is_valid_cs_infinitive(lem) and is_known_in_morfflex(morpho, s_low, probe):
            return (lem, "v", True)
        return None

    # 3. Finite verbs, past l-participles, imperatives, conditionals, archaic -ť verbs
    if t2 in VERB_PREFIXES:
        if is_mid_sentence and surf in PROPER_NAME_VERB_COLLISIONS:
            return None
        lem = short_lemma.lower()
        if is_valid_cs_infinitive(lem) and is_known_in_morfflex(morpho, s_low, probe):
            return (lem, "v", lem == s_low)
        return None

    # 4a. Passive participles (Vs) -> 'p'
    if t2 in PASSIVE_PART_PREFIXES:
        if is_mid_sentence and surf in PROPER_NAME_VERB_COLLISIONS:
            return None
        lem = short_lemma.lower()
        if is_valid_cs_infinitive(lem) and is_known_in_morfflex(morpho, s_low, probe):
            return (lem, "p", lem == s_low)
        return None

    # 4b. Transgressives / přechodníky (Ve, Vm: řka, nemaje, přišedše, pojav) -> 't'
    if t2 in TRANSGRESSIVE_PREFIXES:
        if is_mid_sentence and surf in PROPER_NAME_VERB_COLLISIONS:
            return None
        lem = short_lemma.lower()
        if is_valid_cs_infinitive(lem) and is_known_in_morfflex(morpho, s_low, probe):
            return (lem, "t", lem == s_low)
        return None

    # 5. Active verbal participles (AG, AM, e.g. poskvrňující -> poskvrňovat, sedícího -> sedět)
    if t2 in VERBAL_ADJ_PREFIXES:
        verb_base = derive_verbal_infinitive(short_lemma, raw_lemma, morpho, probe)
        if verb_base and verb_base != s_low:
            return (verb_base, "p", False)
        lem = restore_negated_nonverb_lemma(s_low, short_lemma.lower(), tag)
        if len(lem) >= 2 and CS_WORD_RE.match(lem):
            return (lem, "a", lem == s_low)
        return None

    # 6. Nouns (NN — inflected and nominative base forms)
    if t2 == "NN":
        is_proper = any(m in raw_lemma for m in ("_;Y", "_;S", "_;G", "_;E", "_;K", "_;m", "_;R"))
        lem_base = short_lemma if is_proper else short_lemma.lower()
        if lem_base == "hospodin" and surf[0].isupper():
            lem_base = "Hospodin"
        elif lem_base == "bůh" and surf[0].isupper():
            lem_base = "Bůh"
        lem = restore_negated_nonverb_lemma(s_low, lem_base, tag)
        if len(lem) >= 2 and CS_WORD_RE.match(lem):
            return (lem, "n", lem.lower() == s_low)
        return None

    # 7. Adjectives (AA, AU, AC — inflected and dictionary base forms)
    if t2 in ADJ_PREFIXES:
        is_proper = any(m in raw_lemma for m in ("_;Y", "_;S", "_;G", "_;E"))
        lem_base = short_lemma if is_proper else short_lemma.lower()
        if lem_base == "hospodinův" and surf[0].isupper():
            lem_base = "Hospodinův"
        lem = restore_negated_nonverb_lemma(s_low, lem_base, tag)
        if len(lem) >= 2 and CS_WORD_RE.match(lem):
            return (lem, "a", lem.lower() == s_low)
        return None

    # 8. Pronouns & determiners (P*, AO — excluding invariant reflexive clitic P7 se/si)
    if (tag.startswith("P") and t2 != "P7") or t2 == "AO":
        lem = short_lemma.lower()
        if len(lem) >= 2 and CS_WORD_RE.match(lem):
            return (lem, "r", lem == s_low)
        return None

    return None


def main() -> None:
    t0 = time.time()
    print("Loading Czech MorphoDiTa (MorfFlex 2.0 + PDT-C 1.0) tagger...", flush=True)
    tagger = Tagger.load(str(TAGGER_PATH))
    if not tagger:
        raise RuntimeError(f"Failed to load MorphoDiTa tagger from {TAGGER_PATH}")
    morpho = tagger.getMorpho()
    tokenizer = tagger.newTokenizer()

    cs_books = json.loads(CS_PATH.read_text(encoding="utf-8-sig"))
    en_llm = json.loads(EN_LLM_CACHE.read_text(encoding="utf-8")) if EN_LLM_CACHE.exists() else {}
    bsb_books = json.loads(BSB_PATH.read_text(encoding="utf-8-sig"))["books"] if BSB_PATH.exists() else None

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    counts = {"v": 0, "p": 0, "t": 0, "n": 0, "a": 0, "r": 0}
    total_verses = 0
    quiz_verses = 0
    manifest_books = []

    forms_vec = Forms()
    lemmas_vec = TaggedLemmas()
    tokens_vec = TokenRanges()
    probe_vec = TaggedLemmas()

    for bi, (book_id, native_name, en_name) in enumerate(BOOKS_META):
        bsb_map = {}
        if bsb_books:
            bsb_map = {
                c["chapter"]: {v["verse"]: v["text"].strip() for v in c["verses"]}
                for c in bsb_books[bi]["chapters"]
            }

        book_entries: List[dict] = []
        for ci, verses in enumerate(cs_books[bi]["chapters"], 1):
            for vi, raw_cs in enumerate(verses, 1):
                total_verses += 1
                cs_text = raw_cs.strip()
                tlen = len(cs_text)
                key = f"{book_id}:{ci}:{vi}"
                en_text = en_llm.get(key) or bsb_map.get(ci, {}).get(vi, "")
                # Match Bible kralická's Title-Case 'Hospodin' with Title-Case 'Lord' (except where original has all-caps 'HOSPODIN')
                if "HOSPODIN" not in cs_text:
                    en_text = EN_ALLCAPS_LORD_RE.sub("Lord", en_text)

                spans: List[List] = []
                tokenizer.setText(cs_text)
                while tokenizer.nextSentence(forms_vec, tokens_vec):
                    tagger.tag(forms_vec, lemmas_vec)
                    for i in range(len(lemmas_vec)):
                        start = tokens_vec[i].start
                        end = start + tokens_vec[i].length
                        if start < 0 or end > tlen:
                            continue
                        if start > 0 and cs_text[start - 1].isalpha():
                            continue
                        if end < tlen and cs_text[end].isalpha():
                            continue
                        surf = cs_text[start:end]
                        raw_lem = lemmas_vec[i].lemma
                        short_lem = morpho.rawLemma(raw_lem)
                        tag = lemmas_vec[i].tag
                        prev_txt = cs_text[:start].rstrip()
                        is_mid_sentence = bool(prev_txt and prev_txt[-1] not in ".!?:;„\"(«")
                        classified = classify_token(
                            surf, raw_lem, short_lem, tag, is_mid_sentence, morpho, probe_vec
                        )
                        if classified is not None:
                            lem, kind, is_base = classified
                            spans.append([start, end, lem, kind, 1] if is_base else [start, end, lem, kind])

                if not spans:
                    continue

                book_entries.append({
                    "c": ci,
                    "v": vi,
                    "o": cs_text,
                    "t": en_text,
                    "m": spans,
                })
                quiz_verses += 1
                for sp in spans:
                    if len(sp) < 5:
                        counts[sp[3]] += 1

        chunk_rel = f"chunks/{bi + 1:02d}-{book_id}.json"
        (OUT_DIR / chunk_rel).write_text(
            json.dumps(book_entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        manifest_books.append({
            "index": bi,
            "id": book_id,
            "nativeName": native_name,
            "enName": en_name,
            "chunkFile": chunk_rel,
            "verseCount": len(book_entries),
        })

    manifest = {
        "id": "cs-bible-bkr",
        "language": "cs",
        "title": "Bible",
        "subtitle": "Bible kralická · Direct English",
        "translationSource": "BKR → EN",
        "totalVerses": total_verses,
        "quizVerses": quiz_verses,
        "totalVerbs": counts["v"],
        "categories": ["v", "p", "t", "n", "a", "r"],
        "formCounts": counts,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Done in {time.time() - t0:.1f}s! Verses: {quiz_verses}/{total_verses} | Inflected Counts: {counts}",
        flush=True,
    )


if __name__ == "__main__":
    main()
