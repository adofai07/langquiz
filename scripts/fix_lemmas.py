"""
Post-process Polish verb lemmas across all 66 Bible chunks to eliminate archaic
SGJP variants and disambiguate high-frequency Polish verb homographs using
reflexive context and the aligned English translation.

Run after `build_corpus.py` (and optionally after `translate_corpus.py`).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT / "public" / "data" / "pl-bible-ubg"

# Normalize archaic / secondary SGJP lemmas to standard modern Polish infinitives
ARCHAIC_TO_MODERN = {
    "znajść": "znaleźć",
    "wynijść": "wyjść",
    "wyniść": "wyjść",
    "wnijść": "wejść",
    "wniść": "wejść",
    "znijść": "zejść",
    "zniść": "zejść",
    "przynijść": "przyjść",
    "przyniść": "przyjść",
    "odejść": "odejść",
    "odnijść": "odejść",
    "odnisć": "odejść",
    "nienawidzieć": "nienawidzić",
    "znajdywać": "znajdować",
    "postępywać": "postępować",
    "wspomnąć": "wspomnieć",
    "stajać": "stawać",
    "mamić": "mieć",   # only overridden when surface == 'mam' below
}

BURN_RE = re.compile(r"\b(burn|burns|burned|burnt|fire|flame|consume|scorch|incinerat)", re.I)
SLEEP_RE = re.compile(r"\b(sleep|slept|asleep|slumber)", re.I)
REMOVE_RE = re.compile(r"\b(remove|far|away|depart|banish|drive|distance|separate|withdraw|cast out)", re.I)
LAUGH_RE = re.compile(r"\b(laugh|mock|scoff|deride)", re.I)
DARE_RE = re.compile(r"\b(dare|dared|bold|presume)", re.I)
MILL_RE = re.compile(r"\b(grind|mill|ground)", re.I)


def disambiguate(surface: str, lemma: str, pl_text: str, en_text: str, start: int, end: int) -> str:
    s_low = surface.lower()

    # Exact archaic normalization (skip 'mamić' generic map; handle 'mam' explicitly)
    if lemma in ARCHAIC_TO_MODERN and lemma != "mamić":
        lemma = ARCHAIC_TO_MODERN[lemma]

    # High-frequency unambiguous biblical corrections
    if s_low == "mam" and lemma == "mamić":
        return "mieć"
    if s_low == "mają" and lemma == "maić":
        return "mieć"
    if s_low == "musi" and lemma == "musić":
        return "musieć"
    if s_low == "pili" and lemma == "pilić":
        return "pić"
    if s_low == "stali" and lemma == "stalić":
        return "stać"
    if s_low == "mieli" and lemma == "mielić" and not MILL_RE.search(en_text):
        return "mieć"

    # Reflexive window around verb (+/- 25 chars)
    win = pl_text[max(0, start - 25) : min(len(pl_text), end + 25)].lower()
    has_sie = bool(re.search(r"\bsię\b", win))

    # śmiał / śmiała / śmiali: śmiać (się) [laugh] vs śmieć [dare]
    if lemma in ("śmieć", "śmiać") and s_low.startswith("śmia"):
        if has_sie or LAUGH_RE.search(en_text):
            return "śmiać"
        if DARE_RE.search(en_text):
            return "śmieć"

    # stanie / staną: stać (się) [become/happen] vs stanąć [stand]
    if lemma in ("stanąć", "stać") and s_low in ("stanie", "staną", "stanę", "staniesz", "staniemy", "staniecie"):
        if has_sie:
            return "stać"

    # spali: spalić [burn] vs spać [slept]
    if s_low == "spali" and lemma in ("spać", "spalić"):
        if BURN_RE.search(en_text) and not SLEEP_RE.search(en_text):
            return "spalić"
        if SLEEP_RE.search(en_text) and not BURN_RE.search(en_text):
            return "spać"

    # oddali: oddalić [remove/put away] vs oddać [give back/render]
    if s_low == "oddali" and lemma in ("oddać", "oddalić"):
        if REMOVE_RE.search(en_text):
            return "oddalić"
        return "oddać"

    return lemma


def main() -> None:
    manifest = json.loads((CORPUS_DIR / "manifest.json").read_text(encoding="utf-8"))
    changes = 0
    for book in manifest["books"]:
        chunk_path = CORPUS_DIR / book["chunkFile"]
        entries = json.loads(chunk_path.read_text(encoding="utf-8"))
        modified = False
        for entry in entries:
            pl_text = entry["o"]
            en_text = entry["t"]
            for span in entry["m"]:
                start, end, old_lemma = span
                new_lemma = disambiguate(pl_text[start:end], old_lemma, pl_text, en_text, start, end)
                if new_lemma != old_lemma:
                    span[2] = new_lemma
                    changes += 1
                    modified = True
        if modified:
            chunk_path.write_text(
                json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
    print(f"Disambiguated/normalized {changes} verb lemmas across {len(manifest['books'])} books.")


if __name__ == "__main__":
    main()
