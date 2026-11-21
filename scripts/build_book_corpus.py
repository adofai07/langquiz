"""
Generic book corpus importer for VERBA (.txt and .epub) in Polish, German, or Czech.

Converts any plain-text or EPUB book into a lazy-loaded VERBA corpus under
`public/data/<corpus-id>/` with full language-specific word-form tagging,
base/infinitive flags, direct English translations, and a per-corpus glossary.

Example usage:
  python scripts/build_book_corpus.py \
    --lang cs \
    --id cs-capek-kapsa \
    --title "Povídky z jedné kapsy" \
    --en-title "Tales from One Pocket" \
    --author "Karel Čapek" \
    --short-label "ČAPEK" \
    --input raw_data/books/cs_capek_kapsa.epub
"""

from __future__ import annotations

import argparse
import concurrent.futures
import html
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

ENDPOINT = os.environ.get("LLM_ENDPOINT", "http://localhost:8000/v1/chat/completions")
MODEL = os.environ.get("LLM_MODEL", "")

LANG_META = {
    "pl": ("Polish", ["v", "p", "n", "a", "r"]),
    "de": ("German", ["v", "p", "d", "n", "a", "r"]),
    "cs": ("Czech", ["v", "p", "t", "n", "a", "r"]),
    "es": ("Spanish", ["v", "p", "g", "d", "n", "a", "r"]),
}

# Common abbreviations that should NOT terminate a sentence
ABBREV_RE = re.compile(
    r"\b(?:Mr|Mrs|Ms|Dr|dr|Prof|prof|St|Sr|Sra|Srta|Jr|Rev|Hon|Gen|Col|Capt|Sgt|Lt|No|Vol|Ch|Fig|vs|etc|"
    r"Ud|Uds|Vd|Vds|D|Dña|Cap|Pág|Núm|Art|"
    r"sv|tj|tzv|např|atd|apod|č|str|odd|pozn|tzn|np|itd|itp|hab|ul|al|pl|św|bł|r|w|ok|p|"
    r"Hr|Fr|Frl|bzw|usw|ca|evtl|ggf|inkl|Nr|Abs|Kap|Bd|Jg|S|z\.\s*B|u\.\s*a|d\.\s*h|v\.\s*Chr|n\.\s*Chr|"
    r"[A-Z])\.$"
)

ROMAN_HEADING_RE = re.compile(
    r"^(?:(?:ROZDZIAŁ|Rozdział|CZĘŚĆ|Część|KAPITEL|Kapitel|CAPITEL|Capitel|TEIL|Teil|THEIL|Theil|KAPITOLA|Kapitola|CAPÍTULO|Capítulo|CAPITULO|Capitulo|TRATADO|Tratado|PARTE|Parte|CHAPTER|Chapter)\s+(?:[IVXLCDM0-9]+|pierwszy|drugi|trzeci|czwarty|piąty|szósty|siódmy|ósmy|dziewiąty|dziesiąty|jedenasty|dwunasty|trzynasty|czternasty|piętnasty|szesnasty|primero|segundo|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo).*|"
    r"(?:[A-ZÄÖÜ][a-zäöüß]+(?:tes|stes))\s+(?:und\s+letztes\s+)?(?:Kapitel|Capitel)\.?|"
    r"[IVXLCDM]{1,6}\.(?:\s+.{2,65})?)$"
)


def resolve_model() -> str:
    if MODEL:
        return MODEL
    models_url = ENDPOINT.rsplit("/chat/completions", 1)[0] + "/models"
    with urllib.request.urlopen(models_url, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data["data"][0]["id"])


class EpubBlockParser(HTMLParser):
    """Extract ordered (tag, is_heading_class, text) blocks from an EPUB XHTML document."""

    BLOCK_TAGS = {"h1", "h2", "h3", "h4", "p", "div", "li", "blockquote"}
    SKIP_TAGS = {"script", "style", "head", "title", "nav"}

    def __init__(self) -> None:
        super().__init__()
        self.blocks: List[Tuple[str, bool, str]] = []
        self._skip_depth = 0
        self._cur_tag: str | None = None
        self._cur_head_cls = False
        self._buf: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        t = tag.lower()
        if t in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth > 0:
            return
        if t == "br":
            self._buf.append(" ")
        elif t in self.BLOCK_TAGS:
            self._flush()
            self._cur_tag = t
            cls = dict(attrs).get("class", "").lower()
            self._cur_head_cls = any(k in cls for k in ("nadpis", "kapitol", "chapter", "title", "heading"))

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if self._skip_depth > 0:
            return
        if t in self.BLOCK_TAGS:
            self._flush()
            self._cur_tag = None
            self._cur_head_cls = False

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._buf.append(data)

    def _flush(self) -> None:
        text = " ".join(html.unescape("".join(self._buf)).split()).strip()
        self._buf = []
        if text:
            self.blocks.append((self._cur_tag or "p", self._cur_head_cls, text))


def read_text_auto(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def strip_boilerplate_txt(text: str) -> str:
    # Project Gutenberg markers (*** START/END *** and plain "End of [the/this] Project Gutenberg['s] ...")
    m_start = re.search(r"\*\*\*\s*START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*", text, re.I)
    if m_start:
        text = text[m_start.end() :]
    m_end = re.search(
        r"(?:\*\*\*\s*END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*|\nEnd of (?:the |this )?Project Gutenberg(?:'s|’s)?[^\n]*)",
        text,
        re.I,
    )
    if m_end:
        text = text[: m_end.start()]
    # Wolne Lektury header (Author / Title / tłum. / ISBN 978-...)
    m_wl_isbn = re.search(r"^ISBN\s+97[89]-[0-9-]+[^\n]*\n", text[:900], re.M)
    if m_wl_isbn:
        text = text[m_wl_isbn.end() :]
    # Wolne Lektury footer
    wl_end = re.search(r"\n-----+\s*\nTa lektura, podobnie jak", text)
    if wl_end:
        text = text[: wl_end.start()]
    # Trailing Gutenberg ASCII errata / transcriber box (+-----+ ... +-----+) in the back quarter
    tail_start = (len(text) * 3) // 4
    m_box = re.search(r"\n\s*\+---{10,}\+\s*\n[\s\S]*?\+---{10,}\+\s*$", text[tail_start:])
    if m_box:
        text = text[: tail_start + m_box.start()]
    # German historical publisher ads at back of Gutenberg scans (e.g. Robert Lutz, Otto Spamer)
    ad_end = re.search(
        r"\n\s*(?:[•+]?Verlag von \+?\*?(?:Robert Lutz|Otto Spamer)|Sherlock Holmes-Serie|In derselben Sammlung|Weitere Bände|Der junge Handwerker und Künstler|Ende\.?\s*\n+(?=[\s\S]{0,1500}?(?:Verlag von|Geheftet|Gebunden)))",
        text[len(text) // 2 :],
    )
    if ad_end:
        text = text[: len(text) // 2 + ad_end.start()]
    # Strip Project Gutenberg illustration captions like [Illustration: ...] or [Ilustración: ...]
    text = re.sub(r"\[Ilustraci[oó]n[^\]]*\]|\[Illustration[^\]]*\]", "", text, flags=re.I)
    # Strip Spanish Gutenberg errata lines like "Adios=> Adiós {pg 302}" and Quiroga #heading# markers
    text = re.sub(r"\n[^\n]*=>[^\n]*\{[^}]+\}[^\n]*", "", text)
    text = re.sub(r"(?m)^#([^#\n]{2,70})#$", r"\1", text)
    # Clean Gutenberg / Wolne Lektury emphasis markers (_word_, =word=, *word*)
    text = re.sub(r"_([^_\n]{1,80})_", r"\1", text)
    text = re.sub(r"=([^=\n]{1,80})=", r"\1", text)
    text = re.sub(r"\*([^*\s\n][^*\n]{0,70}[^*\s\n])\*", r"\1", text)
    # Normalize Gutenberg German ASCII low opening double quote (,,word") -> „word“
    if ",," in text:
        text = re.sub(r",,([^\s])", r"„\1", text)
    # Strip German/English PG transcriber notes & table of contents before Chapter 1
    m_tr = re.search(
        r"(?:Anmerkungen zur Transkription|Transcriber['’]s Note|Das Original ist in Fraktur gesetzt|Produced by [^\n]+)",
        text[:3000],
    )
    if m_tr:
        m_ch1 = re.search(r"\n\s*(?:Erstes\s+(?:Kapitel|Capitel)\.?|1\.\s*Kapitel\b|Kapitel\s+1\b|I\.\s*\n|Vorwort\.?\s*\n)\s*\n", text[m_tr.end() : m_tr.end() + 6000])
        if m_ch1:
            text = text[m_tr.end() + m_ch1.start() :]
    return text.strip()


def parse_epub_chapters(path: Path) -> List[Tuple[str, List[str]]]:
    """Return [(chapter_title, [paragraphs...]), ...] from an EPUB file."""
    with zipfile.ZipFile(path) as zf:
        names = set(zf.namelist())
        spine_files: List[str] = []

        if "META-INF/container.xml" in names:
            c_root = ET.fromstring(zf.read("META-INF/container.xml"))
            rf = c_root.find(".//{*}rootfile")
            if rf is not None and rf.attrib.get("full-path"):
                opf_path = rf.attrib["full-path"]
                opf_dir = str(Path(opf_path).parent).replace("\\", "/")
                if opf_dir == ".":
                    opf_dir = ""
                opf_root = ET.fromstring(zf.read(opf_path))
                id_to_href = {}
                for item in opf_root.findall(".//{*}manifest/{*}item"):
                    id_to_href[item.attrib.get("id", "")] = item.attrib.get("href", "")
                for ref in opf_root.findall(".//{*}spine/{*}itemref"):
                    href = id_to_href.get(ref.attrib.get("idref", ""), "")
                    if href:
                        full = f"{opf_dir}/{href}".lstrip("/") if opf_dir else href
                        if full in names:
                            spine_files.append(full)

        if not spine_files:
            spine_files = sorted(n for n in names if n.endswith((".xhtml", ".html", ".htm")))

        chapters: List[Tuple[str, List[str]]] = []
        cur_title = ""
        cur_paras: List[str] = []

        skip_title_words = (
            "obsah", "tiráž", "titulní", "spis treści", "contents",
            "městská knihovna", "vydala městská", "elektronické vydání", "isbn", "licence",
            "digibooks", "vydání první",
        )
        skip_para_substrings = (
            "městská knihovna v praze", "městské knihovny v praze", "městskou knihovnou v praze",
            "isbn ", "e-knihovna.cz", "mlp.cz", "digibooks.cz",
            "znění tohoto textu vychází", "elektronické publikování díla", "českého národního korpusu",
            "licencí creative commons", "vydala městská knihovna",
            "elektronické vydání", "v mkp ", "text díla nelze šířit", "autorský zákon",
            "redakčně zpracován", "z fondu moravské", "přeložil ", "ilustrace ",
            "mariánské nám.", "verze 1.", "pozn. red.", "typografická úprava textu",
        )

        def nice_case_heading(h: str) -> str:
            h = h.strip().rstrip(".")
            if h.isupper() and len(h) > 5:
                # Smart title-casing: preserve Roman numerals and lowercase small Czech/German/Polish prepositions/conjunctions
                small = {"a", "i", "v", "ve", "z", "ze", "s", "se", "k", "ke", "o", "u", "na", "do", "od", "po", "pro", "za", "nad", "pod", "při", "bez", "dr.", "von", "der", "die", "das", "des", "dem", "den", "im", "am", "bei", "und", "zu", "in", "w", "we", "na", "do", "od"}
                words = h.split()
                out_w = []
                for idx_w, w in enumerate(words):
                    if re.match(r"^[IVXLCDM]+\.?$", w):
                        out_w.append(w)
                    elif idx_w > 0 and w.lower() in small:
                        out_w.append(w.lower())
                    else:
                        out_w.append(w.capitalize())
                return " ".join(out_w)
            return h

        for sf in spine_files:
            low_sf = sf.lower()
            if any(k in low_sf for k in ("title", "cover", "toc", "colophon", "copyright", "nav")):
                continue
            raw_html = zf.read(sf).decode("utf-8", errors="replace")
            parser = EpubBlockParser()
            parser.feed(raw_html)
            parser._flush()

            # Check if entire file is frontmatter/colophon/TOC
            joined_head = " ".join(t for _, _, t in parser.blocks[:6]).lower()
            if len(parser.blocks) <= 10 and any(w in joined_head for w in skip_title_words):
                continue
            # Skip TOC-only XHTML files (many short lines, almost no sentence-length prose)
            if len(parser.blocks) >= 8 and sum(1 for _, _, t in parser.blocks if len(t) >= 80) <= 1:
                continue

            for tag, is_head_cls, text in parser.blocks:
                text = re.sub(r"\[\d{1,3}\]", "", text).strip()
                text = re.sub(r"\s{2,}", " ", text)
                if not text:
                    continue
                low_t = text.lower()
                if any(w in low_t for w in skip_para_substrings):
                    continue
                is_allcaps_head = (
                    2 <= len(text) <= 75
                    and text.isupper()
                    and sum(c.isalpha() for c in text) >= 1
                    and not any(q in text for q in ("„", "“", '"', "—"))
                )
                is_heading = (tag in ("h1", "h2", "h3") or is_head_cls or is_allcaps_head) and len(text) <= 105
                if is_heading:
                    if cur_paras:
                        chapters.append((nice_case_heading(cur_title) or f"Part {len(chapters) + 1}", cur_paras))
                        cur_paras = []
                        cur_title = text
                    else:
                        # Combine consecutive heading lines like "I." + "MR. SHERLOCK HOLMES."
                        cur_title = f"{cur_title} {text}".strip() if cur_title and len(cur_title) <= 12 else text
                else:
                    if len(text) >= 15:
                        cur_paras.append(text)

        if cur_paras:
            chapters.append((nice_case_heading(cur_title) or f"Part {len(chapters) + 1}", cur_paras))

    # Drop leading tiny title stubs or modern editorial prefaces about the author
    while len(chapters) > 1 and (
        (len(chapters[0][1]) <= 2 and sum(len(p) for p in chapters[0][1]) < 180)
        or (
            chapters[0][0].lower().startswith(("předmluva", "úvod"))
            and len(chapters[0][1]) <= 6
            and any(w in " ".join(chapters[0][1]).lower() for w in ("spisovateli ", "české literatuře", "narodil se", "zemřel"))
        )
    ):
        chapters.pop(0)

    # Drop trailing footnotes, glossaries, author biographies, bibliographies, colophons
    trailing_skip = (
        "životopis", "bibliografie", "karel čapek", "o autorovi", "doslov", "edice",
        "poznámky pod čarou", "místopisný slovníček", "život a doba", "první vydání", "r.u.r",
        "ediční poznámka",
    )
    while chapters and (
        any(w in chapters[-1][0].lower() for w in trailing_skip)
        or sum(1 for p in chapters[-1][1] if re.match(r"^(?:1[89]\d\d\s*-|-\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]|–\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])", p)) >= 4
    ):
        chapters.pop()

    return chapters


def parse_txt_chapters(path: Path) -> List[Tuple[str, List[str]]]:
    """Return [(chapter_title, [paragraphs...]), ...] from a plain-text book."""
    text = strip_boilerplate_txt(read_text_auto(path))
    raw_paras = re.split(r"\r?\n\s*\r?\n+", text)

    chapters: List[Tuple[str, List[str]]] = []
    cur_title = ""
    cur_paras: List[str] = []

    meta_skip_words = (
        "isbn", "tłum.", "produced by", "transcribed by", "online distributed proofreading",
        "project gutenberg", "übersetzt von", "aus dem englischen", "anmerkungen zur transkription",
        "inhaltsverzeichnis", "inhalt", "król maciuś pierwszy powieść",
    )

    # Pre-scan: if the book already uses explicit numbered/Roman headings (>=5), disable the fuzzy single-line fallback
    explicit_heading_count = 0
    for rp in raw_paras:
        ls = [l.strip() for l in rp.splitlines() if l.strip()]
        if 1 <= len(ls) <= 2:
            j = re.sub(r"\s+", " ", " ".join(ls)).strip()
            if len(j) <= 110 and ROMAN_HEADING_RE.match(j):
                explicit_heading_count += 1
    allow_fuzzy_headings = explicit_heading_count < 5

    for rp in raw_paras:
        lines = [l.strip() for l in rp.splitlines() if l.strip()]
        if not lines:
            continue
        joined = re.sub(r"\s+", " ", " ".join(lines)).strip()
        low_j = joined.lower()

        # Skip metadata / ISBN / publisher headers anywhere near top
        if len(chapters) == 0 and len(cur_paras) == 0:
            if len(joined) < 120 and (
                any(w in low_j for w in meta_skip_words)
                or low_j in ("powieść", "erzählung", "roman", "eine indische dichtung", "detektivroman")
            ):
                continue

        # Detect chapter headings (short standalone lines matching Roman/numbered heading or ALL CAPS heading)
        is_roman_head = bool(ROMAN_HEADING_RE.match(joined))
        is_heading = (
            len(lines) <= 2
            and len(joined) <= (110 if is_roman_head else 65)
            and not any(w in low_j for w in meta_skip_words)
            and not any(q in joined for q in ("„", "“", "”", '"', "«", "»"))
            and (is_roman_head or not joined.endswith((",", ";", "?", "!")))
            and (
                is_roman_head
                or (len(joined) >= 4 and joined.isupper() and sum(c.isalpha() for c in joined) >= 3)
            )
        )
        # Fallback for books with plain-title chapters (e.g. Hesse's "Der Sohn des Brahmanen", "Bei den Samanas")
        if (
            allow_fuzzy_headings
            and not is_heading
            and len(lines) == 1
            and 4 <= len(joined) <= 45
            and len(joined.split()) <= 6
            and not any(w in low_j for w in meta_skip_words)
            and not any(q in joined for q in ("„", "“", "”", '"', "«", "»"))
            and not re.search(r"[.!?,;:»”\"—–-]$", joined)
            and joined[0].isupper()
            and len(cur_paras) >= 8
        ):
            is_heading = True

        if is_heading:
            if cur_paras:
                chapters.append((cur_title or f"Chapter {len(chapters) + 1}", cur_paras))
                cur_paras = []
                cur_title = joined
            else:
                cur_title = f"{cur_title} — {joined}".strip(" —") if cur_title and len(cur_title) <= 18 else joined
        else:
            if len(joined) >= 18:
                cur_paras.append(joined)

    if cur_paras:
        chapters.append((cur_title or f"Chapter {len(chapters) + 1}", cur_paras))

    # Drop tiny metadata pseudo-chapter at index 0 if there are real chapters after it
    if len(chapters) > 1 and len(chapters[0][1]) <= 2 and sum(len(p) for p in chapters[0][1]) < 260:
        chapters = chapters[1:]

    # Split any huge chapter (> 160 paragraphs, e.g. Korczak without explicit chapter headings) into balanced sections
    if len(chapters) <= 5 and any(len(ps) > 160 for _, ps in chapters):
        all_p = [p for _, ps in chapters for p in ps]
        step = 110
        chapters = [
            (f"Part {i // step + 1}", all_p[i : i + step])
            for i in range(0, len(all_p), step)
        ]

    # Clean ALL-CAPS chapter titles in Gutenberg texts (e.g. Hesse "DER SOHN DES BRAHMANEN")
    cleaned_chs: List[Tuple[str, List[str]]] = []
    small_words = {"der", "die", "das", "des", "dem", "den", "im", "am", "bei", "und", "zu", "in", "von", "mit", "aus"}
    for title, ps in chapters:
        t = title.strip().rstrip(".")
        if t.isupper() and len(t) > 5:
            ws = t.split()
            t = " ".join(
                w if re.match(r"^[IVXLCDM]+\.?$", w) else (w.lower() if idx_w > 0 and w.lower() in small_words else w.capitalize())
                for idx_w, w in enumerate(ws)
            )
        cleaned_chs.append((t, ps))
    return cleaned_chs


def split_paragraph_to_sentences(para: str) -> List[str]:
    """Split a paragraph into clean, natural sentences without breaking on abbreviations."""
    para = re.sub(r"\s+", " ", para).strip()
    if not para:
        return []

    parts: List[str] = []
    start = 0
    # Split after sentence-ending punctuation (+ optional closing quote, including Czech “) followed by space + uppercase/quote/dash/inverted Spanish ¡¿
    for m in re.finditer(r'([.!?…]+(?:[»”"“\'\)])?)\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÖÜĄĆĘŁŃÓŚŹŻÑ„«"—–¡¿-])', para):
        end_idx = m.end(1)
        cand = para[start:end_idx].strip()
        if ABBREV_RE.search(cand):
            continue
        if len(cand) < 12:
            continue
        parts.append(cand)
        start = m.end()

    tail = para[start:].strip()
    if tail:
        if parts and len(tail) < 18:
            parts[-1] = f"{parts[-1]} {tail}"
        else:
            parts.append(tail)

    # Filter out non-prose fragments and overly huge multi-clause run-ons
    cleaned: List[str] = []
    for s in parts:
        s = s.strip()
        alpha = sum(c.isalpha() for c in s)
        if alpha < 12 or len(s) > 360:
            continue
        # Ensure terminal punctuation so mergeSplitVerses treats each sentence cleanly (including Czech closing quote “)
        if s[-1] not in '.!?…»”"“\')':
            s = s.rstrip(",;:") + "."
        cleaned.append(s)
    return cleaned


def translate_batch(batch: Dict[str, str], lang_name: str, model_name: str) -> Dict[str, str]:
    sys_prompt = (
        f"You are an expert literary translator from {lang_name} to natural, faithful modern English. "
        "The user provides a JSON object mapping sentence IDs to source sentences. "
        "Translate each sentence directly and accurately into natural English, preserving tone and meaning. "
        "Return ONLY a valid JSON object mapping the exact input IDs to English translation strings (no notes, no extra keys)."
    )
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.0,
        "max_tokens": min(4096, max(1200, len(batch) * 140)),
        "reasoning_effort": "low",
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"].get("content")
    if not content:
        raise ValueError("Empty content")
    parsed = json.loads(content)
    return {k: str(parsed[k]).strip() for k in batch if isinstance(parsed.get(k), str) and str(parsed[k]).strip()}


def translate_batch_with_retry(batch: Dict[str, str], lang_name: str, model_name: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    rem = dict(batch)
    for _ in range(3):
        if not rem:
            break
        try:
            out.update(translate_batch(rem, lang_name, model_name))
            rem = {k: v for k, v in rem.items() if k not in out}
        except Exception:
            if len(rem) > 1:
                items = list(rem.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if not sub:
                        continue
                    try:
                        out.update(translate_batch(sub, lang_name, model_name))
                    except Exception:
                        pass
                rem = {k: v for k, v in rem.items() if k not in out}
            else:
                time.sleep(0.5)
    return out


def tag_sentences_cs(sentences: List[Tuple[int, int, str, str]]) -> List[List[list]]:
    from ufal.morphodita import Forms, Tagger, TaggedLemmas, TokenRanges
    import build_corpus_cs as cs_mod

    tagger = Tagger.load(str(cs_mod.TAGGER_PATH))
    assert tagger, f"Failed to load MorphoDiTa tagger at {cs_mod.TAGGER_PATH}"
    morpho = tagger.getMorpho()
    tokenizer = tagger.newTokenizer()
    forms_vec, lemmas_vec, tokens_vec, probe_vec = Forms(), TaggedLemmas(), TokenRanges(), TaggedLemmas()

    all_spans: List[List[list]] = []
    for _, _, text, _ in sentences:
        tlen = len(text)
        spans: List[list] = []
        tokenizer.setText(text)
        while tokenizer.nextSentence(forms_vec, tokens_vec):
            tagger.tag(forms_vec, lemmas_vec)
            for i in range(len(lemmas_vec)):
                start = tokens_vec[i].start
                end = start + tokens_vec[i].length
                if start < 0 or end > tlen:
                    continue
                if start > 0 and text[start - 1].isalpha():
                    continue
                if end < tlen and text[end].isalpha():
                    continue
                surf = text[start:end]
                raw_lem = lemmas_vec[i].lemma
                short_lem = morpho.rawLemma(raw_lem)
                tag = lemmas_vec[i].tag
                prev_txt = text[:start].rstrip()
                is_mid = bool(prev_txt and prev_txt[-1] not in ".!?:;„\"(«—–")
                res = cs_mod.classify_token(surf, raw_lem, short_lem, tag, is_mid, morpho, probe_vec)
                if res is not None:
                    lem, kind, is_base = res
                    spans.append([start, end, lem, kind, 1] if is_base else [start, end, lem, kind])
        all_spans.append(spans)
    return all_spans


def tag_sentences_pl(sentences: List[Tuple[int, int, str, str]]) -> List[List[list]]:
    import spacy
    import build_corpus as pl_mod

    nlp = spacy.load("pl_core_news_md", disable=["ner", "parser"])
    analyzer = pl_mod.PolishMorphAnalyzer()
    texts = [s[2] for s in sentences]
    all_spans: List[List[list]] = []
    for (_, _, _, en_text), doc in zip(sentences, nlp.pipe(texts, batch_size=256)):
        all_spans.append(pl_mod.extract_forms(doc, en_text, analyzer))
    return all_spans


def tag_sentences_de(sentences: List[Tuple[int, int, str, str]], model_name: str) -> List[List[list]]:
    import spacy
    import build_corpus_de as de_mod

    nlp = spacy.load("de_core_news_md", disable=["ner", "parser"])
    verb_lemmas: Dict[str, str] = (
        json.loads(de_mod.LEMMA_CACHE_PATH.read_text(encoding="utf-8"))
        if de_mod.LEMMA_CACHE_PATH.exists()
        else {}
    )
    noun_cache: Dict[str, str] = (
        json.loads(de_mod.NOUN_LEMMA_CACHE_PATH.read_text(encoding="utf-8"))
        if de_mod.NOUN_LEMMA_CACHE_PATH.exists()
        else {}
    )

    raw_toks: List[List[Tuple[int, int, str, str, str, bool]]] = []
    missing_verbs: Dict[str, str] = {}
    missing_nouns: Dict[str, str] = {}

    texts = [s[2] for s in sentences]
    for (_, _, de_text, _), doc in zip(sentences, nlp.pipe(texts, batch_size=256)):
        toks: List[Tuple[int, int, str, str, str, bool]] = []
        clause_ids: List[int] = []
        clause_has_aux: Dict[int, bool] = {}
        cid = 0
        for tok in doc:
            if tok.text in (",", ";", ":", ".", "!", "?"):
                cid += 1
            clause_ids.append(cid)
            if tok.tag_ in de_mod.AUX_TAGS:
                clause_has_aux[cid] = True

        for idx_t, tok in enumerate(doc):
            surf = tok.text
            if not de_mod.DE_WORD_RE.match(surf):
                continue
            start, end = tok.idx, tok.idx + len(surf)
            tag = tok.tag_
            s_low = surf.lower()

            if tag in de_mod.FINITE_VERB_TAGS and tok.pos_ in ("VERB", "AUX"):
                lem = verb_lemmas.get(s_low, "")
                if not lem:
                    if de_mod.is_valid_german_infinitive(s_low):
                        lem = s_low
                    else:
                        sp_l = tok.lemma_.lower()
                        if de_mod.is_valid_german_infinitive(sp_l):
                            lem = sp_l
                        elif s_low not in missing_verbs:
                            missing_verbs[s_low] = de_text[:120]
                toks.append((start, end, surf, "v", lem, lem == s_low))
            elif tag in de_mod.INF_VERB_TAGS and tok.pos_ in ("VERB", "AUX"):
                lem = verb_lemmas.get(s_low, "") or (
                    s_low if de_mod.is_valid_german_infinitive(s_low) else tok.lemma_.lower()
                )
                if de_mod.is_valid_german_infinitive(lem):
                    toks.append((start, end, surf, "v", lem, True))
            elif tag in de_mod.PARTICIPLE_TAGS and tok.pos_ in ("VERB", "AUX"):
                kind = (
                    "v"
                    if tag == "VVPP"
                    and s_low.endswith("t")
                    and not s_low.startswith("ge")
                    and not clause_has_aux.get(clause_ids[idx_t], False)
                    else "p"
                )
                lem = verb_lemmas.get(s_low, "")
                if not lem:
                    sp_l = tok.lemma_.lower()
                    if de_mod.is_valid_german_infinitive(sp_l):
                        lem = sp_l
                    elif s_low not in missing_verbs:
                        missing_verbs[s_low] = de_text[:120]
                toks.append((start, end, surf, kind, lem, False))
            elif tag in de_mod.ARTICLE_TAGS and tok.pos_ in ("DET", "PRON"):
                lem = de_mod.PRONOUN_LEMMAS.get(s_low)
                if lem:
                    toks.append((start, end, surf, "d", lem, lem == s_low))
            elif tag in de_mod.PRONOUN_TAGS and tok.pos_ in ("PRON", "DET"):
                lem = de_mod.PRONOUN_LEMMAS.get(s_low)
                if lem:
                    toks.append((start, end, surf, "r", lem, lem == s_low))
            elif tag == "ADJA" and tok.pos_ == "ADJ":
                lem = tok.lemma_.lower()
                if de_mod.DE_WORD_RE.match(lem):
                    toks.append((start, end, surf, "a", lem, lem == s_low))
            elif tag == "ADJD" and "Degree=Pos" in str(tok.morph):
                lem = tok.lemma_.lower()
                if de_mod.DE_WORD_RE.match(lem) and lem == s_low and len(lem) >= 3:
                    toks.append((start, end, surf, "a", lem, True))
            elif tag == "NN" and tok.pos_ == "NOUN":
                sp_lem = tok.lemma_
                if not de_mod.DE_WORD_RE.match(sp_lem):
                    continue
                if sp_lem.lower() == s_low and "Case=Dat" in str(tok.morph) and s_low.endswith("e") and len(s_low) >= 4:
                    if surf not in noun_cache and surf not in missing_nouns:
                        missing_nouns[surf] = de_text[:120]
                    toks.append((start, end, surf, "n", "", False))
                else:
                    toks.append((start, end, surf, "n", sp_lem, sp_lem.lower() == s_low))
        raw_toks.append(toks)

    if missing_verbs:
        v_prompt = (
            "You are a German linguist. Map each German conjugated verb or participle form in the input JSON "
            "to its standard lowercase German infinitive (ending in -en, -ern, -eln, sein, or tun). "
            "Return ONLY a valid JSON object mapping the exact input keys to lowercase German infinitives."
        )
        items = list(missing_verbs.items())
        batches = [dict(items[i : i + 30]) for i in range(0, len(items), 30)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            futs = [pool.submit(de_mod.lemmatize_generic_batch_with_retry, b, model_name, v_prompt) for b in batches]
            for f in concurrent.futures.as_completed(futs):
                for k, v in f.result().items():
                    if de_mod.is_valid_german_infinitive(v.lower()):
                        verb_lemmas[k] = v.lower()
        de_mod.LEMMA_CACHE_PATH.write_text(json.dumps(verb_lemmas, ensure_ascii=False, indent=2), encoding="utf-8")

    if missing_nouns:
        items = list(missing_nouns.items())
        batches = [dict(items[i : i + 30]) for i in range(0, len(items), 30)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            futs = [
                pool.submit(de_mod.lemmatize_generic_batch_with_retry, b, model_name, de_mod.ARCHAIC_NOUN_DATIVE_PROMPT)
                for b in batches
            ]
            for f in concurrent.futures.as_completed(futs):
                noun_cache.update(f.result())
        de_mod.NOUN_LEMMA_CACHE_PATH.write_text(json.dumps(noun_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    all_spans: List[List[list]] = []
    for toks in raw_toks:
        forms: List[list] = []
        for start, end, surf, kind, lem, is_base_hint in toks:
            s_low = surf.lower()
            if kind in ("v", "p"):
                resolved = lem or verb_lemmas.get(s_low, "")
                if not resolved or not de_mod.is_valid_german_infinitive(resolved):
                    continue
                is_base = is_base_hint or (resolved == s_low)
                forms.append([start, end, resolved, kind, 1] if is_base else [start, end, resolved, kind])
            elif kind == "n":
                resolved = lem or noun_cache.get(surf, "")
                if not resolved or not de_mod.DE_WORD_RE.match(resolved):
                    continue
                is_base = is_base_hint or (resolved.lower() == s_low)
                forms.append([start, end, resolved, "n", 1] if is_base else [start, end, resolved, "n"])
            else:
                if not lem:
                    continue
                is_base = is_base_hint or (lem.lower() == s_low)
                forms.append([start, end, lem, kind, 1] if is_base else [start, end, lem, kind])
        all_spans.append(forms)
    return all_spans


def tag_sentences_es(sentences: List[Tuple[int, int, str, str]], model_name: str) -> List[List[list]]:
    import build_corpus_es as es_mod

    return es_mod.tag_spanish_sentences([s[2] for s in sentences], model_name)


def build_book_glossary(lang: str, corpus_dir: Path, lang_desc: str, model_name: str) -> None:
    import build_glossary as gl_mod

    cache_path = ROOT / "raw_data" / f"glossary_{lang}.json"
    out_path = corpus_dir / "glossary.json"
    lemmas = gl_mod.collect_lemmas(corpus_dir)
    cache: Dict[str, str] = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    missing = {
        lem: {"pos": gl_mod.KIND_LABELS[k], "in": snippet}
        for lem, (k, snippet) in lemmas.items()
        if lem not in cache
    }
    print(f"  [glossary] {len(lemmas)} unique lemmas ({len(cache)} cached, {len(missing)} new)...", flush=True)
    if missing:
        sys_prompt = gl_mod.make_system_prompt(lang_desc)
        items = list(missing.items())
        batches = [dict(items[i : i + 40]) for i in range(0, len(items), 40)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            futs = [pool.submit(gl_mod.call_batch_with_retry, b, model_name, sys_prompt) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                cache.update(fut.result())
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    final_gl = {lem: cache[lem] for lem in sorted(lemmas) if lem in cache}
    out_path.write_text(json.dumps(final_gl, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  [glossary] Wrote {out_path.relative_to(ROOT)} ({len(final_gl)}/{len(lemmas)} glossed)", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a VERBA quiz corpus from any .txt or .epub book.")
    parser.add_argument("--lang", required=True, choices=["pl", "de", "cs", "es"])
    parser.add_argument("--id", required=True, help="Corpus folder ID (e.g. cs-capek-kapsa)")
    parser.add_argument("--title", required=True, help="Native book title")
    parser.add_argument("--en-title", required=True, help="English book title")
    parser.add_argument("--author", required=True, help="Author name")
    parser.add_argument("--source-tag", default="", help="Short translation badge (e.g. 'ČAPEK → EN')")
    parser.add_argument("--input", required=True, help="Path to .txt or .epub file")
    parser.add_argument("--max-chapters", type=int, default=0, help="Optional cap on chapters (0 = all)")
    args = parser.parse_args()

    t0 = time.time()
    in_path = Path(args.input)
    if not in_path.exists():
        raise FileNotFoundError(in_path)

    lang_name, categories = LANG_META[args.lang]
    print(f"=== Building [{args.id}] ({lang_name}): {args.title} by {args.author} ===", flush=True)

    if in_path.suffix.lower() == ".epub":
        raw_chapters = parse_epub_chapters(in_path)
    else:
        raw_chapters = parse_txt_chapters(in_path)

    if args.max_chapters > 0:
        raw_chapters = raw_chapters[: args.max_chapters]

    # Segment into clean sentences per chapter
    es_norm = None
    if args.lang == "es":
        import build_corpus_es as es_mod
        es_norm = es_mod.normalize_spanish_orthography
    chapter_sents: List[Tuple[str, List[str]]] = []
    for ch_title, paras in raw_chapters:
        sents: List[str] = []
        for p in paras:
            for s in split_paragraph_to_sentences(p):
                sents.append(es_norm(s) if es_norm else s)
        if len(sents) >= 3:
            chapter_sents.append((ch_title, sents))

    total_sents = sum(len(s) for _, s in chapter_sents)
    print(f"  Parsed {len(chapter_sents)} chapters, {total_sents} clean sentences ({time.time() - t0:.1f}s)", flush=True)

    # Cache translations by source sentence text so chapter re-chunking reuses 100% of cached translations!
    trans_cache_path = ROOT / "raw_data" / f"translations_{args.id}.json"
    trans_cache: Dict[str, str] = (
        json.loads(trans_cache_path.read_text(encoding="utf-8")) if trans_cache_path.exists() else {}
    )
    # Also index any previously built chunk sentences -> EN so chapter shifts never waste translations
    old_chunks_dir = ROOT / "public" / "data" / args.id / "chunks"
    if old_chunks_dir.exists():
        for cp in sorted(old_chunks_dir.glob("*.json")):
            for e in json.loads(cp.read_text(encoding="utf-8")):
                if e.get("o") and e.get("t"):
                    trans_cache.setdefault(e["o"], e["t"])
                    trans_cache.setdefault(e["o"].rstrip("."), e["t"])
    missing_trans: Dict[str, str] = {}
    for ci, (_, sents) in enumerate(chapter_sents, 1):
        for si, s in enumerate(sents, 1):
            if s not in trans_cache and f"{ci}:{si}" not in trans_cache:
                missing_trans[s] = s

    model_name = resolve_model()
    if missing_trans:
        print(f"  Translating {len(missing_trans)} sentences ({len(trans_cache)} cached)...", flush=True)
        unique_sents = list(missing_trans.keys())
        # Use short numeric keys ("0".."19") so the model never wastes output tokens echoing full source sentences
        batches = [
            {str(j): s for j, s in enumerate(unique_sents[i : i + 20])}
            for i in range(0, len(unique_sents), 20)
        ]
        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=28) as pool:
            fut_to_batch = {
                pool.submit(translate_batch_with_retry, b, lang_name, model_name): b
                for b in batches
            }
            for fut in concurrent.futures.as_completed(fut_to_batch):
                orig_batch = fut_to_batch[fut]
                for idx_k, en_val in fut.result().items():
                    src_s = orig_batch.get(idx_k)
                    if src_s and en_val:
                        trans_cache[src_s] = en_val
                done += 1
                if done % 25 == 0 or done == len(batches):
                    trans_cache_path.parent.mkdir(parents=True, exist_ok=True)
                    trans_cache_path.write_text(json.dumps(trans_cache, ensure_ascii=False, indent=2), encoding="utf-8")
                    print(f"    [{done}/{len(batches)}] translated ({time.time() - t0:.1f}s)", flush=True)

    # Flatten for morphological tagging
    flat: List[Tuple[int, int, str, str]] = []
    for ci, (_, sents) in enumerate(chapter_sents, 1):
        for si, s in enumerate(sents, 1):
            en = (trans_cache.get(s) or trans_cache.get(s.rstrip(".")) or trans_cache.get(f"{ci}:{si}", "")).strip()
            if en:
                flat.append((ci, si, s, en))

    print(f"  Tagging {len(flat)} {lang_name} sentences...", flush=True)
    if args.lang == "cs":
        all_spans = tag_sentences_cs(flat)
    elif args.lang == "pl":
        all_spans = tag_sentences_pl(flat)
    elif args.lang == "es":
        all_spans = tag_sentences_es(flat, model_name)
    else:
        all_spans = tag_sentences_de(flat, model_name)

    # Clear stale chunk files before writing fresh chapter chunks
    out_dir = ROOT / "public" / "data" / args.id
    chunks_dir = out_dir / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    for stale in chunks_dir.glob("*.json"):
        stale.unlink()

    by_ch: Dict[int, List[dict]] = {ci: [] for ci in range(1, len(chapter_sents) + 1)}
    counts = {k: 0 for k in categories}
    quiz_sents = 0

    for (ci, si, orig, en), spans in zip(flat, all_spans):
        if not spans:
            continue
        by_ch[ci].append({"c": ci, "v": si, "o": orig, "t": en, "m": spans})
        quiz_sents += 1
        for sp in spans:
            if len(sp) < 5 and sp[3] in counts:
                counts[sp[3]] += 1

    manifest_books = []
    for ci, (ch_title, _) in enumerate(chapter_sents, 1):
        entries = by_ch[ci]
        if not entries:
            continue
        ch_id = f"ch{ci}"
        chunk_rel = f"chunks/{ci:02d}-{ch_id}.json"
        (out_dir / chunk_rel).write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        # Shorten overly verbose chapter titles for crisp Swiss reference display
        clean_title = ch_title if len(ch_title) <= 44 else ch_title[:42].rstrip() + "…"
        manifest_books.append({
            "index": len(manifest_books),
            "id": ch_id,
            "nativeName": f"{args.title} · {clean_title}",
            "enName": args.en_title,
            "chunkFile": chunk_rel,
            "verseCount": len(entries),
        })

    src_tag = args.source_tag or f"{args.lang.upper()} → EN"
    manifest = {
        "id": args.id,
        "language": args.lang,
        "title": args.title,
        "subtitle": f"{args.author} · Direct English",
        "translationSource": src_tag,
        "unit": "sentence",
        "totalVerses": total_sents,
        "quizVerses": quiz_sents,
        "totalVerbs": counts["v"],
        "categories": categories,
        "formCounts": counts,
        "books": manifest_books,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Build per-corpus glossary (reusing existing language glossary cache!)
    lang_desc = f"{lang_name} literature ({args.author}, {args.title})"
    build_book_glossary(args.lang, out_dir, lang_desc, model_name)

    print(
        f"=== Done [{args.id}] in {time.time() - t0:.1f}s | {quiz_sents}/{total_sents} sentences | {len(manifest_books)} chapters | Inflected: {counts} ===\n",
        flush=True,
    )


if __name__ == "__main__":
    main()
