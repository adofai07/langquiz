export type LanguageCode = 'pl' | 'de' | 'cs' | 'es';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  alphabet: string;
  diacritics: string[];
  specimen: string;
  wordFormCategories: WordFormKind[];
  available: boolean;
}

export interface CorpusExampleRef {
  bookId: string;
  chapter: number;
  verse: number;
  label: string;
}

export interface CorpusOption {
  id: string;
  language: LanguageCode;
  name: string;
  shortLabel: string;
  description: string;
  manifestUrl: string;
  unit?: 'verse' | 'sentence';
  exampleRef?: CorpusExampleRef;
  available: boolean;
}

export interface CorpusBookMeta {
  index: number;
  id: string;
  nativeName?: string;
  plName?: string;
  enName: string;
  chunkFile: string;
  verseCount: number;
}

export interface CorpusManifest {
  id: string;
  language: LanguageCode;
  title: string;
  subtitle: string;
  translationSource: string;
  unit?: 'verse' | 'sentence';
  totalVerses: number;
  quizVerses: number;
  totalVerbs: number;
  books: CorpusBookMeta[];
}

export type WordFormKind = 'v' | 'p' | 'g' | 't' | 'd' | 'n' | 'a' | 'r';

export type EnabledWordForms = Record<WordFormKind, boolean>;

export const WORD_FORM_META: {
  kind: WordFormKind;
  label: string;
  shortTag: string;
}[] = [
  { kind: 'v', label: 'Verbs', shortTag: 'V' },
  { kind: 'p', label: 'Participles', shortTag: 'P' },
  { kind: 'g', label: 'Gerunds', shortTag: 'GER' },
  { kind: 't', label: 'Transgressives', shortTag: 'T' },
  { kind: 'd', label: 'Articles', shortTag: 'ART' },
  { kind: 'n', label: 'Nouns', shortTag: 'N' },
  { kind: 'a', label: 'Adjectives', shortTag: 'A' },
  { kind: 'r', label: 'Pronouns', shortTag: 'R' },
];

export type RawCorpusSpan = [number, number, string, WordFormKind?, (0 | 1)?];

export interface RawCorpusEntry {
  /** Chapter (1-based) */
  c: number;
  /** Verse (1-based) */
  v: number;
  /** Original sentence */
  o: string;
  /** English translation */
  t: string;
  /** Word spans: [startChar, endChar, lemma, kind?, isBase?] */
  m: RawCorpusSpan[];
}

export interface VerbBlank {
  index: number;
  start: number;
  end: number;
  answer: string;
  lemma: string;
  kind: WordFormKind;
  isBase?: boolean;
}

export interface QuizQuestion {
  id: string;
  bookIndex: number;
  bookId: string;
  bookNativeName: string;
  bookEnName: string;
  chapter: number;
  verse: number;
  verseEnd: number;
  verseCount: number;
  reference: string;
  original: string;
  translation: string;
  translationSource: string;
  blanks: VerbBlank[];
}

export interface AlloFontAxes {
  wght: number;
  rond: number;
  opsz: number;
  opszAuto: boolean;
  /** Extra letter-spacing / kerning adjustment in em (e.g. -0.04 .. +0.12). */
  tracking: number;
}

export type DiacriticMode = 'strict' | 'lenient';
export type ThemeMode = 'system' | 'light' | 'dark';
export type GlossMode = 'always' | 'after-check' | 'off';

export const VERB_RANGE_MIN = 1;
/** Upper slider stop; max === VERB_RANGE_MAX represents 10+ (unbounded upper limit). */
export const VERB_RANGE_MAX = 10;

export const VERSE_RANGE_MIN = 1;
/** Upper slider stop; max === VERSE_RANGE_MAX represents 5+ (unbounded upper limit). */
export const VERSE_RANGE_MAX = 5;

export interface CountRange {
  min: number;
  max: number;
}

export type VerbRange = CountRange;
export type VerseRange = CountRange;

export interface AppSettings {
  language: LanguageCode;
  corpusId: string;
  fontAxes: AlloFontAxes;
  diacriticMode: DiacriticMode;
  glossMode: GlossMode;
  wordFormsByLang: Record<LanguageCode, EnabledWordForms>;
  includeBaseForms: boolean;
  verbRange: VerbRange;
  verseRange: VerseRange;
  theme: ThemeMode;
}

export type BlankResultStatus = 'exact' | 'diacritic-close' | 'wrong' | 'revealed';

export interface BlankEvaluation {
  status: BlankResultStatus;
  expected: string;
  given: string;
  lemma: string;
}
