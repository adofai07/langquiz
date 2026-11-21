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

export interface MergedCorpusItem {
  c: number;
  vStart: number;
  vEnd: number;
  verseCount: number;
  o: string;
  t: string;
  m: [number, number, string, WordFormKind][];
  /** True when the merged unit begins cleanly (not orphaned mid-sentence after a missing verse). */
  cleanStart: boolean;
}

const manifestCache = new Map<string, CorpusManifest>();
const mergedChunkCache = new Map<string, MergedCorpusItem[]>();

const SENTENCE_END_RE = /[.!?][»”"'\)\]]*\s*$/;

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
      for (const [start, end, lemma, kind] of entry.m) {
        prev.m.push([start + offset, end + offset, lemma, kind ?? 'v']);
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
        m: entry.m.map(([s, e, l, k]) => [s, e, l, k ?? 'v']),
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
  spans: [number, number, string, WordFormKind][],
  wordForms: EnabledWordForms
): [number, number, string, WordFormKind][] {
  return spans.filter(([, , , kind]) => Boolean(wordForms[kind]));
}

export function toQuizQuestion(
  manifest: CorpusManifest,
  book: CorpusBookMeta,
  item: MergedCorpusItem,
  wordForms: EnabledWordForms
): QuizQuestion {
  const activeSpans = filterSpansByForms(item.m, wordForms);
  // If an explicitly loaded deep-link has 0 spans in the selected categories, fall back to all spans on that verse
  const chosenSpans = activeSpans.length > 0 ? activeSpans : item.m;

  const blanks: VerbBlank[] = chosenSpans.map(([start, end, lemma, kind], index) => ({
    index,
    start,
    end,
    answer: item.o.slice(start, end),
    lemma,
    kind,
  }));

  const bookNativeName = book.nativeName ?? book.plName ?? book.enName;
  const verseLabel =
    item.vStart === item.vEnd ? `${item.c}:${item.vStart}` : `${item.c}:${item.vStart}–${item.vEnd}`;
  const formsKey = (['v', 'p', 'n', 'a', 'r'] as WordFormKind[])
    .filter((k) => wordForms[k])
    .join('');

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
    translation: item.t,
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
  verbRange: VerbRange,
  verseRange: VerseRange
): boolean {
  const count = filterSpansByForms(item.m, wordForms).length;
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
    const matching = items.filter((it) => matchesFilters(it, wordForms, verbRange, verseRange));
    if (matching.length === 0) continue;

    const fresh = matching.filter(
      (it) => !recentIds.has(`${manifest.id}:${book.id}:${it.c}:${it.vStart}-${it.vEnd}`)
    );
    const pool = fresh.length > 0 ? fresh : matching;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return toQuizQuestion(manifest, book, chosen, wordForms);
  }

  for (const book of manifest.books) {
    if (triedBooks.has(book.id)) continue;
    const items = await loadBookMergedItems(manifestUrl, book);
    const matching = items.filter((it) => matchesFilters(it, wordForms, verbRange, verseRange));
    if (matching.length > 0) {
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      return toQuizQuestion(manifest, book, chosen, wordForms);
    }
  }

  for (const book of manifest.books) {
    const items = await loadBookMergedItems(manifestUrl, book);
    const matching = items.filter(
      (it) => filterSpansByForms(it.m, wordForms).length > 0
    );
    if (matching.length > 0) {
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      return toQuizQuestion(manifest, book, chosen, wordForms);
    }
  }

  const firstBook = manifest.books[0];
  const items = await loadBookMergedItems(manifestUrl, firstBook);
  return toQuizQuestion(manifest, firstBook, items[0], wordForms);
}

export async function loadSpecificQuestion(
  manifestUrl: string,
  bookId: string,
  chapter: number,
  verse: number,
  wordForms: EnabledWordForms
): Promise<QuizQuestion | null> {
  const manifest = await loadCorpusManifest(manifestUrl);
  const book = manifest.books.find((b) => b.id === bookId);
  if (!book) return null;

  const items = await loadBookMergedItems(manifestUrl, book);
  const found = items.find((it) => it.c === chapter && it.vStart <= verse && verse <= it.vEnd);
  if (!found) return null;

  return toQuizQuestion(manifest, book, found, wordForms);
}
