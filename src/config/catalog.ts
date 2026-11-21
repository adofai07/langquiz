import type { CorpusOption, LanguageOption } from '../types/quiz';

export const POLISH_ALPHABET =
  'aąbcćdeęfghijklłmnńoóprsśtuwyzźżAĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';

export const GERMAN_ALPHABET =
  'aäbcdefghijklmnoöpqrsßtuüvwxyzAÄBCDEFGHIJKLMNOÖPQRSẞTUÜVWXYZ';

export const CZECH_ALPHABET =
  'aábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzžAÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPQRŘSŠTŤUÚŮVWXYÝZŽ';

/**
 * Keyboard shortcut keys assigned in order to each language's diacritics:
 * - Polish (9):  1–9
 * - German (4):  1–4
 * - Czech  (15): 1–9, 0, -, =, [, ], ;
 */
export const DIACRITIC_SHORTCUT_KEYS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '[', ']', ';',
] as const;

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    alphabet: POLISH_ALPHABET,
    diacritics: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'],
    specimen: 'PAN Bóg zapytał · ołtarzu',
    available: true,
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    alphabet: GERMAN_ALPHABET,
    diacritics: ['ä', 'ö', 'ü', 'ß'],
    specimen: 'Da sprach Gott der HERR — 3:13',
    available: true,
  },
  {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    alphabet: CZECH_ALPHABET,
    diacritics: ['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž'],
    specimen: 'I řekl Hospodin Bůh — 3:13',
    available: true,
  },
];

export function filterAlphabetInput(value: string, alphabet: string): string {
  let out = '';
  for (const ch of value) {
    if (alphabet.includes(ch)) {
      out += ch;
    }
  }
  return out;
}

export const CORPORA: CorpusOption[] = [
  {
    id: 'pl-bible-ubg',
    language: 'pl',
    name: 'Bible (UBG)',
    shortLabel: 'BIBLE',
    description: 'Uwspółcześniona Biblia Gdańska · Direct English',
    manifestUrl: '/data/pl-bible-ubg/manifest.json',
    available: true,
  },
  {
    id: 'de-bible-sch1951',
    language: 'de',
    name: 'Bible (Schlachter 1951)',
    shortLabel: 'BIBLE',
    description: 'Schlachter 1951 · Direct English',
    manifestUrl: '/data/de-bible-sch1951/manifest.json',
    available: true,
  },
  {
    id: 'cs-bible-bkr',
    language: 'cs',
    name: 'Bible (Kralická)',
    shortLabel: 'BIBLE',
    description: 'Bible kralická · Direct English',
    manifestUrl: '/data/cs-bible-bkr/manifest.json',
    available: true,
  },
];

export function getLanguageOption(code: string): LanguageOption {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function getCorporaForLanguage(code: string): CorpusOption[] {
  return CORPORA.filter((c) => c.language === code);
}

export function getCorpusOption(corpusId: string): CorpusOption {
  return CORPORA.find((c) => c.id === corpusId) ?? CORPORA[0];
}
