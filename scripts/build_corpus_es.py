"""
Build the Spanish Bible (Reina-Valera 1909) inflected word-form quiz corpus
and export the reusable `tag_spanish_sentences()` pipeline for Spanish books.

Extracts all 7 Spanish word-form categories via spaCy (`es_core_news_lg`):
  - 'v': finite conjugated verbs + infinitives (isBase=True)
  - 'p': verbal past participles (VerbForm=Part)
  - 'g': non-enclitic gerunds (VerbForm=Ger)
  - 'd': definite & indefinite articles (el/la/los/las/lo -> el; un/una/unos/unas -> un)
  - 'n': nouns (plural/feminine inflected; singular isBase=True)
  - 'a': adjectives (with feminine -a lemmas normalized to masculine singular dictionary form)
  - 'r': pronouns & determiners (personal, possessive, demonstrative, relative)
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
ES_PATH = ROOT / "raw_data" / "es_rv1909.json"
EN_LLM_CACHE = ROOT / "raw_data" / "en_llm_translations_es.json"
VERB_LEMMA_CACHE_PATH = ROOT / "raw_data" / "es_verb_lemmas.json"
ADJ_LEMMA_CACHE_PATH = ROOT / "raw_data" / "es_adj_lemmas.json"
OUT_DIR = ROOT / "public" / "data" / "es-bible-rv1909"
CHUNKS_DIR = OUT_DIR / "chunks"

ENDPOINT = os.environ.get("LLM_ENDPOINT", "http://localhost:8000/v1/chat/completions")
MODEL = os.environ.get("LLM_MODEL", "")

ES_WORD_RE = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$")

# Obsolete pre-1959 RAE monosyllabic accents in 1909 texts (a/e/o/u, fue/fui/vio/dio)
OBSOLETE_ACCENT_MAP = {
    "á": "a", "Á": "A",
    "é": "e", "É": "E",
    "ó": "o", "Ó": "O",
    "ú": "u", "Ú": "U",
    "fué": "fue", "Fué": "Fue", "FUÉ": "FUE",
    "fuí": "fui", "Fuí": "Fui", "FUÍ": "FUI",
    "vió": "vio", "Vió": "Vio", "VIÓ": "VIO",
    "dió": "dio", "Dió": "Dio", "DIÓ": "DIO",
}
OBSOLETE_ACCENT_RE = re.compile(
    r"\b(?:á|Á|é|É|ó|Ó|ú|Ú|fué|Fué|FUÉ|fuí|Fuí|FUÍ|vió|Vió|VIÓ|dió|Dió|DIÓ)\b"
)

# Enclitic verb endings (compound verb + clitic pronoun(s) like acordarme, diciéndomelo, vámonos, dámelo)
ENCLITIC_GERUND_RE = re.compile(
    r"(?:ándo|iéndo|yéndo)(?:me|te|se|le|lo|la|nos|os|les|los|las){1,2}$",
    re.I,
)
ENCLITIC_INF_RE = re.compile(
    r"(?:ar|er|ir|ír)(?:me|te|se|le|lo|la|nos|os|les|los|las){1,2}$",
    re.I,
)
ENCLITIC_IMP_RE = re.compile(
    r"(?:ámonos|émonos|ímonos|(?:[áéíóú][a-záéíóúñ]*)(?:melo|mela|melos|melas|telo|tela|telos|telas|selo|sela|selos|selas|noslo|nosla|noslos|noslas))$",
    re.I,
)

# Valid non-verb words ending in -ar/-er/-ir that spaCy could accidentally leave unlemmatized
NOT_INFINITIVES = {
    "mar", "par", "bar", "zar", "ser", "mujer", "ayer", "taller", "placer", "poder", "saber",
    "deber", "querer", "haber", "comer", "beber", "altar", "lugar", "hogar", "pesar", "azar",
    "azúcar", "néctar", "césar", "ámbar", "dólar", "collar", "paladar", "ejemplar", "popular",
    "singular", "particular", "militar", "familiar", "regular", "secular", "solar", "polar",
    "lunar", "estelar", "escolar", "pulgar", "vulgar", "similar", "peculiar", "auxiliar",
    "cadáver", "carácter", "cráter", "éter", "líder", "mártir", "zafiro", "elíxir", "faquir",
    "porvenir", "mártir", "nadir", "visir",
}

ARTICLE_LEMMAS: Dict[str, str] = {
    "el": "el", "la": "el", "los": "el", "las": "el", "lo": "el",
    "un": "un", "una": "un", "unos": "un", "unas": "un",
}

PRONOUN_LEMMAS: Dict[str, str] = {
    # Personal
    "yo": "yo", "me": "yo", "mí": "yo", "conmigo": "yo",
    "tú": "tú", "te": "tú", "ti": "tú", "contigo": "tú", "vos": "vos",
    "él": "él", "ella": "él", "ello": "él", "le": "él", "les": "él",
    "se": "se", "sí": "se", "consigo": "se",
    "nosotros": "nosotros", "nosotras": "nosotros", "nos": "nosotros",
    "vosotros": "vosotros", "vosotras": "vosotros", "os": "vosotros",
    "ellos": "él", "ellas": "él",
    "usted": "usted", "ustedes": "usted",
    # Possessives
    "mi": "mi", "mis": "mi", "mío": "mío", "mía": "mío", "míos": "mío", "mías": "mío",
    "tu": "tu", "tus": "tu", "tuyo": "tuyo", "tuya": "tuyo", "tuyos": "tuyo", "tuyas": "tuyo",
    "su": "su", "sus": "su", "suyo": "suyo", "suya": "suyo", "suyos": "suyo", "suyas": "suyo",
    "nuestro": "nuestro", "nuestra": "nuestro", "nuestros": "nuestro", "nuestras": "nuestro",
    "vuestro": "vuestro", "vuestra": "vuestro", "vuestros": "vuestro", "vuestras": "vuestro",
    # Demonstratives
    "este": "este", "esta": "este", "estos": "este", "estas": "este", "esto": "este",
    "éste": "este", "ésta": "este", "éstos": "este", "éstas": "este",
    "ese": "ese", "esa": "ese", "esos": "ese", "esas": "ese", "eso": "ese",
    "ése": "ese", "ésa": "ese", "ésos": "ese", "ésas": "ese",
    "aquel": "aquel", "aquella": "aquel", "aquellos": "aquel", "aquellas": "aquel", "aquello": "aquel",
    "aquél": "aquel", "aquélla": "aquel", "aquéllos": "aquel", "aquéllas": "aquel",
    # Relative / Interrogative / Indefinite
    "quien": "quien", "quienes": "quien", "quién": "quién", "quiénes": "quién",
    "cual": "cual", "cuales": "cual", "cuál": "cuál", "cuáles": "cuál",
    "cuyo": "cuyo", "cuya": "cuyo", "cuyos": "cuyo", "cuyas": "cuyo",
    "todo": "todo", "toda": "todo", "todos": "todo", "todas": "todo",
    "otro": "otro", "otra": "otro", "otros": "otro", "otras": "otro",
    "alguno": "alguno", "algún": "alguno", "alguna": "alguno", "algunos": "alguno", "algunas": "alguno",
    "ninguno": "ninguno", "ningún": "ninguno", "ninguna": "ninguno", "ningunos": "ninguno", "ningunas": "ninguno",
    "mucho": "mucho", "mucha": "mucho", "muchos": "mucho", "muchas": "mucho",
    "poco": "poco", "poca": "poco", "pocos": "poco", "pocas": "poco",
    "tanto": "tanto", "tanta": "tanto", "tantos": "tanto", "tantas": "tanto",
    "cuanto": "cuanto", "cuanta": "cuanto", "cuantos": "cuanto", "cuantas": "cuanto",
    "cuánto": "cuánto", "cuánta": "cuánto", "cuántos": "cuánto", "cuántas": "cuánto",
    "mismo": "mismo", "misma": "mismo", "mismos": "mismo", "mismas": "mismo",
    "uno": "uno", "una": "uno", "unos": "uno", "unas": "uno",
}

# Canonical 66 books matching standard Protestant order (same IDs as pl/de/cs)
BOOKS_META: List[Tuple[str, str, str]] = [
    ("gn", "Génesis", "Genesis"),
    ("ex", "Éxodo", "Exodus"),
    ("lv", "Levítico", "Leviticus"),
    ("nm", "Números", "Numbers"),
    ("dt", "Deuteronomio", "Deuteronomy"),
    ("js", "Josué", "Joshua"),
    ("jz", "Jueces", "Judges"),
    ("rt", "Rut", "Ruth"),
    ("1sm", "1 Samuel", "1 Samuel"),
    ("2sm", "2 Samuel", "2 Samuel"),
    ("1rs", "1 Reyes", "1 Kings"),
    ("2rs", "2 Reyes", "2 Kings"),
    ("1cr", "1 Crónicas", "1 Chronicles"),
    ("2cr", "2 Crónicas", "2 Chronicles"),
    ("ed", "Esdras", "Ezra"),
    ("ne", "Nehemías", "Nehemiah"),
    ("et", "Ester", "Esther"),
    ("job", "Job", "Job"),
    ("sl", "Salmos", "Psalms"),
    ("pv", "Proverbios", "Proverbs"),
    ("ec", "Eclesiastés", "Ecclesiastes"),
    ("ct", "Cantares", "Song of Solomon"),
    ("is", "Isaías", "Isaiah"),
    ("jr", "Jeremías", "Jeremiah"),
    ("lm", "Lamentaciones", "Lamentations"),
    ("ez", "Ezequiel", "Ezekiel"),
    ("dn", "Daniel", "Daniel"),
    ("os", "Oseas", "Hosea"),
    ("jl", "Joel", "Joel"),
    ("am", "Amós", "Amos"),
    ("ob", "Abdías", "Obadiah"),
    ("jn", "Jonás", "Jonah"),
    ("mq", "Miqueas", "Micah"),
    ("na", "Nahúm", "Nahum"),
    ("hc", "Habacuc", "Habakkuk"),
    ("sf", "Sofonías", "Zephaniah"),
    ("ag", "Hageo", "Haggai"),
    ("zc", "Zacarías", "Zechariah"),
    ("ml", "Malaquías", "Malachi"),
    ("mt", "Mateo", "Matthew"),
    ("mc", "Marcos", "Mark"),
    ("lc", "Lucas", "Luke"),
    ("jo", "Juan", "John"),
    ("atos", "Hechos", "Acts"),
    ("rm", "Romanos", "Romans"),
    ("1co", "1 Corintios", "1 Corinthians"),
    ("2co", "2 Corintios", "2 Corinthians"),
    ("gl", "Gálatas", "Galatians"),
    ("ef", "Efesios", "Ephesians"),
    ("fp", "Filipenses", "Philippians"),
    ("cl", "Colosenses", "Colossians"),
    ("1ts", "1 Tesalonicenses", "1 Thessalonians"),
    ("2ts", "2 Tesalonicenses", "2 Thessalonians"),
    ("1tm", "1 Timoteo", "1 Timothy"),
    ("2tm", "2 Timoteo", "2 Timothy"),
    ("tt", "Tito", "Titus"),
    ("fm", "Filemón", "Philemon"),
    ("hb", "Hebreos", "Hebrews"),
    ("tg", "Santiago", "James"),
    ("1pe", "1 Pedro", "1 Peter"),
    ("2pe", "2 Pedro", "2 Peter"),
    ("1jo", "1 Juan", "1 John"),
    ("2jo", "2 Juan", "2 John"),
    ("3jo", "3 Juan", "3 John"),
    ("jd", "Judas", "Jude"),
    ("ap", "Apocalipsis", "Revelation"),
]

# High-frequency Spanish irregular verb disambiguation / fast-path overrides
HIGH_FREQ_VERB_LEMMAS: Dict[str, str] = {
    "oíd": "oír", "oid": "oír", "oí": "oír", "oyó": "oír", "oyeron": "oír",
    "oís": "oír", "oímos": "oír", "oiga": "oír", "oigas": "oír", "oigamos": "oír", "oigáis": "oír", "oigan": "oír",
    "id": "ir", "ve": "ir", "vas": "ir", "va": "ir", "vamos": "ir", "vais": "ir", "van": "ir",
    "voy": "ir", "iba": "ir", "ibas": "ir", "íbamos": "ir", "ibais": "ir", "iban": "ir",
    "vaya": "ir", "vayas": "ir", "vayamos": "ir", "vayáis": "ir", "vayan": "ir", "yendo": "ir",
    "sed": "ser", "soy": "ser", "eres": "ser", "es": "ser", "somos": "ser", "sois": "ser", "son": "ser",
    "era": "ser", "eras": "ser", "éramos": "ser", "erais": "ser", "eran": "ser",
    "sea": "ser", "seas": "ser", "seamos": "ser", "seáis": "ser", "sean": "ser", "siendo": "ser", "sido": "ser",
    "he": "haber", "has": "haber", "ha": "haber", "hay": "haber", "hemos": "haber", "habéis": "haber", "han": "haber",
    "hube": "haber", "hubiste": "haber", "hubo": "haber", "hubimos": "haber", "hubisteis": "haber", "hubieron": "haber",
    "había": "haber", "habías": "haber", "habíamos": "haber", "habíais": "haber", "habían": "haber",
    "habrá": "haber", "habrán": "haber", "habría": "haber", "haya": "haber", "hayas": "haber", "hayamos": "haber", "hayáis": "haber", "hayan": "haber",
    "hubiera": "haber", "hubieras": "haber", "hubiéramos": "haber", "hubierais": "haber", "hubieran": "haber",
    "hubiese": "haber", "hubieses": "haber", "hubiésemos": "haber", "hubieseis": "haber", "hubiesen": "haber",
    "da": "dar", "das": "dar", "damos": "dar", "dais": "dar", "dan": "dar", "doy": "dar", "dad": "dar",
    "di": "dar", "diste": "dar", "dio": "dar", "dimos": "dar", "disteis": "dar", "dieron": "dar",
    "dé": "dar", "des": "dar", "demos": "dar", "deis": "dar", "den": "dar", "dado": "dar", "dando": "dar",
    "veo": "ver", "ves": "ver", "vemos": "ver", "veis": "ver", "ven": "ver", "ved": "ver",
    "vi": "ver", "viste": "ver", "vio": "ver", "vimos": "ver", "visteis": "ver", "vieron": "ver",
    "veía": "ver", "veías": "ver", "veíamos": "ver", "veíais": "ver", "veían": "ver",
    "visto": "ver", "viendo": "ver",
    "di": "dar", "dije": "decir", "dijiste": "decir", "dijo": "decir", "dijimos": "decir", "dijisteis": "decir", "dijeron": "decir",
    "decid": "decir", "dicho": "decir", "diciendo": "decir",
    "hecho": "hacer", "haced": "hacer", "haz": "hacer", "hice": "hacer", "hiciste": "hacer", "hizo": "hacer",
    "hicimos": "hacer", "hicisteis": "hacer", "hicieron": "hacer",
    "venid": "venir", "salid": "salir", "tened": "tener", "poned": "poner", "sabed": "saber", "traed": "traer",
}

# Invariable Spanish adjectives ending in -a that do NOT have a masculine -o form
INVARIABLE_FEM_ADJ = {
    "belga", "indígena", "agrícola", "cosmopolita", "hipócrita", "israelita", "jesuita",
    "levita", "moabita", "amonita", "edomita", "cananita", "samarita", "nazarita", "cenobita",
    "eremita", "sibarita", "nómada", "persa", "maya", "inca", "azteca", "violeta", "naranja",
    "rosa", "lila", "fucsia", "turquesa", "esmeralda", "carmesí", "cada", "demás", "extra",
    "ultra", "contra", "suicida", "homicida", "parricida", "regicida", "fratricida", "genocida",
}


def resolve_model() -> str:
    if MODEL:
        return MODEL
    models_url = ENDPOINT.rsplit("/chat/completions", 1)[0] + "/models"
    with urllib.request.urlopen(models_url, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data["data"][0]["id"])


def normalize_spanish_orthography(text: str, fix_chapter_start_caps: bool = False) -> str:
    """Modernize obsolete pre-1959 RAE monosyllabic accents (á/é/ó/ú, fué/fuí/vió/dió) cleanly."""
    out = OBSOLETE_ACCENT_RE.sub(lambda m: OBSOLETE_ACCENT_MAP[m.group(0)], text)
    if fix_chapter_start_caps:
        # Reina-Valera 1909 prints chapter-1 first word in small caps (e.g. 'EN el principio', 'JEHOVÁ es')
        m = re.match(r"^([¡¿«„\"'(\[]*)([A-ZÁÉÍÓÚÜÑ]{2,})([\s,;:.!?»”\"'\)\]])", out)
        if m:
            lead, word, trail = m.group(1), m.group(2), m.group(3)
            # Keep Roman numerals intact if any, otherwise Title Case
            if not re.match(r"^[IVXLCDM]+$", word):
                out = lead + word.capitalize() + trail + out[m.end() :]
    return out


ES_TRUNCATED_PLURAL_ENDINGS = (
    "nt", "st", "bl", "pl", "cl", "tr", "dr", "gr", "br", "cr", "fr", "pr",
    "ct", "pt", "rt", "lt", "ft", "sp", "mb", "mp", "nd", "ng", "rc", "rd",
    "rg", "rv", "lb", "ld", "lg", "lm", "lp", "lv", "ch", "ll", "ñ",
    "b", "c", "f", "g", "m", "p", "t", "v",
)


def repair_spacy_es_plural_lemma(surf_low: str, raw_lem: str) -> str:
    """Fix spaCy es_core_news_lg stripping '-es' instead of '-s' on '-e' words (e.g. ardientes -> ardient -> ardiente)."""
    if surf_low == raw_lem + "es" and raw_lem.endswith(ES_TRUNCATED_PLURAL_ENDINGS):
        return raw_lem + "e"
    return raw_lem


def is_valid_spanish_infinitive(lemma: str) -> bool:
    return (
        len(lemma) >= 2
        and lemma == lemma.lower()
        and bool(ES_WORD_RE.match(lemma))
        and (lemma.endswith("ar") or lemma.endswith("er") or lemma.endswith("ir") or lemma.endswith("ír"))
    )


def is_enclitic_verb(surf: str, lemma: str, morph_str: str) -> bool:
    s_low = surf.lower()
    if " " in lemma:
        return True
    if "PronType=Prs" in morph_str and ("VerbForm=Inf" in morph_str or "VerbForm=Ger" in morph_str or "Mood=Imp" in morph_str):
        return True
    if ENCLITIC_GERUND_RE.search(s_low) or ENCLITIC_IMP_RE.search(s_low):
        return True
    if "VerbForm=Inf" in morph_str and ENCLITIC_INF_RE.search(s_low):
        return True
    # Catch enclitic preterite/imperative like 'engañóme', 'díjole', 'vídole', 'dámelo', 'hízose'
    if re.search(r"[áéíóú][a-zñ]*(?:me|te|se|le|lo|la|nos|os|les|los|las)$", s_low):
        # Allow normal accented verb forms ending in -se/-te/-me/-le/-lo/-la/-nos/-os?
        # Wait: accented penultimate + clitic (díjole, hízose, respondióle, dáme, óyeme, mírame, llévalo, dámelo)
        # Note normal imperfect subjunctive ends in -se (hablase, tuviese, fuésemos -> no accent before -se except 1pl -ásemos/-iésemos which ends in -mos!)
        # Normal present/past forms do NOT carry an acute accent immediately before me/te/se/le/lo/la/nos/os!
        if re.search(r"(?:[áéíóú](?:me|te|se|le|lo|la|nos|os|les|los|las)|[áéíóú][bcdfghjklmnñpqrstvwxyz]{1,2}[aeio](?:me|te|se|le|lo|la|nos|os|les|los|las))$", s_low):
            # Exclude genuine nouns/verbs like 'fósforo', 'árboles', 'ángeles' — this is only called on VERB/AUX!
            return True
    return False


VERB_LEMMA_PROMPT = (
    "You are an expert Spanish linguist. Map each Spanish verb, participle, or gerund form in the input JSON "
    "(including vosotros, archaic, and irregular forms like 'oíd'->'oír', 'engañéis'->'engañar', 'habéis'->'haber', 'hecho'->'hacer', 'crió'->'criar') "
    "to its standard lowercase Spanish infinitive (ending in -ar, -er, -ir, or -ír). "
    "CRITICAL: If the word is an enclitic compound with an attached clitic pronoun (like 'acordarme', 'díjole', 'diciéndomelo', 'vámonos', 'hízose', 'levantarse') "
    "OR is NOT a Spanish verb form, map it to the empty string \"\". "
    "Return ONLY a valid JSON object mapping the exact input keys to lowercase Spanish infinitives or \"\"."
)

ADJ_LEMMA_PROMPT = (
    "You are an expert Spanish lexicographer. Map each feminine Spanish adjective in the input JSON "
    "to its standard lowercase dictionary masculine singular lemma (e.g. 'buena'->'bueno', 'santas'->'santo', 'española'->'español', 'trabajadora'->'trabajador', 'francesa'->'francés'). "
    "If the adjective is invariable in gender (e.g. 'agrícola'->'agrícola', 'realista'->'realista', 'belga'->'belga'), return the singular form unchanged. "
    "Return ONLY a valid JSON object mapping the exact input keys to lowercase Spanish adjective lemmas."
)


def call_llm_json(batch: Dict[str, str], model_name: str, system_prompt: str, allow_empty: bool = False) -> Dict[str, str]:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.0,
        "max_tokens": min(4096, max(1024, len(batch) * 60)),
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
        raise ValueError("Empty content")
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        return {}
    out: Dict[str, str] = {}
    for k in batch:
        val = parsed.get(k)
        if isinstance(val, str):
            v = val.strip().lower()
            if (allow_empty and v == "") or (v and ES_WORD_RE.match(v)):
                out[k] = v
    return out


def call_llm_json_with_retry(
    batch: Dict[str, str], model_name: str, system_prompt: str, allow_empty: bool = False
) -> Dict[str, str]:
    results: Dict[str, str] = {}
    rem = dict(batch)
    for attempt in range(2):
        if not rem:
            break
        try:
            results.update(call_llm_json(rem, model_name, system_prompt, allow_empty=allow_empty))
            rem = {k: v for k, v in rem.items() if k not in results}
        except Exception:
            if attempt == 0 and len(rem) > 1:
                items = list(rem.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if sub:
                        try:
                            results.update(call_llm_json(sub, model_name, system_prompt, allow_empty=allow_empty))
                        except Exception:
                            pass
                rem = {k: v for k, v in rem.items() if k not in results}
    return results


def translate_es_batch(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    sys_prompt = (
        "You are an expert biblical and literary translator from Spanish (Reina-Valera 1909) to natural, faithful modern English. "
        "The user provides a JSON object mapping short IDs to Spanish sentences. "
        "Translate each sentence directly and accurately into natural modern English (render 'Jehová' as 'the LORD'). "
        "Return ONLY a valid JSON object mapping the exact input IDs to English translation strings."
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


def translate_es_batch_with_retry(batch: Dict[str, str], model_name: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    rem = dict(batch)
    for _ in range(3):
        if not rem:
            break
        try:
            out.update(translate_es_batch(rem, model_name))
            rem = {k: v for k, v in rem.items() if k not in out}
        except Exception:
            if len(rem) > 1:
                items = list(rem.items())
                mid = len(items) // 2
                for sub in (dict(items[:mid]), dict(items[mid:])):
                    if sub:
                        try:
                            out.update(translate_es_batch(sub, model_name))
                        except Exception:
                            pass
                rem = {k: v for k, v in rem.items() if k not in out}
            else:
                time.sleep(0.5)
    return out


_SPACY_ES = None


def get_spacy_es():
    global _SPACY_ES
    if _SPACY_ES is None:
        _SPACY_ES = spacy.load("es_core_news_lg", disable=["ner", "parser"])
    return _SPACY_ES


def tag_spanish_sentences(
    texts: List[str],
    model_name: str,
) -> List[List[list]]:
    """Tag a list of Spanish sentences into VERBA spans [start, end, lemma, kind, (1 if isBase)]."""
    nlp = get_spacy_es()

    verb_cache: Dict[str, str] = (
        json.loads(VERB_LEMMA_CACHE_PATH.read_text(encoding="utf-8"))
        if VERB_LEMMA_CACHE_PATH.exists()
        else {}
    )
    adj_cache: Dict[str, str] = (
        json.loads(ADJ_LEMMA_CACHE_PATH.read_text(encoding="utf-8"))
        if ADJ_LEMMA_CACHE_PATH.exists()
        else {}
    )

    raw_toks: List[List[Tuple[int, int, str, str, str, bool]]] = []
    missing_verbs: Dict[str, str] = {}
    missing_adjs: Dict[str, str] = {}

    for text, doc in zip(texts, nlp.pipe(texts, batch_size=512)):
        toks: List[Tuple[int, int, str, str, str, bool]] = []
        for tok in doc:
            surf = tok.text
            if not ES_WORD_RE.match(surf):
                continue
            start, end = tok.idx, tok.idx + len(surf)
            pos = tok.pos_
            s_low = surf.lower()
            morph_str = str(tok.morph)
            raw_lem = tok.lemma_.lower().strip()

            # 1. Verbs, Participles, Gerunds
            if pos in ("VERB", "AUX"):
                if is_enclitic_verb(surf, raw_lem, morph_str):
                    continue
                vf = tok.morph.get("VerbForm")
                if "Ger" in vf:
                    kind = "g"
                    is_base = False
                elif "Part" in vf:
                    kind = "p"
                    is_base = False
                elif "Inf" in vf:
                    kind = "v"
                    is_base = True
                else:
                    kind = "v"
                    is_base = False

                # Always resolve verb/participle/gerund infinitives via verified cache (never trust spaCy's
                # rule-based stemmer which hallucinates fake infinitives like 'volverar', 'engrandeceír', 'resplandecir')
                lem = HIGH_FREQ_VERB_LEMMAS.get(s_low, "")
                if not lem and s_low in verb_cache:
                    lem = verb_cache[s_low]
                    if lem == "":
                        continue  # Explicitly marked non-verb or enclitic in cache
                if not lem:
                    if is_base and is_valid_spanish_infinitive(s_low):
                        lem = s_low
                    else:
                        if s_low not in missing_verbs:
                            missing_verbs[s_low] = text[:120]
                        lem = ""
                if kind == "v" and lem and lem == s_low:
                    is_base = True
                toks.append((start, end, surf, kind, lem, is_base))

            # 2. Articles (definite & indefinite, excluding contractions al/del which are ADP)
            elif pos == "DET" and s_low in ARTICLE_LEMMAS:
                lem = ARTICLE_LEMMAS[s_low]
                toks.append((start, end, surf, "d", lem, lem == s_low))

            # 3. Pronouns & inflecting determiners (excluding invariable 'que')
            elif pos in ("PRON", "DET") and s_low in PRONOUN_LEMMAS:
                lem = PRONOUN_LEMMAS[s_low]
                toks.append((start, end, surf, "r", lem, lem == s_low))

            # 4. Adjectives (normalize spaCy's feminine -a lemma bug and truncated -es plural bug)
            elif pos == "ADJ":
                raw_lem = repair_spacy_es_plural_lemma(s_low, raw_lem)
                if not ES_WORD_RE.match(raw_lem) or len(raw_lem) < 2:
                    continue
                # Catch enclitic verb forms mis-tagged as ADJ
                if ENCLITIC_GERUND_RE.search(s_low) or ENCLITIC_IMP_RE.search(s_low):
                    continue
                needs_masc = (
                    "Gender=Fem" in morph_str
                    and raw_lem.endswith("a")
                    and not raw_lem.endswith(("ista", "cola", "cida"))
                    and raw_lem not in INVARIABLE_FEM_ADJ
                )
                if needs_masc:
                    if raw_lem in adj_cache:
                        lem = adj_cache[raw_lem]
                    else:
                        if raw_lem not in missing_adjs:
                            missing_adjs[raw_lem] = text[:120]
                        lem = ""
                else:
                    lem = raw_lem
                toks.append((start, end, surf, "a", lem, lem == s_low if lem else False))

            # 5. Nouns (skip proper nouns PROPN and enclitic false positives like 'vámonos')
            elif pos == "NOUN":
                raw_lem = repair_spacy_es_plural_lemma(s_low, raw_lem)
                if not ES_WORD_RE.match(raw_lem) or len(raw_lem) < 2:
                    continue
                if ENCLITIC_GERUND_RE.search(s_low) or ENCLITIC_IMP_RE.search(s_low):
                    continue
                if s_low in ("vámonos", "vamonos"):
                    continue
                toks.append((start, end, surf, "n", raw_lem, raw_lem == s_low))

        raw_toks.append(toks)

    if missing_verbs:
        print(f"  [es] Resolving {len(missing_verbs)} Spanish verb/participle/gerund lemmas...", flush=True)
        items = list(missing_verbs.items())
        batches = [dict(items[i : i + 40]) for i in range(0, len(items), 40)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
            futs = [pool.submit(call_llm_json_with_retry, b, model_name, VERB_LEMMA_PROMPT, True) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                for k, v in fut.result().items():
                    if v == "" or is_valid_spanish_infinitive(v):
                        verb_cache[k] = v
        VERB_LEMMA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        VERB_LEMMA_CACHE_PATH.write_text(json.dumps(verb_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    if missing_adjs:
        print(f"  [es] Normalizing {len(missing_adjs)} feminine Spanish adjective lemmas...", flush=True)
        items = list(missing_adjs.items())
        batches = [dict(items[i : i + 35]) for i in range(0, len(items), 35)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            futs = [pool.submit(call_llm_json_with_retry, b, model_name, ADJ_LEMMA_PROMPT, False) for b in batches]
            for fut in concurrent.futures.as_completed(futs):
                adj_cache.update(fut.result())
        ADJ_LEMMA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        ADJ_LEMMA_CACHE_PATH.write_text(json.dumps(adj_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    all_spans: List[List[list]] = []
    for toks in raw_toks:
        spans: List[list] = []
        for start, end, surf, kind, lem, is_base_hint in toks:
            s_low = surf.lower()
            if kind in ("v", "p", "g"):
                resolved = lem or verb_cache.get(s_low, "")
                if not resolved or not is_valid_spanish_infinitive(resolved):
                    continue
                is_base = is_base_hint or (resolved == s_low)
                spans.append([start, end, resolved, kind, 1] if is_base else [start, end, resolved, kind])
            elif kind == "a":
                resolved = lem or adj_cache.get(s_low, "")
                if not resolved:
                    # Try looking up feminine singular key if s_low was plural
                    fem_sg = s_low[:-1] if s_low.endswith("as") else s_low
                    resolved = adj_cache.get(fem_sg, "")
                if not resolved or not ES_WORD_RE.match(resolved):
                    continue
                is_base = resolved == s_low
                spans.append([start, end, resolved, "a", 1] if is_base else [start, end, resolved, "a"])
            else:
                if not lem or not ES_WORD_RE.match(lem):
                    continue
                is_base = is_base_hint or (lem == s_low)
                spans.append([start, end, lem, kind, 1] if is_base else [start, end, lem, kind])
        all_spans.append(spans)
    return all_spans


def main() -> None:
    t0 = time.time()
    print("Loading Spanish Reina-Valera 1909 Bible...", flush=True)
    rv_data = json.loads(ES_PATH.read_text(encoding="utf-8-sig"))
    rv_books = rv_data["books"]
    assert len(rv_books) == 66, f"Expected 66 books, got {len(rv_books)}"

    flat_items: List[Tuple[int, int, int, str, str]] = []
    for bi in range(66):
        book_id = BOOKS_META[bi][0]
        for ch_obj in rv_books[bi]["chapters"]:
            ci = int(ch_obj["chapter"])
            for v_obj in ch_obj["verses"]:
                vi = int(v_obj["verse"])
                raw_es = " ".join(v_obj["text"].strip().split())
                clean_es = normalize_spanish_orthography(raw_es, fix_chapter_start_caps=(vi == 1))
                key = f"{book_id}:{ci}:{vi}"
                flat_items.append((bi, ci, vi, key, clean_es))

    print(f"Loaded {len(flat_items)} Spanish verses ({time.time() - t0:.1f}s)", flush=True)

    # Translate directly from Reina-Valera 1909 -> natural English (cached incrementally)
    en_cache: Dict[str, str] = (
        json.loads(EN_LLM_CACHE.read_text(encoding="utf-8")) if EN_LLM_CACHE.exists() else {}
    )
    missing_items = [(key, text) for _, _, _, key, text in flat_items if key not in en_cache]
    model_name = resolve_model()

    if missing_items:
        print(f"Translating {len(missing_items)} verses ({len(en_cache)} cached)...", flush=True)
        batches = [
            {str(j): text for j, (_, text) in enumerate(missing_items[i : i + 25])}
            for i in range(0, len(missing_items), 25)
        ]
        batch_keys = [
            {str(j): key for j, (key, _) in enumerate(missing_items[i : i + 25])}
            for i in range(0, len(missing_items), 25)
        ]
        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
            fut_map = {
                pool.submit(translate_es_batch_with_retry, b, model_name): bk
                for b, bk in zip(batches, batch_keys)
            }
            for fut in concurrent.futures.as_completed(fut_map):
                bk = fut_map[fut]
                for idx_k, en_val in fut.result().items():
                    vkey = bk.get(idx_k)
                    if vkey and en_val:
                        en_cache[vkey] = en_val
                done += 1
                if done % 40 == 0 or done == len(batches):
                    EN_LLM_CACHE.parent.mkdir(parents=True, exist_ok=True)
                    EN_LLM_CACHE.write_text(json.dumps(en_cache, ensure_ascii=False, indent=2), encoding="utf-8")
                    print(f"  [{done}/{len(batches)}] translated ({len(en_cache)}/{len(flat_items)}, {time.time() - t0:.1f}s)", flush=True)

    print(f"Tagging {len(flat_items)} Spanish verses (v, p, g, d, n, a, r)...", flush=True)
    all_spans = tag_spanish_sentences([it[4] for it in flat_items], model_name)

    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    book_entries: List[List[dict]] = [[] for _ in range(66)]
    counts = {"v": 0, "p": 0, "g": 0, "d": 0, "n": 0, "a": 0, "r": 0}
    quiz_verses = 0

    for (bi, ci, vi, key, es_text), spans in zip(flat_items, all_spans):
        en_text = en_cache.get(key, "").strip()
        if not spans or not en_text:
            continue
        book_entries[bi].append({
            "c": ci,
            "v": vi,
            "o": es_text,
            "t": en_text,
            "m": spans,
        })
        quiz_verses += 1
        for sp in spans:
            if len(sp) < 5:
                counts[sp[3]] += 1

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
        "id": "es-bible-rv1909",
        "language": "es",
        "title": "Bible",
        "subtitle": "Reina-Valera 1909 · Direct English",
        "translationSource": "RV1909 → EN",
        "totalVerses": len(flat_items),
        "quizVerses": quiz_verses,
        "totalVerbs": counts["v"],
        "categories": ["v", "p", "g", "d", "n", "a", "r"],
        "formCounts": counts,
        "books": manifest_books,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Done in {time.time() - t0:.1f}s! Verses: {quiz_verses} | Inflected Counts: {counts}", flush=True)
    for label, bi, c, v in [("Gen 3:13", 0, 3, 13), ("Mt 15:20", 39, 15, 20)]:
        e = next((x for x in book_entries[bi] if x["c"] == c and x["v"] == v), None)
        if e:
            print(f"\n--- ES {label} ---")
            print("  O:", e["o"])
            print("  T:", e["t"])
            print("  M:", [(e["o"][sp[0]:sp[1]], sp[2], sp[3], "base" if len(sp) > 4 else "infl") for sp in e["m"]])


if __name__ == "__main__":
    main()
