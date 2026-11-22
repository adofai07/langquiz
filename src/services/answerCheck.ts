import type { BlankEvaluation, DiacriticMode, LanguageCode, VerbBlank } from '../types/quiz';

const POLISH_DIACRITIC_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

const CZECH_DIACRITIC_MAP: Record<string, string> = {
  á: 'a',
  č: 'c',
  ď: 'd',
  é: 'e',
  ě: 'e',
  í: 'i',
  ň: 'n',
  ó: 'o',
  ř: 'r',
  š: 's',
  ť: 't',
  ú: 'u',
  ů: 'u',
  ý: 'y',
  ž: 'z',
};

const SPANISH_DIACRITIC_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ñ: 'n',
  ó: 'o',
  ú: 'u',
  ü: 'u',
};

export function normalizeWord(value: string, language: LanguageCode = 'pl'): string {
  // Handle German capital ẞ cleanly alongside locale lowercase
  const trimmed = value.trim().replace(/ẞ/g, 'ß');
  return trimmed.toLocaleLowerCase(language);
}

/**
 * Automatically match each character position's case to the original answer:
 * - Uppercase where the original has an uppercase letter (e.g. sentence-initial "Chciałem", "Napisz", "PAN").
 * - Lowercase where the original is lowercase (e.g. when Caps Lock is accidentally enabled).
 */
export function matchOriginalCase(
  value: string,
  expected: string,
  language: LanguageCode = 'pl'
): string {
  if (!value || !expected) return value;
  const valChars = Array.from(value);
  const expChars = Array.from(expected);
  const isUpper = (c: string) =>
    c !== c.toLocaleLowerCase(language) && c === c.toLocaleUpperCase(language);
  const allExpUpper = expChars.every((c) => isUpper(c));

  return valChars
    .map((ch, idx) => {
      const exp = expChars[idx];
      const shouldBeUpper = exp ? isUpper(exp) : allExpUpper;
      if (shouldBeUpper) {
        return ch === 'ß' ? ch : ch.toLocaleUpperCase(language);
      }
      return ch === 'ẞ' ? 'ß' : ch.toLocaleLowerCase(language);
    })
    .join('');
}

export function stripPolishDiacritics(value: string): string {
  return normalizeWord(value, 'pl').replace(/[ąćęłńóśźż]/g, (ch) => POLISH_DIACRITIC_MAP[ch] ?? ch);
}

/**
 * Fold German umlauts and eszett for lenient comparison:
 * accepts both plain base vowels (wäre -> ware) and standard digraphs (wäre -> waere, aß -> ass).
 */
export function foldGermanVariants(value: string): string[] {
  const norm = normalizeWord(value, 'de');
  const baseVowel = norm
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
  const digraph = norm
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  return baseVowel === digraph ? [baseVowel] : [baseVowel, digraph];
}

export function stripCzechDiacritics(value: string): string {
  return normalizeWord(value, 'cs').replace(
    /[áčďéěíňóřšťúůýž]/g,
    (ch) => CZECH_DIACRITIC_MAP[ch] ?? ch
  );
}

export function stripSpanishDiacritics(value: string): string {
  return normalizeWord(value, 'es').replace(
    /[áéíñóúü]/g,
    (ch) => SPANISH_DIACRITIC_MAP[ch] ?? ch
  );
}

function matchesLenient(givenRaw: string, expectedRaw: string, language: LanguageCode): boolean {
  if (language === 'de') {
    const givenForms = foldGermanVariants(givenRaw);
    const expectedForms = foldGermanVariants(expectedRaw);
    return givenForms.some((g) => expectedForms.includes(g));
  }
  if (language === 'cs') {
    return stripCzechDiacritics(givenRaw) === stripCzechDiacritics(expectedRaw);
  }
  if (language === 'es') {
    return stripSpanishDiacritics(givenRaw) === stripSpanishDiacritics(expectedRaw);
  }
  return stripPolishDiacritics(givenRaw) === stripPolishDiacritics(expectedRaw);
}

export function evaluateBlank(
  blank: VerbBlank,
  givenRaw: string,
  diacriticMode: DiacriticMode,
  language: LanguageCode = 'pl'
): BlankEvaluation {
  const expectedNorm = normalizeWord(blank.answer, language);
  const givenNorm = normalizeWord(givenRaw, language);

  if (givenNorm === expectedNorm) {
    return {
      status: 'exact',
      expected: blank.answer,
      given: givenRaw.trim(),
      lemma: blank.lemma,
    };
  }

  if (
    diacriticMode === 'lenient' &&
    givenNorm.length > 0 &&
    matchesLenient(givenRaw, blank.answer, language)
  ) {
    return {
      status: 'diacritic-close',
      expected: blank.answer,
      given: givenRaw.trim(),
      lemma: blank.lemma,
    };
  }

  return {
    status: 'wrong',
    expected: blank.answer,
    given: givenRaw.trim(),
    lemma: blank.lemma,
  };
}

export function evaluateAllBlanks(
  blanks: VerbBlank[],
  inputs: string[],
  diacriticMode: DiacriticMode,
  language: LanguageCode = 'pl'
): BlankEvaluation[] {
  return blanks.map((blank, idx) => evaluateBlank(blank, inputs[idx] ?? '', diacriticMode, language));
}

export function isEvaluationCorrect(ev: BlankEvaluation): boolean {
  return ev.status === 'exact' || ev.status === 'diacritic-close';
}
