import type { LanguageCode, QuizQuestion, VerbBlank } from '../types/quiz';

export interface ResolvedGrammarCue {
  label: string;
  title: string;
}

/**
 * Format a compact corpus cue code into a concise Swiss badge + accessible description.
 */
export function formatCueCode(
  code: string,
  languageCode: LanguageCode
): ResolvedGrammarCue | null {
  const isSlavic = languageCode === 'pl' || languageCode === 'cs';
  switch (code) {
    case 'm':
      return { label: 'm.', title: 'Masculine singular' };
    case 'f':
      return { label: 'f.', title: 'Feminine singular' };
    case 'n':
      return { label: 'n.', title: 'Neuter singular' };
    case 'mp':
      return {
        label: 'm.pl.',
        title: isSlavic ? 'Masculine-personal plural' : 'Masculine plural',
      };
    case 'fp':
      return isSlavic
        ? { label: 'non-m.pl.', title: 'Non-masculine-personal plural' }
        : { label: 'f.pl.', title: 'Feminine plural' };
    case 'np':
      return { label: 'n.pl.', title: 'Neuter plural' };
    case '2s':
      return { label: 'sg.', title: 'Singular informal (you)' };
    case '2sm':
      return { label: 'm.sg.', title: 'Masculine singular (you)' };
    case '2sf':
      return { label: 'f.sg.', title: 'Feminine singular (you)' };
    case '2sn':
      return { label: 'n.sg.', title: 'Neuter singular (you)' };
    case '2p':
      return {
        label: 'pl.',
        title: languageCode === 'cs' ? 'Plural / formal (you)' : 'Plural (you)',
      };
    case '2pm':
      return {
        label: 'm.pl.',
        title: isSlavic ? 'Masculine-personal plural (you)' : 'Masculine plural (you)',
      };
    case '2pf':
      return isSlavic
        ? { label: 'non-m.pl.', title: 'Non-masculine-personal plural (you)' }
        : { label: 'f.pl.', title: 'Feminine plural (you)' };
    case 'fs':
      return { label: 'formal', title: 'Formal singular (you)' };
    case 'fsm':
      return { label: 'formal m.', title: 'Formal singular masculine (you)' };
    case 'fsf':
      return { label: 'formal f.', title: 'Formal singular feminine (you)' };
    case 'fp2':
      return { label: 'formal pl.', title: 'Formal plural (you)' };
    case 'pl':
      return { label: 'pl.', title: 'Plural' };
    case 'inf':
      return { label: 'inf.', title: 'Infinitive (compound future)' };
    default:
      return null;
  }
}

/**
 * Replace blanked word spans with spaces so we can inspect which explicit
 * subject pronouns (e.g. du / ihr / Sie / ty / wy / vy / tú / usted) are
 * currently visible in the unblanked sentence text.
 */
function buildVisibleSentence(question: QuizQuestion): string {
  const chars = Array.from(question.original);
  for (const b of question.blanks) {
    for (let i = Math.max(0, b.start); i < Math.min(chars.length, b.end); i++) {
      chars[i] = ' ';
    }
  }
  return chars.join('');
}

function hasVisiblePronoun(visibleText: string, pattern: RegExp): boolean {
  return pattern.test(visibleText);
}

const VISIBLE_2SG_PRON: Record<LanguageCode, RegExp> = {
  pl: /(?:^|[^\p{L}])ty(?:$|[^\p{L}])/iu,
  cs: /(?:^|[^\p{L}])ty(?:$|[^\p{L}])/iu,
  es: /(?:^|[^\p{L}])tú(?:$|[^\p{L}])/iu,
  de: /(?:^|[^\p{L}])du(?:$|[^\p{L}])/iu,
};

const VISIBLE_2PL_PRON: Record<LanguageCode, RegExp> = {
  pl: /(?:^|[^\p{L}])wy(?:$|[^\p{L}])/iu,
  cs: /(?:^|[^\p{L}])vy(?:$|[^\p{L}])/iu,
  es: /(?:^|[^\p{L}])vosotr[oa]s(?:$|[^\p{L}])/iu,
  de: /(?:^|[^\p{L}])ihr(?:$|[^\p{L}])/iu,
};

const VISIBLE_FORMAL_SG_PRON: Record<LanguageCode, RegExp> = {
  pl: /(?:^|[^\p{L}])(?:pan|pani)(?:$|[^\p{L}])/iu,
  cs: /(?:^|[^\p{L}])vy(?:$|[^\p{L}])/iu,
  es: /(?:^|[^\p{L}])(?:usted|ud\.|vd\.)(?:$|[^\p{L}])/iu,
  de: /(?:^|[^\p{L}])Sie(?:$|[^\p{L}])/u,
};

const VISIBLE_FORMAL_PL_PRON: Record<LanguageCode, RegExp> = {
  pl: /(?:^|[^\p{L}])państwo(?:$|[^\p{L}])/iu,
  cs: /(?:^|[^\p{L}])vy(?:$|[^\p{L}])/iu,
  es: /(?:^|[^\p{L}])(?:ustedes|uds\.|vds\.)(?:$|[^\p{L}])/iu,
  de: /(?:^|[^\p{L}])Sie(?:$|[^\p{L}])/u,
};

/**
 * Lightweight, false-positive-free fallback for Polish fused 1st/2nd-person past/conditional
 * verbs when a question fixture does not carry pre-tagged corpus cues.
 */
function inferPolishFallbackCue(blank: VerbBlank): string | undefined {
  if (blank.kind !== 'v' || blank.isBase) return undefined;
  const wl = blank.answer.toLocaleLowerCase('pl');
  const lem = blank.lemma.toLocaleLowerCase('pl');
  if (/(?:łem|łbym)$/.test(wl)) return 'm';
  if (/(?:łam|łabym)$/.test(wl)) {
    // Guard against 1sg present/future of -łać verbs (wołam, zdołam, posyłam) and imperative 'łam'
    if (wl === 'łam' || (lem.endsWith('łać') && !wl.endsWith('łałam') && !wl.endsWith('łałabym'))) {
      return undefined;
    }
    return 'f';
  }
  if (/(?:łom|łobym)$/.test(wl)) return 'n';
  if (/(?:łeś|łbyś)$/.test(wl)) return '2sm';
  if (/(?:łaś|łabyś)$/.test(wl)) return '2sf';
  if (/(?:łoś|łobyś)$/.test(wl)) return '2sn';
  if (/(?:liśmy|libyśmy)$/.test(wl)) return 'mp';
  if (/(?:łyśmy|łybyśmy)$/.test(wl)) return 'fp';
  if (/(?:liście|libyście)$/.test(wl)) return '2pm';
  if (/(?:łyście|łybyście)$/.test(wl)) return '2pf';
  return undefined;
}

/**
 * Resolve the minimal grammatical cue to display for a blank, hiding any
 * person/number/formality cue that is already explicitly visible in the
 * unblanked text (e.g. visible "Du" in German or "usted" in Spanish).
 */
export function resolveBlankCue(
  blank: VerbBlank,
  question: QuizQuestion,
  languageCode: LanguageCode
): ResolvedGrammarCue | null {
  let code = blank.cue;
  if (!code && languageCode === 'pl') {
    code = inferPolishFallbackCue(blank);
  }
  if (!code) return null;

  // For verb blanks, dynamically suppress redundant "you" number/formality if the subject pronoun is visible
  if (blank.kind === 'v') {
    const visible = buildVisibleSentence(question);

    if (code === '2s' && hasVisiblePronoun(visible, VISIBLE_2SG_PRON[languageCode])) {
      return null;
    }
    if (code === '2p' && hasVisiblePronoun(visible, VISIBLE_2PL_PRON[languageCode])) {
      return null;
    }
    if (code === 'fs' && hasVisiblePronoun(visible, VISIBLE_FORMAL_SG_PRON[languageCode])) {
      return null;
    }
    if (code === 'fp2' && hasVisiblePronoun(visible, VISIBLE_FORMAL_PL_PRON[languageCode])) {
      return null;
    }
    // Combined person + gender: if pronoun is visible, keep ONLY the hidden gender!
    if (code === '2sm' && hasVisiblePronoun(visible, VISIBLE_2SG_PRON[languageCode])) {
      code = 'm';
    } else if (code === '2sf' && hasVisiblePronoun(visible, VISIBLE_2SG_PRON[languageCode])) {
      code = 'f';
    } else if (code === '2sn' && hasVisiblePronoun(visible, VISIBLE_2SG_PRON[languageCode])) {
      code = 'n';
    } else if (code === '2pm' && hasVisiblePronoun(visible, VISIBLE_2PL_PRON[languageCode])) {
      code = 'mp';
    } else if (code === '2pf' && hasVisiblePronoun(visible, VISIBLE_2PL_PRON[languageCode])) {
      code = 'fp';
    } else if (code === 'fsm' && hasVisiblePronoun(visible, VISIBLE_FORMAL_SG_PRON[languageCode])) {
      code = 'm';
    } else if (code === 'fsf' && hasVisiblePronoun(visible, VISIBLE_FORMAL_SG_PRON[languageCode])) {
      code = 'f';
    }
  }

  return formatCueCode(code, languageCode);
}
