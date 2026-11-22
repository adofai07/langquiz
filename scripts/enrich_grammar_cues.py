"""
Enrich VERBA corpus chunk spans with minimal, NLP-verified grammatical disambiguation
cues ONLY for features that English translations cannot express (speaker/addressee
gender in Slavic past/conditional/participles, virile vs non-virile plural "they",
singular/plural/formal "you", and predicative/pronoun gender in Spanish).

Span tuple schema (backwards-compatible):
  - Without cue: [start, end, lemma, kind] or [start, end, lemma, kind, 1]
  - With cue:    [start, end, lemma, kind, 0|1, cue]

Compact cue codes (rendered into concise Swiss badges by `src/services/grammarCue.ts`):
  m    -> m.           (masculine singular)
  f    -> f.           (feminine singular)
  n    -> n.           (neuter singular)
  mp   -> m.pl.        (masculine / virile plural)
  fp   -> non-m.pl. / f.pl.  (non-masculine-personal plural in PL/CS; feminine plural in ES)
  np   -> n.pl.        (neuter plural)
  2s   -> sg.          (2nd-person singular "you")
  2sm  -> m.sg.        (2nd-person singular masculine "you")
  2sf  -> f.sg.        (2nd-person singular feminine "you")
  2sn  -> n.sg.        (2nd-person singular neuter "you")
  2p   -> pl.          (2nd-person plural "you")
  2pm  -> m.pl.        (2nd-person plural masculine "you")
  2pf  -> non-m.pl. / f.pl.
  fs   -> formal       (formal singular "you": usted / vykání / Sie)
  fsm  -> formal m.    (formal singular masculine "you", e.g. Czech vykání "viděl jste")
  fsf  -> formal f.    (formal singular feminine "you", e.g. Czech vykání "viděla jste")
  fp2  -> formal pl.   (formal plural "you": ustedes)
  pl   -> pl.          (generic plural, e.g. plural Czech transgressive)
  inf  -> inf.         (infinitive in Polish compound future, e.g. "będziecie jeść" vs "jedli/jadły")
"""

from __future__ import annotations

import argparse
import json
import random
import re
import time
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"

EN_THEY_RE = re.compile(r"\b(?:they|them|themselves|those)\b", re.I)
EN_YOU_RE = re.compile(r"\b(?:you|your|yours|yourself|yourselves|ye|thou|thee|thy|thine)\b", re.I)
EN_YOU_SG_ARCHAIC_RE = re.compile(r"\b(?:thou|thee|thy|thine|thyself)\b", re.I)
EN_HER_THEIR_RE = re.compile(r"\b(?:her|hers|herself|their|theirs|themselves|she|they)\b", re.I)
EN_WE_RE = re.compile(r"\b(?:we|us|ourselves|our|ours)\b", re.I)
EN_3RD_SUBJ_RE = re.compile(r"\b(?:he|she|it|they|him|her|his|its|their)\b", re.I)


def set_span_cue(span: list, cue: Optional[str]) -> list:
    """Return normalized span tuple with or without optional 6th cue field."""
    s, e, lemma = span[0], span[1], span[2]
    kind = span[3] if len(span) > 3 else "v"
    is_base = 1 if (len(span) > 4 and bool(span[4])) else 0
    if cue:
        return [s, e, lemma, kind, is_base, cue]
    if is_base:
        return [s, e, lemma, kind, 1]
    return [s, e, lemma, kind]


# =============================================================================
# 1. POLISH (Morfeusz2)
# =============================================================================

PL_2SG_PRONS = {
    "ty", "cię", "ciebie", "ci", "tobą", "tobie",
    "twój", "twoja", "twoje", "twego", "twojego", "twej", "twojej",
    "twemu", "twojemu", "twym", "twoim", "twą", "twoją",
    "twoi", "twych", "twoich", "twymi", "twoimi",
}
PL_2PL_PRONS = {
    "wy", "was", "wam", "wami",
    "wasz", "wasza", "wasze", "waszego", "waszej", "waszemu",
    "waszym", "waszą", "wasi", "waszych", "waszymi",
}
PL_COPULA_12 = {
    "jestem", "byłem", "byłam", "byłom", "będę", "zostałem", "zostałam",
    "jesteś", "byłeś", "byłaś", "byłoś", "będziesz", "zostałeś", "zostałaś",
    "jesteśmy", "byliśmy", "byłyśmy", "będziemy", "zostaliśmy", "zostałyśmy",
    "jesteście", "byliście", "byłyście", "będziecie", "zostaliście", "zostałyście",
}
PL_COPULA_PRESENT_12 = {"jestem", "jesteś", "jesteśmy", "jesteście", "będę", "będziesz", "będziemy", "będziecie"}


class PolishCueTagger:
    def __init__(self) -> None:
        import morfeusz2
        self.morf = morfeusz2.Morfeusz()
        self._word_cache: Dict[str, List[Tuple[int, int, str, str, str]]] = {}

    def analyse_word(self, word: str) -> List[Tuple[int, int, str, str, str]]:
        res = self._word_cache.get(word)
        if res is None:
            res = [(a[0], a[1], a[2][0], a[2][1].split(":")[0].lower(), a[2][2]) for a in self.morf.analyse(word)]
            self._word_cache[word] = res
        return res

    @staticmethod
    def _praet_gender(tag: str) -> Optional[Tuple[str, str]]:
        # Returns (num, gender_code) where num in ('sg', 'pl') and gender in ('m', 'f', 'n', 'mp', 'fp')
        parts = tag.split(":")
        if len(parts) < 3 or parts[0] != "praet":
            return None
        num = parts[1]
        g = parts[2]
        if num == "sg":
            if "m1" in g or "m2" in g or "m3" in g:
                return ("sg", "m")
            if g == "f" or ".f" in g or "f." in g:
                return ("sg", "f")
            if g == "n" or ".n" in g or "n." in g:
                return ("sg", "n")
        elif num == "pl":
            if g == "m1":
                return ("pl", "mp")
            if "f" in g or "m2" in g or "n" in g:
                return ("pl", "fp")
        return None

    def _find_sentence_mobile_aglt(self, text: str) -> List[Tuple[int, str, str]]:
        """Find floating Polish mobile clitics (aglt) attached to non-verb tokens (e.g. 'gdybym', 'abyś', 'żeśmy')."""
        found: List[Tuple[int, str, str]] = []
        for m in re.finditer(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+", text):
            tok = m.group(0)
            tl = tok.lower()
            if not re.search(r"(?:bym|byś|byśmy|byście|żem|żeś|śmy|ście|em|eś)$", tl):
                continue
            analyses = self.analyse_word(tok)
            # Only count floating clitics NOT attached to a praet verb itself
            has_praet = any(a[4].startswith("praet:") for a in analyses)
            if has_praet:
                continue
            for _, _, _, _, tag in analyses:
                if tag.startswith("aglt:"):
                    parts = tag.split(":")
                    if len(parts) >= 3 and parts[1] in ("sg", "pl") and parts[2] in ("pri", "sec"):
                        found.append((m.start(), parts[1], parts[2]))
                        break
        return found

    def tag_entry(self, entry: dict) -> List[list]:
        text: str = entry["o"]
        trans: str = entry.get("t", "")
        spans: list = entry["m"]
        if not spans:
            return spans

        has_they_en = bool(EN_THEY_RE.search(trans))
        mobile_aglts = self._find_sentence_mobile_aglt(text)
        tokens_low = set(re.findall(r"[a-ząćęłńóśźż]+", text.lower()))
        has_pres_copula_12 = bool(tokens_low & PL_COPULA_PRESENT_12)

        # Find compound-future 'być' auxiliaries (będę/będziesz/będzie/będziemy/będziecie/będą)
        # for disambiguating Polish compound future: "będziecie jeść" (inf.) vs "będziecie jedli" (m.pl.) / "jadły" (non-m.pl.)
        bedzie_aux: List[Tuple[int, str]] = []
        for m_tok in re.finditer(r"\b(będę|będziesz|będzie|będziemy|będziecie|będą)\b", text, re.I):
            w_aux = m_tok.group(1).lower()
            a_num = "sg" if w_aux in ("będę", "będziesz", "będzie") else "pl"
            bedzie_aux.append((m_tok.start(), a_num))

        # Detect overt nominative plural nouns in sentence to avoid redundant 3pl cues
        has_nom_pl_noun = False
        if has_they_en:
            for sp in spans:
                k = sp[3] if len(sp) > 3 else "v"
                if k == "n":
                    w = text[sp[0] : sp[1]]
                    if any("subst:pl:" in a[4] and "nom" in a[4] for a in self.analyse_word(w)):
                        has_nom_pl_noun = True
                        break

        out: List[list] = []
        for sp in spans:
            s, e, lemma = sp[0], sp[1], sp[2]
            kind = sp[3] if len(sp) > 3 else "v"
            is_base = len(sp) > 4 and bool(sp[4])
            surf = text[s:e]
            wl = surf.lower()
            lem_low = lemma.lower()
            cue: Optional[str] = None

            if kind == "v" and is_base:
                # Infinitive in Polish compound future (e.g. "będziecie jeść" vs "będziecie jedli/jadły")
                if bedzie_aux:
                    clause_start = max(
                        text.rfind(".", 0, s),
                        text.rfind("!", 0, s),
                        text.rfind("?", 0, s),
                        text.rfind(";", 0, s),
                        text.rfind(":", 0, s),
                        text.rfind(",", 0, s),
                        text.rfind("—", 0, s),
                    )
                    clause_end_candidates = [
                        p for ch in (".", "!", "?", ";", ":", ",", "—") if (p := text.find(ch, e)) != -1
                    ]
                    clause_end = min(clause_end_candidates) if clause_end_candidates else len(text)
                    # Only if a 'będę/będziesz/...' precedes in same clause (within 45 chars) or immediately follows (<= 15 chars)
                    if any(
                        clause_start < pos < clause_end and ((pos < s and s - pos <= 45) or (pos > e and pos - e <= 15))
                        for pos, _ in bedzie_aux
                    ):
                        analyses = self.analyse_word(surf)
                        if any(a[4].startswith("inf:") for a in analyses):
                            cue = "inf"

            elif kind == "v" and not is_base:
                analyses = self.analyse_word(surf)
                # Filter to analyses matching our lemma (or any praet/fin/impt if lemma spelling differs slightly)
                matched = [a for a in analyses if a[3] == lem_low]
                if not matched:
                    matched = analyses

                praet_tags = [a[4] for a in matched if a[4].startswith("praet:")]
                aglt_tags = [a[4] for a in analyses if a[4].startswith("aglt:")]
                fin_tags = [a[4] for a in matched if a[4].startswith("fin:") or a[4].startswith("bedzie:")]
                impt_tags = [a[4] for a in matched if a[4].startswith("impt:")]

                if praet_tags and aglt_tags:
                    # Fused 1st/2nd person past or conditional (Chciałem, zrobiłaś, chcieliśmy, zrobilibyście)
                    pg = self._praet_gender(praet_tags[0])
                    ap = aglt_tags[0].split(":")
                    if pg and len(ap) >= 3:
                        num, gen = pg
                        pers = ap[2]
                        if pers == "pri":
                            cue = gen  # m, f, n, mp, fp
                        elif pers == "sec":
                            cue = {"m": "2sm", "f": "2sf", "n": "2sn", "mp": "2pm", "fp": "2pf"}.get(gen)
                elif praet_tags and not aglt_tags:
                    # Standalone praet (either 3rd person, OR split-clitic 1st/2nd person like "gdybym chciał")
                    # A verb with its own fused 'by' (e.g. "pokryłaby", "godziłoby") is 3rd-person conditional, never split-aglt.
                    has_own_by = any(a[4].startswith("part") and a[2].lower() == "by" for a in analyses) or wl.endswith(("łby", "łaby", "łoby", "liby", "łyby"))
                    pg = self._praet_gender(praet_tags[0])
                    if pg:
                        num, gen = pg
                        # Check for preceding floating aglt in same comma-delimited clause matching number
                        # (Never attach 1st/2nd sg floating aglt to impersonal neuter 'było' etc.)
                        clause_start = max(
                            text.rfind(".", 0, s),
                            text.rfind("!", 0, s),
                            text.rfind("?", 0, s),
                            text.rfind(";", 0, s),
                            text.rfind(":", 0, s),
                            text.rfind(",", 0, s),
                            text.rfind("—", 0, s),
                        )
                        nearby_aglt = None
                        if not has_own_by and gen != "n":
                            for pos, a_num, a_pers in reversed(mobile_aglts):
                                if clause_start < pos < s and a_num == num:
                                    nearby_aglt = (a_num, a_pers)
                                    break
                        if nearby_aglt:
                            _, pers = nearby_aglt
                            if pers == "pri":
                                cue = gen
                            elif pers == "sec":
                                cue = {"m": "2sm", "f": "2sf", "n": "2sn", "mp": "2pm", "fp": "2pf"}.get(gen)
                        elif not has_own_by and bedzie_aux:
                            # Compound future l-participle ("będziecie jedli" vs "będziecie jeść" / "jadły")
                            clause_end_candidates = [
                                p for ch in (".", "!", "?", ";", ":", ",", "—") if (p := text.find(ch, e)) != -1
                            ]
                            clause_end = min(clause_end_candidates) if clause_end_candidates else len(text)
                            if any(
                                clause_start < pos < clause_end
                                and a_num == num
                                and ((pos < s and s - pos <= 45) or (pos > e and pos - e <= 15))
                                for pos, a_num in bedzie_aux
                            ):
                                cue = gen
                        elif num == "pl" and has_they_en and not has_nom_pl_noun:
                            # 3pl past/cond ("poszli" vs "poszły") when English says "they"
                            cue = gen  # mp or fp
                elif fin_tags or impt_tags:
                    # 2nd-person present/future/imperative ("wiesz" vs "wiecie", "idź" vs "idźcie")
                    # Only tag if unambiguous 2nd person (not homographic with 3rd person)
                    v_tags = fin_tags + impt_tags
                    persons = {t.split(":")[2] for t in v_tags if len(t.split(":")) >= 3}
                    nums = {t.split(":")[1] for t in v_tags if len(t.split(":")) >= 3}
                    if persons == {"sec"} and len(nums) == 1:
                        num = next(iter(nums))
                        if num == "sg":
                            cue = "2s"
                        elif num == "pl":
                            cue = "2p"

            elif kind == "r":
                if wl in PL_2SG_PRONS or lem_low in ("ty", "twój"):
                    cue = "2s"
                elif wl in PL_2PL_PRONS or lem_low in ("wy", "wasz"):
                    cue = "2p"
                elif wl == "oni" and has_they_en:
                    cue = "mp"
                elif wl == "one" and has_they_en:
                    cue = "fp"

            elif kind in ("a", "p") and not is_base and has_pres_copula_12:
                # Predicative adjective/participle with present/future 1st/2nd copula ("Jestem gotowa", "Jesteśmy gotowi")
                # Only if NOT directly adjacent to a noun in spans
                is_adj_to_noun = False
                for other in spans:
                    ok = other[3] if len(other) > 3 else "v"
                    if ok == "n" and (abs(other[0] - e) <= 2 or abs(s - other[1]) <= 2):
                        is_adj_to_noun = True
                        break
                if not is_adj_to_noun:
                    analyses = self.analyse_word(surf)
                    nom_tags = [
                        a[4]
                        for a in analyses
                        if (a[4].startswith("adj:") or a[4].startswith("ppas:")) and ":nom" in a[4]
                    ]
                    if nom_tags:
                        t0 = nom_tags[0]
                        parts = t0.split(":")
                        if len(parts) >= 4:
                            num, g = parts[1], parts[3]
                            if num == "sg":
                                if g == "f":
                                    cue = "f"
                                elif g == "n":
                                    cue = "n"
                                elif "m1" in g:
                                    cue = "m"
                            elif num == "pl":
                                if g == "m1":
                                    cue = "mp"
                                elif "f" in g or "m2" in g:
                                    cue = "fp"

            out.append(set_span_cue(sp, cue))
        return out


# =============================================================================
# 2. CZECH (MorphoDiTa)
# =============================================================================

CS_TAGGER_PATH = (
    ROOT
    / "raw_data"
    / "morphodita-cs"
    / "czech-morfflex2.0-pdtc1.0-220710"
    / "czech-morfflex2.0-pdtc1.0-220710.tagger"
)

CS_AUX_MAP = {
    "jsem": ("sg", "1"),
    "sem": ("sg", "1"),
    "bych": ("sg", "1"),
    "jsi": ("sg", "2"),
    "jseš": ("sg", "2"),
    "ses": ("sg", "2"),
    "sis": ("sg", "2"),
    "bys": ("sg", "2"),
    "jsme": ("pl", "1"),
    "bychom": ("pl", "1"),
    "bysme": ("pl", "1"),
    "jste": ("pl", "2"),
    "byste": ("pl", "2"),
}
CS_PRES_COPULA_12 = {"jsem", "jsi", "jseš", "jsme", "jste", "budu", "budeš", "budeme", "budete", "bych", "bys", "bychom", "byste"}
CS_2SG_PRONS = {"ty", "tě", "tebe", "ti", "tobě", "tebou", "tvůj", "tvá", "tvé", "tvého", "tvému", "tvém", "tvým", "tvou", "tvých", "tvými", "tvoje", "tvojí", "tvoji"}
CS_2PL_PRONS = {"vy", "vás", "vám", "vámi", "váš", "vaše", "vašeho", "vašemu", "vašem", "vaším", "vaši", "vaší", "vašich", "vašimi"}


class CzechCueTagger:
    def __init__(self) -> None:
        from ufal.morphodita import Forms, Tagger, TaggedLemmas, TokenRanges
        self.Forms = Forms
        self.TaggedLemmas = TaggedLemmas
        self.TokenRanges = TokenRanges
        self.tagger = Tagger.load(str(CS_TAGGER_PATH))
        self.tokenizer = self.tagger.newTokenizer()

    def _tokenize_and_tag(self, text: str) -> List[Tuple[int, int, str, str, str]]:
        """Return list of (start, end, form, short_lemma, pdt_tag)."""
        self.tokenizer.setText(text)
        forms = self.Forms()
        lemmas = self.TaggedLemmas()
        tokens = self.TokenRanges()
        out: List[Tuple[int, int, str, str, str]] = []
        while self.tokenizer.nextSentence(forms, tokens):
            self.tagger.tag(forms, lemmas)
            for form, lem, tr in zip(forms, lemmas, tokens):
                s = tr.start
                e = tr.start + tr.length
                short_lem = re.split(r"[-_`^]", lem.lemma, maxsplit=1)[0]
                out.append((s, e, form, short_lem, lem.tag))
        return out

    @staticmethod
    def _clause_id_map(toks: List[Tuple[int, int, str, str, str]]) -> List[int]:
        """Assign clause IDs splitting on punctuation (including commas) and subordinators."""
        cids: List[int] = []
        cid = 0
        for _, _, form, _, tag in toks:
            fl = form.lower()
            if form in (".", "!", "?", ";", ":", ",", "—", "–") or fl in ("že", "když", "protože", "aby", "abych", "abys", "abychom", "abyste", "kdyby", "kdybych", "kdybys", "kdybychom", "kdybyste", "jestliže", "poněvadž", "neboť"):
                cid += 1
            cids.append(cid)
        return cids

    def tag_entry(self, entry: dict) -> List[list]:
        text: str = entry["o"]
        trans: str = entry.get("t", "")
        spans: list = entry["m"]
        if not spans:
            return spans

        toks = self._tokenize_and_tag(text)
        cids = self._clause_id_map(toks)
        by_pos = {(s, e): (idx, form, lem, tag) for idx, (s, e, form, lem, tag) in enumerate(toks)}
        has_they_en = bool(EN_THEY_RE.search(trans))

        # Per-clause auxiliaries (including fused abych/abys/kdybych/kdybys/ses/sis)
        clause_aux: Dict[int, List[Tuple[int, str, str]]] = {}
        clause_has_sg_vp: Dict[int, bool] = {}
        clause_has_nom_pl_noun: Dict[int, bool] = {}
        clause_has_pres_cop12: Dict[int, bool] = {}

        for idx, (_, _, form, _, tag) in enumerate(toks):
            cid = cids[idx]
            fl = form.lower()
            if fl in CS_AUX_MAP:
                clause_aux.setdefault(cid, []).append((idx, CS_AUX_MAP[fl][0], CS_AUX_MAP[fl][1]))
            elif fl in ("abych", "kdybych"):
                clause_aux.setdefault(cid, []).append((idx, "sg", "1"))
            elif fl in ("abys", "kdybys"):
                clause_aux.setdefault(cid, []).append((idx, "sg", "2"))
            elif fl in ("abychom", "kdybychom", "abysme", "kdybysme"):
                clause_aux.setdefault(cid, []).append((idx, "pl", "1"))
            elif fl in ("abyste", "kdybyste"):
                clause_aux.setdefault(cid, []).append((idx, "pl", "2"))

            if fl in CS_PRES_COPULA_12:
                clause_has_pres_cop12[cid] = True

            if tag.startswith("Vp") and len(tag) >= 4:
                # Singular l-participle (VpYS, VpMS, VpIS, VpNS, or VpQW = fem.sg/neut.pl)
                if tag[3] == "S" or tag[2:4] == "QW":
                    clause_has_sg_vp[cid] = True

            if tag.startswith("NN") and len(tag) >= 5 and tag[3] == "P" and tag[4] == "1":
                clause_has_nom_pl_noun[cid] = True

        out: List[list] = []
        for sp in spans:
            s, e, lemma = sp[0], sp[1], sp[2]
            kind = sp[3] if len(sp) > 3 else "v"
            is_base = len(sp) > 4 and bool(sp[4])
            surf = text[s:e]
            wl = surf.lower()
            lem_low = lemma.lower()
            cue: Optional[str] = None

            tok_info = by_pos.get((s, e))
            if not tok_info:
                out.append(set_span_cue(sp, None))
                continue

            idx, _, _, tag = tok_info
            cid = cids[idx]
            t2 = tag[:2]

            if kind == "v" and not is_base:
                if t2 == "Vp" and len(tag) >= 4:
                    g, num = tag[2], tag[3]
                    aux_list = clause_aux.get(cid, [])
                    # Prefer closest aux in clause (within 8 tokens)
                    nearest_aux = None
                    if aux_list:
                        nearest_aux = min(aux_list, key=lambda x: abs(x[0] - idx))
                        if abs(nearest_aux[0] - idx) > 10:
                            nearest_aux = None

                    if nearest_aux:
                        _, a_num, a_pers = nearest_aux
                        if a_pers == "1" and a_num == "sg":
                            if num == "S" or g == "Q":
                                if g in ("Y", "M", "I"):
                                    cue = "m"
                                elif g in ("Q", "F", "H"):
                                    cue = "f"
                        elif a_pers == "2" and a_num == "sg":
                            if num == "S" or g == "Q":
                                if g in ("Y", "M", "I"):
                                    cue = "2sm"
                                elif g in ("Q", "F", "H"):
                                    cue = "2sf"
                        elif a_pers == "1" and a_num == "pl":
                            if num == "P":
                                if g == "M":
                                    cue = "mp"
                                elif g in ("T", "F", "I"):
                                    cue = "fp"
                        elif a_pers == "2" and a_num == "pl":
                            # Czech vykání: "viděl jste" (sg participle + pl aux = formal sg!)
                            if num == "S" or g == "Q":
                                if g in ("Y", "M", "I"):
                                    cue = "fsm"
                                elif g in ("Q", "F", "H"):
                                    cue = "fsf"
                            elif num == "P":
                                if g == "M":
                                    cue = "2pm"
                                elif g in ("T", "F", "I"):
                                    cue = "2pf"
                    else:
                        # 3rd person plural past when English has "they" and no overt nom.pl noun in clause
                        if num == "P" and has_they_en and not clause_has_nom_pl_noun.get(cid):
                            if g == "M":
                                cue = "mp"
                            elif g in ("T", "F", "I"):
                                cue = "fp"

                elif t2 in ("VB", "Vi", "Vc", "Vt", "Vq") and len(tag) >= 8 and tag[7] == "2":
                    num = tag[3]
                    if num == "S":
                        cue = "2s"
                    elif num == "P":
                        # Check vykání (jste/byste with singular l-participle in same clause)
                        if wl in ("jste", "byste") and clause_has_sg_vp.get(cid):
                            cue = "fs"
                        else:
                            cue = "2p"

            elif kind == "t" and t2 in ("Ve", "Vm") and len(tag) >= 4:
                # Czech transgressive: gender/number agreement
                g, num = tag[2], tag[3]
                if num == "S":
                    if g in ("Y", "M", "I"):
                        cue = "m"
                    elif g in ("H", "F", "Q"):
                        cue = "f"
                elif num == "P":
                    cue = "pl"

            elif kind == "r":
                if wl in CS_2SG_PRONS or lem_low in ("ty", "tvůj"):
                    cue = "2s"
                elif wl in CS_2PL_PRONS or lem_low in ("vy", "váš"):
                    if clause_has_sg_vp.get(cid):
                        cue = "fs"
                    else:
                        cue = "2p"
                elif wl == "oni" and has_they_en:
                    cue = "mp"
                elif wl == "ony" and has_they_en:
                    cue = "fp"

            elif kind in ("a", "p") and not is_base and clause_has_pres_cop12.get(cid):
                # Predicative short adj/passive participle (Jsem připraven / připravena / rád / ráda)
                if t2 in ("Vs", "AC", "AA") and len(tag) >= 5 and (tag[4] in ("1", "-")):
                    is_adj_to_noun = any(
                        (other[3] if len(other) > 3 else "v") == "n"
                        and (abs(other[0] - e) <= 2 or abs(s - other[1]) <= 2)
                        for other in spans
                    )
                    if not is_adj_to_noun:
                        g, num = tag[2], tag[3]
                        if num == "S":
                            if g in ("Y", "M", "I"):
                                cue = "m"
                            elif g in ("Q", "F", "H"):
                                cue = "f"
                            elif g == "N":
                                cue = "n"
                        elif num == "P":
                            if g == "M":
                                cue = "mp"
                            elif g in ("T", "F", "I"):
                                cue = "fp"

            out.append(set_span_cue(sp, cue))
        return out


# =============================================================================
# 3. SPANISH (Deterministic morphology + context verification)
# =============================================================================

ES_2PL_EXACT = {
    "sois", "vais", "veis", "dais", "estáis", "habéis", "oís", "reís", "freís", "sonreís",
    "id", "sed", "dad", "ved", "oíd", "oid", "decid", "haced", "tened", "poned", "salid",
    "sabed", "traed", "venid", "caed", "creed", "leed", "poseed", "proveed",
}
ES_2PL_END_RE = re.compile(
    r"(?:áis|éis|ís|abais|íais|asteis|isteis|ísteis|arais|aseis|ierais|ieseis|areis|iereis)$"
)
ES_2SG_IRREG_IMP = {
    ("ven", "venir"), ("ten", "tener"), ("pon", "poner"), ("sal", "salir"),
    ("haz", "hacer"), ("ve", "ir"), ("sé", "ser"),
}
ES_2SG_EXACT = {"eres", "vas", "ves", "das", "has", "estás"}
ES_2SG_PRONS = {"tú", "te", "ti", "contigo", "tu", "tus", "tuyo", "tuya", "tuyos", "tuyas"}
ES_2PL_M_PRONS = {"vosotros"}
ES_2PL_F_PRONS = {"vosotras"}
ES_2PL_PRONS = {"os", "vuestro", "vuestra", "vuestros", "vuestras"}
ES_COPULA_12_SG = {"soy", "estoy", "eres", "estás", "fui", "fuiste", "estuve", "estuviste"}
ES_COPULA_12_PL = {"somos", "estamos", "sois", "estáis", "fuimos", "fuisteis", "estuvimos", "estuvisteis"}
ES_USTED_RE = re.compile(r"\b(?:usted|ud\.?|vd\.?)\b", re.I)
ES_USTEDES_RE = re.compile(r"\b(?:ustedes|uds\.?|vds\.?)\b", re.I)
ES_3PL_VERB_END_RE = re.compile(r"(?:an|en|on|án|én|ín|aban|ían|aron|ieron|yeron|aran|asen|ieran|iesen|aren|ieren|son|están|han|van|dan|ven)$")


class SpanishCueTagger:
    @staticmethod
    def _is_2pl_verb(wl: str, lem: str) -> bool:
        if wl in ES_2PL_EXACT:
            return True
        if ES_2PL_END_RE.search(wl):
            return True
        # Regular vosotros imperative: -ar -> -ad, -er -> -ed, -ir -> -id, -ír -> -íd
        if len(lem) >= 3 and lem[-1] == "r" and lem[-2] in "aeií":
            if wl == lem[:-1] + "d":
                return True
        return False

    @staticmethod
    def _is_2sg_verb(wl: str, lem: str) -> bool:
        if wl == "es" and lem == "ser":
            return False
        if wl == "veras" and lem == "ver":
            return False
        if wl in ES_2SG_EXACT:
            return True
        # Preterite 2sg (-aste, -iste, -íste): guard against 3sg present of -star/-stir verbs (asiste, existe, viste<-vestir)
        if wl.endswith(("aste", "iste", "íste")):
            if lem.endswith(("star", "stir")) and not wl.endswith(("staste", "stiste")):
                return False
            if wl == "viste" and lem == "vestir":
                return False
            return True
        # Any other finite Spanish verb ending in -s (not -mos, not -is) is 2sg!
        if wl.endswith("s") and not wl.endswith(("mos", "is", "ís")):
            # Guard against rare noun-like edge cases; ensure it's at least 2 chars
            if len(wl) >= 2:
                return True
        if (wl, lem) in ES_2SG_IRREG_IMP:
            # For 've' (ir) / 'sé' (ser) / 'ven' (venir), all are unambiguous given lemma!
            return True
        return False

    def tag_entry(self, entry: dict) -> List[list]:
        text: str = entry["o"]
        trans: str = entry.get("t", "")
        spans: list = entry["m"]
        if not spans:
            return spans

        has_usted = bool(ES_USTED_RE.search(text))
        has_ustedes = bool(ES_USTEDES_RE.search(text))
        has_you_en = bool(EN_YOU_RE.search(trans))
        has_we_en = bool(EN_WE_RE.search(trans))
        has_they_en = bool(EN_THEY_RE.search(trans))

        tokens = [(m.start(), m.end(), m.group(0).lower()) for m in re.finditer(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", text)]
        tok_by_start = {s: (i, w) for i, (s, _, w) in enumerate(tokens)}

        out: List[list] = []
        for sp in spans:
            s, e, lemma = sp[0], sp[1], sp[2]
            kind = sp[3] if len(sp) > 3 else "v"
            is_base = len(sp) > 4 and bool(sp[4])
            surf = text[s:e]
            wl = surf.lower()
            lem_low = lemma.lower()
            cue: Optional[str] = None

            if kind == "v" and not is_base:
                if self._is_2pl_verb(wl, lem_low):
                    cue = "2p"
                elif self._is_2sg_verb(wl, lem_low):
                    cue = "2s"
                elif has_ustedes and has_you_en and ES_3PL_VERB_END_RE.search(wl):
                    # Formal plural verb with explicit ustedes in sentence (runtime hides if ustedes is visible!)
                    cue = "fp2"
                elif has_usted and has_you_en and not wl.endswith(("mos", "n", "s", "d")):
                    # Formal singular verb with explicit usted in sentence (runtime hides if usted is visible!)
                    # Guard against 1sg present (-o, -oy, -é, -í, -e in pret)
                    if not wl.endswith(("o", "oy", "é", "í")):
                        cue = "fs"

            elif kind == "r":
                if wl in ES_2SG_PRONS or lem_low in ("tú", "tu", "tuyo"):
                    cue = "2s"
                elif wl in ES_2PL_M_PRONS:
                    cue = "2pm"
                elif wl in ES_2PL_F_PRONS:
                    cue = "2pf"
                elif wl in ES_2PL_PRONS or lem_low in ("vosotros", "vuestro"):
                    cue = "2p"
                elif wl == "usted":
                    cue = "fs"
                elif wl == "ustedes":
                    cue = "fp2"
                elif wl == "nosotros" and has_we_en:
                    cue = "mp"
                elif wl == "nosotras" and has_we_en:
                    cue = "fp"
                elif wl == "ellos" and has_they_en:
                    cue = "mp"
                elif wl == "ellas" and has_they_en:
                    cue = "fp"

            elif kind in ("a", "p") and not is_base:
                # Gendered Spanish predicative adj/participle immediately after 1st/2nd person copula
                # (e.g. "Estoy cansado" / "Estoy cansada", "Estamos listos" / "Estamos listas")
                if lem_low.endswith("o") or kind == "p":
                    t_info = tok_by_start.get(s)
                    if t_info:
                        t_idx = t_info[0]
                        prev_words = [tokens[j][2] for j in range(max(0, t_idx - 3), t_idx)]
                        # Not preceded by an article (e.g. "soy un hombre cansado" -> noun is right there!)
                        has_art = any(pw in ("el", "la", "los", "las", "un", "una", "unos", "unas") for pw in prev_words)
                        is_adj_to_noun = any(
                            (other[3] if len(other) > 3 else "v") == "n"
                            and (abs(other[0] - e) <= 2 or abs(s - other[1]) <= 2)
                            for other in spans
                        )
                        if not has_art and not is_adj_to_noun:
                            if any(pw in ES_COPULA_12_SG for pw in prev_words):
                                if wl.endswith("o"):
                                    cue = "m"
                                elif wl.endswith("a"):
                                    cue = "f"
                            elif any(pw in ES_COPULA_12_PL for pw in prev_words):
                                if wl.endswith("os"):
                                    cue = "mp"
                                elif wl.endswith("as"):
                                    cue = "fp"

            out.append(set_span_cue(sp, cue))
        return out


# =============================================================================
# 4. GERMAN (Deterministic morphology + spaCy imperative check)
# =============================================================================

DE_2SG_EXACT = {
    "bist", "hast", "wirst", "willst", "kannst", "darfst", "magst", "musst", "mußt", "sollst",
    "weißt", "weisst", "warst", "hattest", "wurdest", "wärst", "wärest", "hättest", "würdest",
    "tust", "gehst", "stehst", "siehst", "gibst", "nimmst", "kommst", "sprichst", "sagst",
}
DE_2PL_EXACT = {"seid", "habt", "werdet", "wollt", "könnt", "dürft", "mögt", "müsst", "müßt", "sollt", "wisst", "wißt", "wart", "hattet", "wurdet", "wäret", "hättet", "würdet", "tut"}
DE_2SG_IMP_EXACT = {
    "sei", "hab", "habe", "komm", "geh", "gehe", "nimm", "gib", "sprich", "sag", "sage",
    "lies", "iss", "iß", "sieh", "siehe", "hilf", "wirf", "lass", "laß", "bleib", "bleibe",
    "tu", "tue", "hör", "höre", "schau", "schaue", "steh", "stehe", "mach", "mache",
    "bring", "bringe", "ruf", "rufe", "lauf", "laufe", "fahr", "fahre", "trag", "trage",
    "schreib", "schreibe", "folg", "folge", "glaub", "glaube", "fürchte", "warte", "öffne",
    "antworte", "rede", "bete", "danke", "denk", "denke", "halt", "halte", "setz", "setze",
    "leg", "lege", "stell", "stelle", "zieh", "ziehe", "flieh", "fliehe", "tritt", "brich",
    "stirb", "vergiss", "vergiß", "verzeih", "erzähle", "zeig", "zeige", "such", "suche",
}
DE_2SG_PRONS = {"du", "dich", "dir", "deiner", "dein", "deine", "deinen", "deinem", "deines"}
DE_2PL_PRONS_UNAMBIG = {"euch", "euer", "eure", "euren", "eurem", "eures", "eurer"}
DE_2PL_PRONS_AMBIG = {"ihr"}  # could be "her"/"their" or 2pl "you"!
DE_FORMAL_PRONS = {"Sie", "Ihnen", "Ihr", "Ihre", "Ihren", "Ihrem", "Ihres", "Ihrer"}


class GermanCueTagger:
    def __init__(self) -> None:
        import spacy
        self.nlp = spacy.load("de_core_news_md", disable=["ner", "parser"])

    def tag_batch(self, entries: List[dict]) -> List[List[list]]:
        texts = [e["o"] for e in entries]
        docs = list(self.nlp.pipe(texts, batch_size=256))
        results: List[List[list]] = []

        for entry, doc in zip(entries, docs):
            text: str = entry["o"]
            trans: str = entry.get("t", "")
            spans: list = entry["m"]
            if not spans:
                results.append(spans)
                continue

            has_you_en = bool(EN_YOU_RE.search(trans))
            has_her_their_en = bool(EN_HER_THEIR_RE.search(trans))
            has_du = bool(re.search(r"\bdu\b", text, re.I))
            has_ihr_subj = bool(re.search(r"\bihr\b", text, re.I)) and has_you_en
            # Capitalized Sie (either mid-sentence or sentence-initial when EN says "you")
            has_formal_sie = bool(re.search(r"(?<=\s)Sie\b", text)) or (
                text.lstrip("„\"'«—–- ").startswith("Sie ") and has_you_en and not has_her_their_en
            )

            tok_by_pos = {(t.idx, t.idx + len(t.text)): t for t in doc}

            out: List[list] = []
            for sp in spans:
                s, e, lemma = sp[0], sp[1], sp[2]
                kind = sp[3] if len(sp) > 3 else "v"
                is_base = len(sp) > 4 and bool(sp[4])
                surf = text[s:e]
                wl = surf.lower()
                lem_low = lemma.lower()
                tok = tok_by_pos.get((s, e))
                cue: Optional[str] = None

                if kind == "v" and not is_base:
                    tag = tok.tag_ if tok is not None else ""
                    mood = tok.morph.get("Mood") if tok is not None else []
                    num_m = tok.morph.get("Number") if tok is not None else []

                    if wl in DE_2SG_EXACT or (has_du and wl.endswith("st") and wl not in ("ist", "lässt", "läßt", "isst", "ißt", "liest", "sitzt", "heißt", "heisst")):
                        cue = "2s"
                    elif wl == "seid" or (has_ihr_subj and wl in DE_2PL_EXACT):
                        cue = "2p"
                    elif tag in ("VVIMP", "VAIMP") or "Imp" in mood:
                        if "Plur" in num_m or (wl.endswith("t") and wl not in DE_2SG_IMP_EXACT):
                            cue = "2p"
                        else:
                            cue = "2s"
                    elif not has_du and not has_ihr_subj and not has_formal_sie and wl in DE_2SG_IMP_EXACT:
                        # Imperative at start of sentence/quote when spaCy missed VVIMP
                        prefix = text[:s].rstrip()
                        if not prefix or prefix[-1] in ("„", '"', "«", ":", "—", "–", ",", "!", ";"):
                            if not EN_3RD_SUBJ_RE.search(trans) or has_you_en:
                                cue = "2s"
                    elif has_formal_sie and wl.endswith(("en", "n")) or (has_formal_sie and wl == "sind"):
                        # Formal Sie verb (runtime hides automatically when Sie is unblanked!)
                        if re.search(r"^\s+Sie\b", text[e:]) or re.search(r"\bSie\s+$", text[:s]):
                            cue = "fs"

                elif kind == "r":
                    if surf in DE_FORMAL_PRONS and has_you_en:
                        # Capitalized Sie/Ihr/Ihnen mid-sentence (or sentence-initial translating "you") = formal!
                        is_sent_start = not text[:s].strip("„\"'«»—–- ")
                        if not is_sent_start or not has_her_their_en:
                            cue = "fs"
                    elif wl in DE_2SG_PRONS or lem_low in ("du", "dein"):
                        cue = "2s"
                    elif wl in DE_2PL_PRONS_UNAMBIG or lem_low == "euer":
                        cue = "2p"
                    elif wl in DE_2PL_PRONS_AMBIG and has_you_en and not has_her_their_en:
                        cue = "2p"

                out.append(set_span_cue(sp, cue))
            results.append(out)
        return results


def process_corpus(corpus_id: str, taggers: dict, dry_run: bool = False) -> Tuple[str, int, Counter]:
    corpus_dir = DATA_DIR / corpus_id
    manifest = json.loads((corpus_dir / "manifest.json").read_text(encoding="utf-8"))
    lang = manifest["language"]
    counts: Counter = Counter()
    total_spans = 0
    samples: List[Tuple[str, str, str, str, str, str]] = []

    if lang not in taggers:
        if lang == "pl":
            taggers[lang] = PolishCueTagger()
        elif lang == "cs":
            taggers[lang] = CzechCueTagger()
        elif lang == "es":
            taggers[lang] = SpanishCueTagger()
        elif lang == "de":
            taggers[lang] = GermanCueTagger()
    tagger = taggers[lang]

    for book in manifest["books"]:
        chunk_path = corpus_dir / book["chunkFile"]
        entries = json.loads(chunk_path.read_text(encoding="utf-8"))
        changed = False

        if lang == "de":
            all_new = tagger.tag_batch(entries)
            for entry, new_m in zip(entries, all_new):
                if new_m != entry["m"]:
                    changed = True
                entry["m"] = new_m
        else:
            for entry in entries:
                new_m = tagger.tag_entry(entry)
                if new_m != entry["m"]:
                    changed = True
                entry["m"] = new_m

        for entry in entries:
            for sp in entry["m"]:
                total_spans += 1
                if len(sp) > 5 and sp[5]:
                    counts[sp[5]] += 1
                    if len(samples) < 2000:
                        samples.append((
                            f"{book['id']} {entry['c']}:{entry['v']}",
                            entry["o"][sp[0] : sp[1]],
                            sp[2],
                            sp[3],
                            sp[5],
                            f"{entry['o']} ||| {entry.get('t', '')}",
                        ))

        if not dry_run and changed:
            chunk_path.write_text(
                json.dumps(entries, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )

    if dry_run:
        print(f"\n=== {corpus_id} ({lang}) | {sum(counts.values())}/{total_spans} spans cued ({100*sum(counts.values())/max(1,total_spans):.1f}%) ===")
        print("  Cue breakdown:", dict(counts.most_common()))
        random.seed(42)
        by_cue: Dict[str, list] = {}
        for s_item in samples:
            by_cue.setdefault(s_item[4], []).append(s_item)
        for c_code in sorted(by_cue):
            pick = random.sample(by_cue[c_code], min(2, len(by_cue[c_code])))
            for ref, surf, lem, kind, cue, txt in pick:
                print(f"  [{cue:4s}] {ref:12s} {surf} ({lem}, {kind}) :: {txt[:130]}")

    return lang, total_spans, counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--corpora", nargs="*", help="Specific corpus IDs (default: all 38)")
    args = parser.parse_args()

    t0 = time.time()
    if args.corpora:
        corpora = args.corpora
    else:
        corpora = sorted(p.name for p in DATA_DIR.iterdir() if p.is_dir() and (p / "manifest.json").exists())

    taggers: dict = {}
    grand_spans = 0
    grand_cues = Counter()

    for cid in corpora:
        lang, n_spans, counts = process_corpus(cid, taggers, dry_run=args.dry_run)
        grand_spans += n_spans
        grand_cues.update(counts)
        if not args.dry_run:
            print(f"  [OK] {cid:26s} ({lang}) | cued {sum(counts.values()):6d} / {n_spans:6d} ({100*sum(counts.values())/max(1,n_spans):4.1f}%) | {dict(counts.most_common(5))}", flush=True)

    dt = time.time() - t0
    print(f"\nDone in {dt:.1f}s | Total cued: {sum(grand_cues.values()):,} / {grand_spans:,} ({100*sum(grand_cues.values())/max(1,grand_spans):.1f}%)")
    print("Grand cue counts:", dict(grand_cues.most_common()))


if __name__ == "__main__":
    main()
