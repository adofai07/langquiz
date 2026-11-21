"""Audit a generated Bible verb-quiz corpus for linguistic and structural integrity."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def is_valid_lemma(lang: str, lemma: str) -> bool:
    if lang == "pl":
        return lemma.endswith("ć") or lemma.endswith("c")
    if lang == "de":
        return lemma.endswith("en") or lemma.endswith("ern") or lemma.endswith("eln") or lemma in ("tun", "sein")
    if lang == "cs":
        return lemma.endswith("t") or lemma.endswith("ti") or lemma.endswith("ci") or lemma.endswith("ct")
    if lang == "es":
        return lemma.endswith("ar") or lemma.endswith("er") or lemma.endswith("ir") or lemma.endswith("ír")
    return len(lemma) >= 2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", default="pl-bible-ubg")
    args = parser.parse_args()

    corpus_dir = ROOT / "public" / "data" / args.corpus
    manifest = json.loads((corpus_dir / "manifest.json").read_text(encoding="utf-8"))
    lang = manifest["language"]
    print(
        f"Manifest [{args.corpus}]: {manifest['title']} ({lang}) | {manifest['quizVerses']}/{manifest['totalVerses']} verses "
        f"| {manifest['totalVerbs']} blanks | {len(manifest['books'])} books"
    )

    errors = 0
    empty_translations = 0
    all_samples = []
    for book in manifest["books"]:
        chunk_path = corpus_dir / book["chunkFile"]
        entries = json.loads(chunk_path.read_text(encoding="utf-8"))
        assert len(entries) == book["verseCount"], f"Count mismatch in {book['id']}"
        native_name = book.get("nativeName") or book.get("plName") or book["enName"]

        for entry in entries:
            text = entry["o"]
            if not entry.get("t", "").strip():
                empty_translations += 1
            prev_end = -1
            for span in entry["m"]:
                start, end, lemma = span[0], span[1], span[2]
                kind = span[3] if len(span) > 3 else "v"
                is_base = len(span) > 4 and bool(span[4])
                if not (0 <= start < end <= len(text)):
                    print(f"OUT OF BOUNDS: {book['id']} {entry['c']}:{entry['v']}")
                    errors += 1
                if start < prev_end:
                    print(f"OVERLAP: {book['id']} {entry['c']}:{entry['v']}")
                    errors += 1
                prev_end = end
                surface = text[start:end]
                if kind in ("v", "p", "g", "t") and not is_valid_lemma(lang, lemma):
                    print(f"BAD LEMMA: {surface} -> {lemma} ({kind})")
                    errors += 1
                if not is_base and surface.lower() == lemma.lower():
                    print(f"TRIVIAL FORM (not flagged base): {surface} -> {lemma} ({kind})")
                    errors += 1

            if book["id"] == "gn" and entry["c"] == 3 and entry["v"] == 13:
                print("\n=== Genesis 3:13 ===")
                print("Reference:", f"{native_name} ({book['enName']}) {entry['c']}:{entry['v']}")
                masked = []
                cur = 0
                for span in entry["m"]:
                    s, e = span[0], span[1]
                    masked.append(text[cur:s])
                    masked.append("______")
                    cur = e
                masked.append(text[cur:])
                print("Original:", "".join(masked))
                print("Translation:", entry["t"])
                print("Forms:", ", ".join(f"{sp[2]}({sp[3] if len(sp) > 3 else 'v'})" for sp in entry["m"]))
                print("Answers:", ", ".join(text[sp[0]:sp[1]] for sp in entry["m"]))

        if entries:
            all_samples.append((native_name, book, entries))

    print(f"\nIntegrity errors: {errors} | Empty translations: {empty_translations}")
    assert errors == 0, f"Found {errors} integrity errors!"

    random.seed(42)
    sample_n = min(8, len(all_samples))
    print(f"\n=== Random Spot Check ({sample_n} chapters) ===")
    for native_name, book, entries in random.sample(all_samples, sample_n):
        e = random.choice(entries)
        pairs = [(e["o"][sp[0]:sp[1]], sp[2], sp[3] if len(sp) > 3 else "v") for sp in e["m"]]
        print(f"  {native_name} ({book['enName']}) {e['c']}:{e['v']}: {pairs}")


if __name__ == "__main__":
    main()
