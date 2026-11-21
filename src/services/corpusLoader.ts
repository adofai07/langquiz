import {
  VERB_RANGE_MAX,
  VERSE_RANGE_MAX,
  type CorpusBookMeta,
  type CorpusManifest,
  type EnabledWordForms,
  type QuizQuestion,
  type RawCorpusEntry,
  type VerbBlank,
  type VerbRange,
  type VerseRange,
  type WordFormKind,
} from '../types/quiz';

export type NormalizedSpan = [number, number, string, WordFormKind, boolean];

export interface MergedCorpusItem {
  c: number;
  vStart: number;
  vEnd: number;
  verseCount: number;
  o: string;
  t: string;
  m: NormalizedSpan[];
  /** True when the merged unit begins cleanly (not orphaned mid-sentence after a missing verse). */
  cleanStart: boolean;
}

const manifestCache = new Map<string, CorpusManifest>();
const mergedChunkCache = new Map<string, MergedCorpusItem[]>();
const glossaryCache = new Map<string, Record<string, string>>();

const SENTENCE_END_RE = /[.!?][»”"'\)\]]*\s*$/;

/**
 * Remove unmatched stray quotation marks left on standalone English translations
 * when a multi-verse biblical quote starts or ends on another verse.
 */
export function cleanStrayQuotes(text: string): string {
  let out = text.trim();
  if (!out) return out;

  // Balance curly double quotes (“ ... ”)
  let openCurly = (out.match(/“/g) ?? []).length;
  let closeCurly = (out.match(/”/g) ?? []).length;
  while (closeCurly > openCurly && out.endsWith('”')) {
    out = out.slice(0, -1).trimEnd();
    closeCurly -= 1;
  }
  while (openCurly > closeCurly && out.startsWith('“')) {
    out = out.slice(1).trimStart();
    openCurly -= 1;
  }
  if (openCurly === 1 && closeCurly === 0) {
    out = out.replace('“', '');
  } else if (closeCurly === 1 && openCurly === 0) {
    out = out.replace('”', '');
  }

  // Balance straight ASCII double quotes (")
  const asciiCount = (out.match(/"/g) ?? []).length;
  if (asciiCount % 2 === 1) {
    if (out.endsWith('"')) {
      out = out.slice(0, -1).trimEnd();
    } else if (out.startsWith('"')) {
      out = out.slice(1).trimStart();
    } else if (asciiCount === 1) {
      out = out.replace('"', '');
    }
  }

  return out;
}

function startsWithLowercase(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return false;
  const first = trimmed[0];
  return first !== first.toUpperCase() && first === first.toLowerCase();
}

/**
 * Merge consecutive verses within a chapter that belong to the same grammatical
 * sentence (when the previous verse does not end with terminal `.!?` punctuation
 * or the next verse starts with a lowercase letter).
 */
export function mergeSplitVerses(entries: RawCorpusEntry[]): MergedCorpusItem[] {
  const merged: MergedCorpusItem[] = [];

  for (const entry of entries) {
    const prev = merged[merged.length - 1];
    const isAdjacent = prev && prev.c === entry.c && entry.v === prev.vEnd + 1;
    const shouldMerge =
      isAdjacent && (!SENTENCE_END_RE.test(prev.o) || startsWithLowercase(entry.o));

    if (shouldMerge && prev) {
      const offset = prev.o.length + 1;
      prev.o = `${prev.o} ${entry.o}`;
      prev.t = prev.t && entry.t ? `${prev.t} ${entry.t}` : prev.t || entry.t;
      for (const [start, end, lemma, kind, isBase] of entry.m) {
        prev.m.push([start + offset, end + offset, lemma, kind ?? 'v', Boolean(isBase)]);
      }
      prev.vEnd = entry.v;
      prev.verseCount += 1;
    } else {
      merged.push({
        c: entry.c,
        vStart: entry.v,
        vEnd: entry.v,
        verseCount: 1,
        o: entry.o,
        t: entry.t,
        m: entry.m.map(([s, e, l, k, b]) => [s, e, l, k ?? 'v', Boolean(b)]),
        cleanStart: !startsWithLowercase(entry.o),
      });
    }
  }

  return merged;
}

function baseDir(manifestUrl: string): string {
  const idx = manifestUrl.lastIndexOf('/');
  return idx >= 0 ? manifestUrl.slice(0, idx + 1) : '/';
}

export async function loadCorpusManifest(manifestUrl: string): Promise<CorpusManifest> {
  const existing = manifestCache.get(manifestUrl);
  if (existing) return existing;

  const res = await fetch(manifestUrl);
  if (!res.ok) {
    throw new Error(`Failed to load corpus manifest (${res.status})`);
  }
  const data = (await res.json()) as CorpusManifest;
  manifestCache.set(manifestUrl, data);
  return data;
}

export async function loadCorpusGlossary(manifestUrl: string): Promise<Record<string, string>> {
  const url = `${baseDir(manifestUrl)}glossary.json`;
  const existing = glossaryCache.get(url);
  if (existing) return existing;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {};
    }
    const data = (await res.json()) as Record<string, string>;
    if (data && typeof data === 'object') {
      glossaryCache.set(url, data);
      return data;
    }
    return {};
  } catch {
    return {};
  }
}

export async function loadBookMergedItems(
  manifestUrl: string,
  book: CorpusBookMeta
): Promise<MergedCorpusItem[]> {
  const url = `${baseDir(manifestUrl)}${book.chunkFile}`;
  const existing = mergedChunkCache.get(url);
  if (existing) return existing;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load corpus chunk ${book.id} (${res.status})`);
  }
  const entries = (await res.json()) as RawCorpusEntry[];
  const merged = mergeSplitVerses(entries);
  mergedChunkCache.set(url, merged);
  return merged;
}

export function filterSpansByForms(
  spans: NormalizedSpan[],
  wordForms: EnabledWordForms,
  includeBaseForms = false
): NormalizedSpan[] {
  return spans.filter(([, , , kind, isBase]) => {
    if (!wordForms[kind]) return false;
    if (!includeBaseForms && isBase) return false;
    return true;
  });
}

const ALL_FORM_KINDS: WordFormKind[] = ['v', 'p', 't', 'd', 'n', 'a', 'r'];

export function toQuizQuestion(
  manifest: CorpusManifest,
  book: CorpusBookMeta,
  item: MergedCorpusItem,
  wordForms: EnabledWordForms,
  includeBaseForms = false
): QuizQuestion {
  const activeSpans = filterSpansByForms(item.m, wordForms, includeBaseForms);
  // If an explicitly loaded deep-link has 0 spans in the selected categories, fall back to inflected spans (or all spans)
  const fallbackSpans = includeBaseForms
    ? item.m
    : item.m.filter(([, , , , isBase]) => !isBase);
  const chosenSpans =
    activeSpans.length > 0 ? activeSpans : fallbackSpans.length > 0 ? fallbackSpans : item.m;

  const blanks: VerbBlank[] = chosenSpans.map(([start, end, lemma, kind, isBase], index) => ({
    index,
    start,
    end,
    answer: item.o.slice(start, end),
    lemma,
    kind,
    isBase,
  }));

  const bookNativeName = book.nativeName ?? book.plName ?? book.enName;
  const verseLabel =
    item.vStart === item.vEnd ? `${item.c}:${item.vStart}` : `${item.c}:${item.vStart}–${item.vEnd}`;
  const formsKey =
    ALL_FORM_KINDS.filter((k) => wordForms[k]).join('') + (includeBaseForms ? '+b' : '');

  return {
    id: `${manifest.id}:${book.id}:${item.c}:${item.vStart}-${item.vEnd}:${formsKey}`,
    bookIndex: book.index,
    bookId: book.id,
    bookNativeName,
    bookEnName: book.enName,
    chapter: item.c,
    verse: item.vStart,
    verseEnd: item.vEnd,
    verseCount: item.verseCount,
    reference: `${bookNativeName} (${book.enName}) ${verseLabel}`,
    original: item.o,
    translation: cleanStrayQuotes(item.t),
    translationSource: manifest.translationSource,
    blanks,
  };
}

export function matchesVerbRange(blankCount: number, range: VerbRange): boolean {
  if (blankCount <= 0) return false;
  if (blankCount < range.min) return false;
  if (range.max < VERB_RANGE_MAX && blankCount > range.max) return false;
  return true;
}

export function matchesVerseRange(verseCount: number, range: VerseRange): boolean {
  if (verseCount <= 0) return false;
  if (verseCount < range.min) return false;
  if (range.max < VERSE_RANGE_MAX && verseCount > range.max) return false;
  return true;
}

function matchesFilters(
  item: MergedCorpusItem,
  wordForms: EnabledWordForms,
  includeBaseForms: boolean,
  verbRange: VerbRange,
  verseRange: VerseRange
): boolean {
  const count = filterSpansByForms(item.m, wordForms, includeBaseForms).length;
  return (
    item.cleanStart &&
    matchesVerbRange(count, verbRange) &&
    matchesVerseRange(item.verseCount, verseRange)
  );
}

function pickWeightedBook(books: CorpusBookMeta[]): CorpusBookMeta {
  const eligible = books.filter((b) => b.verseCount > 0);
  const totalWeight = eligible.reduce((sum, b) => sum + b.verseCount, 0);
  let r = Math.random() * totalWeight;
  for (const book of eligible) {
    r -= book.verseCount;
    if (r <= 0) return book;
  }
  return eligible[eligible.length - 1];
}

export async function pickRandomQuestion(
  manifestUrl: string,
  wordForms: EnabledWordForms,
  includeBaseForms: boolean,
  verbRange: VerbRange,
  verseRange: VerseRange,
  recentIds: Set<string>
): Promise<QuizQuestion> {
  const manifest = await loadCorpusManifest(manifestUrl);
  const triedBooks = new Set<string>();

  for (let attempt = 0; attempt < 18; attempt++) {
    const book = pickWeightedBook(manifest.books);
    triedBooks.add(book.id);
    const items = await loadBookMergedItems(manifestUrl, book);
    const matching = items.filter((it) =>
      matchesFilters(it, wordForms, includeBaseForms, verbRange, verseRange)
    );
    if (matching.length === 0) continue;

    const fresh = matching.filter(
      (it) => !recentIds.has(`${manifest.id}:${book.id}:${it.c}:${it.vStart}-${it.vEnd}`)
    );
    const pool = fresh.length > 0 ? fresh : matching;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return toQuizQuestion(manifest, book, chosen, wordForms, includeBaseForms);
  }

  for (const book of manifest.books) {
    if (triedBooks.has(book.id)) continue;
    const items = await loadBookMergedItems(manifestUrl, book);
    const matching = items.filter((it) =>
      matchesFilters(it, wordForms, includeBaseForms, verbRange, verseRange)
    );
    if (matching.length > 0) {
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      return toQuizQuestion(manifest, book, chosen, wordForms, includeBaseForms);
    }
  }

  for (const book of manifest.books) {
    const items = await loadBookMergedItems(manifestUrl, book);
    const matching = items.filter(
      (it) => filterSpansByForms(it.m, wordForms, includeBaseForms).length > 0
    );
    if (matching.length > 0) {
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      return toQuizQuestion(manifest, book, chosen, wordForms, includeBaseForms);
    }
  }

  const firstBook = manifest.books[0];
  const items = await loadBookMergedItems(manifestUrl, firstBook);
  return toQuizQuestion(manifest, firstBook, items[0], wordForms, includeBaseForms);
}

export async function loadSpecificQuestion(
  manifestUrl: string,
  bookId: string,
  chapter: number,
  verse: number,
  wordForms: EnabledWordForms,
  includeBaseForms = false
): Promise<QuizQuestion | null> {
  const manifest = await loadCorpusManifest(manifestUrl);
  const book = manifest.books.find((b) => b.id === bookId);
  if (!book) return null;

  const items = await loadBookMergedItems(manifestUrl, book);
  const found = items.find((it) => it.c === chapter && it.vStart <= verse && verse <= it.vEnd);
  if (!found) return null;

  return toQuizQuestion(manifest, book, found, wordForms, includeBaseForms);
}
