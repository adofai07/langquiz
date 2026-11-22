import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  evaluateAllBlanks,
  evaluateBlank,
  matchOriginalCase,
  stripPolishDiacritics,
  stripSpanishDiacritics,
} from '../services/answerCheck';
import {
  buildContextItems,
  cleanOriginalStrayQuotes,
  cleanStrayQuotes,
  filterSpansByForms,
  matchesVerbRange,
  matchesVerseRange,
  mergeSplitVerses,
} from '../services/corpusLoader';
import { resolveBlankCue } from '../services/grammarCue';
import { buildFontVariationSettings, DEFAULT_FONT_AXES } from '../config/alloAxes';
import {
  CORPORA,
  CZECH_ALPHABET,
  filterAlphabetInput,
  GERMAN_ALPHABET,
  POLISH_ALPHABET,
  SPANISH_ALPHABET,
} from '../config/catalog';
import { DualRangeSlider } from '../components/DualRangeSlider';
import { Header } from '../components/Header';
import { QuizCard } from '../components/QuizCard';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { StudyView } from '../components/StudyView';
import { getCorpusOption, getLanguageOption, LANGUAGES } from '../config/catalog';
import { GRAMMAR_GUIDES } from '../data/grammarGuides';
import { DEFAULT_SETTINGS, DEFAULT_WORD_FORMS } from '../hooks/usePersistedSettings';
import type { QuizQuestion } from '../types/quiz';

const GENESIS_3_13: QuizQuestion = {
  id: 'pl-bible-ubg:gn:3:13',
  bookIndex: 0,
  bookId: 'gn',
  bookNativeName: 'Księga Rodzaju',
  bookEnName: 'Genesis',
  chapter: 3,
  verse: 13,
  verseEnd: 13,
  verseCount: 1,
  reference: 'Księga Rodzaju (Genesis) 3:13',
  original:
    'PAN Bóg zapytał kobietę: Co zrobiłaś? I odpowiedziała kobieta: Wąż mnie zwiódł i zjadłam.',
  translation:
    'And the LORD God asked the woman: What have you done? And the woman answered: The serpent deceived me, and I ate.',
  translationSource: 'UBG → EN',
  blanks: [
    { index: 0, start: 8, end: 15, answer: 'zapytał', lemma: 'zapytać', kind: 'v' },
    { index: 1, start: 28, end: 36, answer: 'zrobiłaś', lemma: 'zrobić', kind: 'v' },
    { index: 2, start: 40, end: 53, answer: 'odpowiedziała', lemma: 'odpowiedzieć', kind: 'v' },
    { index: 3, start: 72, end: 78, answer: 'zwiódł', lemma: 'zwieść', kind: 'v' },
    { index: 4, start: 81, end: 88, answer: 'zjadłam', lemma: 'zjeść', kind: 'v' },
  ],
};

const DE_GENESIS_3_13: QuizQuestion = {
  id: 'de-bible-sch1951:gn:3:13',
  bookIndex: 0,
  bookId: 'gn',
  bookNativeName: '1. Mose',
  bookEnName: 'Genesis',
  chapter: 3,
  verse: 13,
  verseEnd: 13,
  verseCount: 1,
  reference: '1. Mose (Genesis) 3:13',
  original:
    'Da sprach Gott der HERR zum Weibe: Warum hast du das getan? Das Weib antwortete: Die Schlange verführte mich, daß ich aß!',
  translation:
    'Then the LORD God spoke to the woman: Why have you done that? The woman answered: The serpent deceived me, so that I ate!',
  translationSource: 'SCH1951 → EN',
  blanks: [
    { index: 0, start: 3, end: 9, answer: 'sprach', lemma: 'sprechen', kind: 'v' },
    { index: 1, start: 41, end: 45, answer: 'hast', lemma: 'haben', kind: 'v' },
    { index: 2, start: 53, end: 58, answer: 'getan', lemma: 'tun', kind: 'p' },
    { index: 3, start: 69, end: 79, answer: 'antwortete', lemma: 'antworten', kind: 'v' },
    { index: 4, start: 94, end: 103, answer: 'verführte', lemma: 'verführen', kind: 'v' },
    { index: 5, start: 118, end: 120, answer: 'aß', lemma: 'essen', kind: 'v' },
  ],
};

describe('answerCheck', () => {
  it('strips Polish diacritics accurately', () => {
    expect(stripPolishDiacritics('Zażółć gęślą jaźń')).toBe('zazolc gesla jazn');
  });

  it('distinguishes strict vs lenient diacritic modes', () => {
    const blank = GENESIS_3_13.blanks[1]; // zrobiłaś
    expect(evaluateBlank(blank, 'zrobiłaś', 'strict').status).toBe('exact');
    expect(evaluateBlank(blank, 'zrobilas', 'strict').status).toBe('wrong');
    expect(evaluateBlank(blank, 'zrobilas', 'lenient').status).toBe('diacritic-close');
  });

  it('grades lowercase answers as exact even when the target verb is capitalized', () => {
    expect(
      evaluateBlank(
        { index: 0, start: 0, end: 6, answer: 'Napisz', lemma: 'napisać', kind: 'v' },
        'napisz',
        'strict'
      ).status
    ).toBe('exact');
    expect(
      evaluateBlank(
        { index: 0, start: 0, end: 7, answer: 'Ćwiczył', lemma: 'ćwiczyć', kind: 'v' },
        'ćwiczył',
        'strict'
      ).status
    ).toBe('exact');
    expect(matchOriginalCase('napisz', 'Napisz', 'pl')).toBe('Napisz');
    expect(matchOriginalCase('ćwiczył', 'Ćwiczył', 'pl')).toBe('Ćwiczył');
    expect(matchOriginalCase('hat', 'Hat', 'de')).toBe('Hat');
    expect(matchOriginalCase('zapytał', 'zapytał', 'pl')).toBe('zapytał');
    // Auto-lowercases Caps Lock input when the original is not capitalized
    expect(matchOriginalCase('ZAPYTAŁ', 'zapytał', 'pl')).toBe('zapytał');
    expect(matchOriginalCase('CHCIAŁEM', 'Chciałem', 'pl')).toBe('Chciałem');
    expect(matchOriginalCase('ZAPYTAŁEM', 'zapytał', 'pl')).toBe('zapytałem');
    expect(matchOriginalCase('Aẞ', 'aß', 'de')).toBe('aß');
    expect(matchOriginalCase('pan', 'PAN', 'pl')).toBe('PAN');
  });

  it('evaluates German umlauts and eszett in strict vs lenient mode', () => {
    const assBlank = DE_GENESIS_3_13.blanks[5]; // aß
    expect(evaluateBlank(assBlank, 'aß', 'strict', 'de').status).toBe('exact');
    expect(evaluateBlank(assBlank, 'ass', 'strict', 'de').status).toBe('wrong');
    expect(evaluateBlank(assBlank, 'ass', 'lenient', 'de').status).toBe('diacritic-close');

    const ueBlank = DE_GENESIS_3_13.blanks[4]; // verführte
    expect(evaluateBlank(ueBlank, 'verfuhrte', 'lenient', 'de').status).toBe('diacritic-close');
    expect(evaluateBlank(ueBlank, 'verfuehrte', 'lenient', 'de').status).toBe('diacritic-close');
    expect(evaluateBlank(ueBlank, 'verfuehrte', 'strict', 'de').status).toBe('wrong');
  });

  it('evaluates Czech diacritics in strict vs lenient mode', () => {
    const blank = { index: 0, start: 2, end: 6, answer: 'řekl', lemma: 'říci', kind: 'v' as const };
    expect(evaluateBlank(blank, 'řekl', 'strict', 'cs').status).toBe('exact');
    expect(evaluateBlank(blank, 'rekl', 'strict', 'cs').status).toBe('wrong');
    expect(evaluateBlank(blank, 'rekl', 'lenient', 'cs').status).toBe('diacritic-close');
  });

  it('evaluates Spanish diacritics (á é í ñ ó ú ü) in strict vs lenient mode', () => {
    expect(stripSpanishDiacritics('Engañó pingüino comí')).toBe('engano pinguino comi');
    const blank = { index: 0, start: 0, end: 6, answer: 'engañó', lemma: 'engañar', kind: 'v' as const };
    expect(evaluateBlank(blank, 'engañó', 'strict', 'es').status).toBe('exact');
    expect(evaluateBlank(blank, 'engano', 'strict', 'es').status).toBe('wrong');
    expect(evaluateBlank(blank, 'engano', 'lenient', 'es').status).toBe('diacritic-close');
  });

  it('evaluates all 5 Genesis 3:13 blanks correctly', () => {
    const results = evaluateAllBlanks(
      GENESIS_3_13.blanks,
      ['zapytał', 'zrobiłaś', 'odpowiedziała', 'zwiódł', 'zjadłam'],
      'strict'
    );
    expect(results.every((r) => r.status === 'exact')).toBe(true);
  });
});

describe('alloAxes', () => {
  it('builds exact CSS font-variation-settings for Allo axes', () => {
    expect(buildFontVariationSettings(DEFAULT_FONT_AXES)).toBe(
      '"wght" 400, "ROND" 50, "opsz" 14'
    );
    expect(
      buildFontVariationSettings({ wght: 650, rond: 100, opsz: 32, opszAuto: true, tracking: 0 })
    ).toBe('"wght" 650, "ROND" 100');
  });
});

describe('QuizCard', () => {
  it('renders Genesis 3:13 blanks, accepts Polish answers, and checks result', () => {
    const onComplete = vi.fn();
    const onNext = vi.fn();

    render(
      <QuizCard
        question={GENESIS_3_13}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={onComplete}
        onNext={onNext}
      />
    );

    expect(screen.getByText(/Księga Rodzaju/)).toBeInTheDocument();
    expect(screen.getByText('zapytać')).toBeInTheDocument();
    expect(screen.getByText('zwieść')).toBeInTheDocument();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(5);

    const answers = ['zapytał', 'zrobiłaś', 'odpowiedziała', 'zwiódł', 'zjadłam'];
    answers.forEach((ans, idx) => {
      fireEvent.change(inputs[idx], { target: { value: ans } });
    });

    fireEvent.click(screen.getByRole('button', { name: /Check/i }));

    expect(onComplete).toHaveBeenCalledWith(true);
    expect(screen.getByText('Correct — 5 / 5')).toBeInTheDocument();
  });

  it('inserts Polish diacritic via helper bar or keys 1-9 without a shift button', () => {
    render(
      <QuizCard
        question={GENESIS_3_13}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /uppercase/i })).not.toBeInTheDocument();

    const firstInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.focus(firstInput);
    fireEvent.change(firstInput, { target: { value: 'zapyta' } });
    fireEvent.click(screen.getByRole('button', { name: /Insert ł/i }));
    expect(firstInput.value).toBe('zapytał');

    // Keys 1-9 insert ą ć ę ł ń ó ś ź ż directly
    const secondInput = screen.getAllByRole('textbox')[1] as HTMLInputElement;
    fireEvent.focus(secondInput);
    fireEvent.change(secondInput, { target: { value: 'zrobi' } });
    fireEvent.keyDown(secondInput, { key: '4' }); // ł
    expect(secondInput.value).toBe('zrobił');
    fireEvent.change(secondInput, { target: { value: 'zrobiła' } });
    fireEvent.keyDown(secondInput, { key: '7' }); // ś
    expect(secondInput.value).toBe('zrobiłaś');
  });

  it('rejects non-alphabet characters on keydown and paste/change', () => {
    expect(filterAlphabetInput('zapytał! 0qv x-?한글', POLISH_ALPHABET)).toBe('zapytał');

    render(
      <QuizCard
        question={GENESIS_3_13}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );

    const firstInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.focus(firstInput);

    // Non-Polish characters are prevented on keyDown
    for (const badKey of ['0', ' ', '!', '?', '-', 'q', 'v', 'x', '한']) {
      const prevented = !fireEvent.keyDown(firstInput, { key: badKey });
      expect(prevented).toBe(true);
    }

    // Valid Polish letters are allowed
    expect(fireEvent.keyDown(firstInput, { key: 'z' })).toBe(true);
    expect(fireEvent.keyDown(firstInput, { key: 'ł' })).toBe(true);

    // Pasting/changing strips any disallowed characters cleanly
    fireEvent.change(firstInput, { target: { value: 'zapytał! 123 qvx' } });
    expect(firstInput.value).toBe('zapytał');
  });

  it('supports German Genesis 3:13 with keys 1-4 for ä ö ü ß and rejects 5-9', () => {
    const onComplete = vi.fn();
    render(
      <QuizCard
        question={DE_GENESIS_3_13}
        languageCode="de"
        alphabet={GERMAN_ALPHABET}
        diacritics={['ä', 'ö', 'ü', 'ß']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={onComplete}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText(/1\. Mose/)).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(6);

    fireEvent.focus(inputs[5]);
    fireEvent.change(inputs[5], { target: { value: 'a' } });
    fireEvent.keyDown(inputs[5], { key: '4' }); // ß
    expect(inputs[5].value).toBe('aß');

    // Keys 5-9 have no German diacritic and are rejected
    expect(fireEvent.keyDown(inputs[5], { key: '5' })).toBe(false);

    ['sprach', 'hast', 'getan', 'antwortete', 'verführte'].forEach((ans, idx) => {
      fireEvent.change(inputs[idx], { target: { value: ans } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Check/i }));
    expect(onComplete).toHaveBeenCalledWith(true);
    expect(screen.getByText('Correct — 6 / 6')).toBeInTheDocument();
  });

  it('supports Czech diacritics via shortcut keys (1-9, 0, -, =, [, ], ;) and strict alphabet', () => {
    const csQuestion: QuizQuestion = {
      id: 'cs-bible-bkr:gn:3:13',
      bookIndex: 0,
      bookId: 'gn',
      bookNativeName: '1. Mojžíšova',
      bookEnName: 'Genesis',
      chapter: 3,
      verse: 13,
      verseEnd: 13,
      verseCount: 1,
      reference: '1. Mojžíšova (Genesis) 3:13',
      original: 'I řekl Hospodin Bůh ženě: Což jsi to učinila?',
      translation: 'And the LORD God said to the woman: What have you done?',
      translationSource: 'BKR → EN',
      blanks: [
        { index: 0, start: 2, end: 6, answer: 'řekl', lemma: 'říci', kind: 'v' },
        { index: 1, start: 37, end: 44, answer: 'učinila', lemma: 'učinit', kind: 'v' },
      ],
    };

    const onComplete = vi.fn();
    render(
      <QuizCard
        question={csQuestion}
        languageCode="cs"
        alphabet={CZECH_ALPHABET}
        diacritics={['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={onComplete}
        onNext={vi.fn()}
      />
    );

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.focus(inputs[0]);
    fireEvent.keyDown(inputs[0], { key: '9' }); // ř
    expect(inputs[0].value).toBe('ř');
    fireEvent.change(inputs[0], { target: { value: 'řekl' } });

    fireEvent.focus(inputs[1]);
    fireEvent.change(inputs[1], { target: { value: 'u' } });
    fireEvent.keyDown(inputs[1], { key: '2' }); // č
    expect(inputs[1].value).toBe('uč');
    fireEvent.change(inputs[1], { target: { value: 'učinila' } });

    fireEvent.click(screen.getByRole('button', { name: /Check/i }));
    expect(onComplete).toHaveBeenCalledWith(true);
    expect(screen.getByText('Correct — 2 / 2')).toBeInTheDocument();
  });

  it('supports Spanish diacritics via shortcut keys 1-7 (á é í ñ ó ú ü) and rejects 8-9', () => {
    const esQuestion: QuizQuestion = {
      id: 'es-bible-rv1909:gn:3:13',
      bookIndex: 0,
      bookId: 'gn',
      bookNativeName: 'Génesis',
      bookEnName: 'Genesis',
      chapter: 3,
      verse: 13,
      verseEnd: 13,
      verseCount: 1,
      reference: 'Génesis (Genesis) 3:13',
      original: 'La serpiente me engañó, y comí.',
      translation: 'The serpent deceived me, and I ate.',
      translationSource: 'RV1909 → EN',
      blanks: [
        { index: 0, start: 16, end: 22, answer: 'engañó', lemma: 'engañar', kind: 'v' },
        { index: 1, start: 26, end: 30, answer: 'comí', lemma: 'comer', kind: 'v' },
      ],
    };

    const onComplete = vi.fn();
    render(
      <QuizCard
        question={esQuestion}
        languageCode="es"
        alphabet={SPANISH_ALPHABET}
        diacritics={['á', 'é', 'í', 'ñ', 'ó', 'ú', 'ü']}
        diacriticMode="strict"
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={onComplete}
        onNext={vi.fn()}
      />
    );

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.focus(inputs[0]);
    fireEvent.change(inputs[0], { target: { value: 'enga' } });
    fireEvent.keyDown(inputs[0], { key: '4' }); // ñ
    expect(inputs[0].value).toBe('engañ');
    fireEvent.keyDown(inputs[0], { key: '5' }); // ó
    expect(inputs[0].value).toBe('engañó');
    expect(fireEvent.keyDown(inputs[0], { key: '8' })).toBe(false);

    fireEvent.focus(inputs[1]);
    fireEvent.change(inputs[1], { target: { value: 'com' } });
    fireEvent.keyDown(inputs[1], { key: '3' }); // í
    expect(inputs[1].value).toBe('comí');

    fireEvent.click(screen.getByRole('button', { name: /Check/i }));
    expect(onComplete).toHaveBeenCalledWith(true);
    expect(screen.getByText('Correct — 2 / 2')).toBeInTheDocument();
  });

  it('displays verb meanings inside row 03 chips according to glossMode', () => {
    const csWithRepeats: QuizQuestion = {
      id: 'cs-bible-bkr:job:31:19',
      bookIndex: 17,
      bookId: 'job',
      bookNativeName: 'Jób',
      bookEnName: 'Job',
      chapter: 31,
      verse: 19,
      verseEnd: 19,
      verseCount: 1,
      reference: 'Jób (Job) 31:19',
      original: 'Díval-li jsem se na koho, že by hynul.',
      translation: 'If I looked at anyone who was perishing.',
      translationSource: 'BKR → EN',
      blanks: [
        { index: 0, start: 0, end: 5, answer: 'Díval', lemma: 'dívat', kind: 'v' },
        { index: 1, start: 9, end: 13, answer: 'jsem', lemma: 'být', kind: 'v' },
        { index: 2, start: 29, end: 31, answer: 'by', lemma: 'být', kind: 'v' },
        { index: 3, start: 32, end: 37, answer: 'hynul', lemma: 'hynout', kind: 'v' },
      ],
    };
    const glossary = {
      dívat: 'to look, watch',
      být: 'to be',
      hynout: 'to perish',
    };

    const { rerender } = render(
      <QuizCard
        question={csWithRepeats}
        languageCode="cs"
        alphabet={CZECH_ALPHABET}
        diacritics={['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž']}
        diacriticMode="strict"
        glossMode="always"
        glossary={glossary}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText('to look, watch')).toBeInTheDocument();
    expect(screen.getByText('to perish')).toBeInTheDocument();
    expect(screen.getAllByText('to be')).toHaveLength(2);

    // Clicking the chip focuses its corresponding blank
    fireEvent.click(screen.getByText('to perish'));
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[3]);

    // In 'after-check' mode, meanings stay hidden until checked/revealed
    rerender(
      <QuizCard
        question={csWithRepeats}
        languageCode="cs"
        alphabet={CZECH_ALPHABET}
        diacritics={['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž']}
        diacriticMode="strict"
        glossMode="after-check"
        glossary={glossary}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.queryByText('to perish')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reveal/i }));
    expect(screen.getByText('to perish')).toBeInTheDocument();

    // In 'off' mode, meanings never appear
    rerender(
      <QuizCard
        question={csWithRepeats}
        languageCode="cs"
        alphabet={CZECH_ALPHABET}
        diacritics={['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž']}
        diacriticMode="strict"
        glossMode="off"
        glossary={glossary}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.queryByText('to perish')).not.toBeInTheDocument();
  });
});

describe('SettingsDrawer', () => {
  it('updates Allo variable font axes and diacritic mode', () => {
    const onChange = vi.fn();
    const onLoadExample = vi.fn();
    const onClose = vi.fn();

    render(
      <SettingsDrawer
        open={true}
        settings={DEFAULT_SETTINGS}
        manifest={null}
        onChange={onChange}
        onLoadExample={onLoadExample}
        onClose={onClose}
      />
    );

    const rondSlider = screen.getByRole('slider', { name: /Roundness/i });
    fireEvent.change(rondSlider, { target: { value: '100' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fontAxes: expect.objectContaining({ rond: 100 }),
      })
    );

    const kerningSlider = screen.getByRole('slider', { name: /Kerning/i });
    fireEvent.change(kerningSlider, { target: { value: '0.03' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fontAxes: expect.objectContaining({ tracking: 0.03 }),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lenient' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ diacriticMode: 'lenient' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'After check' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ glossMode: 'after-check' })
    );

    const nounsCheckbox = screen.getByRole('checkbox', { name: /^Nouns/i });
    fireEvent.click(nounsCheckbox);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wordFormsByLang: expect.objectContaining({
          pl: expect.objectContaining({ v: true, n: true }),
        }),
      })
    );

    // Default Polish settings should NOT show German-only Articles or Czech-only Transgressives
    expect(screen.queryByRole('checkbox', { name: /^Articles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Transgressives/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Include base' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ includeBaseForms: true })
    );

    const minVerbSlider = screen.getByRole('slider', { name: /Minimum verbs/i });
    fireEvent.keyDown(minVerbSlider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ verbRange: { min: 2, max: 5 } })
    );

    const maxVerseSlider = screen.getByRole('slider', { name: /Maximum verses/i });
    fireEvent.keyDown(maxVerseSlider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ verseRange: { min: 1, max: 4 } })
    );

    expect(matchesVerbRange(2, { min: 2, max: 5 })).toBe(true);
    expect(matchesVerbRange(1, { min: 2, max: 5 })).toBe(false);
    expect(matchesVerbRange(13, { min: 3, max: 10 })).toBe(true);
    expect(matchesVerbRange(6, { min: 1, max: 5 })).toBe(false);
    expect(matchesVerseRange(3, { min: 1, max: 3 })).toBe(true);
    expect(matchesVerseRange(4, { min: 1, max: 3 })).toBe(false);
    expect(matchesVerseRange(9, { min: 1, max: 5 })).toBe(true);

    expect(screen.getByRole('button', { name: 'Gen 3:13' })).toBeInTheDocument();
    const cuesGroup = screen.getByRole('group', { name: /Grammar cues display/i });
    const cuesOffBtn = cuesGroup.querySelectorAll('button')[1];
    fireEvent.click(cuesOffBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showGrammarCues: false })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gen 3:13' }));
    expect(onLoadExample).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows language-specific word form categories for German (Articles) and Czech (Transgressives)', () => {
    const { rerender } = render(
      <SettingsDrawer
        open={true}
        settings={{ ...DEFAULT_SETTINGS, language: 'de', corpusId: 'de-bible-sch1951' }}
        manifest={null}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox', { name: /^Articles/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Transgressives/i })).not.toBeInTheDocument();

    rerender(
      <SettingsDrawer
        open={true}
        settings={{ ...DEFAULT_SETTINGS, language: 'cs', corpusId: 'cs-bible-bkr' }}
        manifest={null}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox', { name: /^Transgressives/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Articles/i })).not.toBeInTheDocument();

    rerender(
      <SettingsDrawer
        open={true}
        settings={{ ...DEFAULT_SETTINGS, language: 'es', corpusId: 'es-bible-rv1909' }}
        manifest={null}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox', { name: /^Gerunds/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^Articles/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Transgressives/i })).not.toBeInTheDocument();

    // Base forms toggle filters spans flagged isBase=true cleanly
    const spans: [number, number, string, 'v' | 'n', boolean][] = [
      [0, 5, 'mówić', 'v', true],
      [6, 11, 'mówić', 'v', false],
      [12, 16, 'dom', 'n', true],
    ];
    const forms = { ...DEFAULT_WORD_FORMS, v: true, n: true };
    expect(filterSpansByForms(spans, forms, false)).toHaveLength(1);
    expect(filterSpansByForms(spans, forms, true)).toHaveLength(3);
  });
});

describe('mergeSplitVerses & DualRangeSlider', () => {
  it('merges consecutive mid-sentence verses and shifts verb spans accurately', () => {
    const merged = mergeSplitVerses([
      { c: 15, v: 22, o: 'Wenn ihr nicht haltet', t: 'If you do not keep', m: [[15, 21, 'halten']] },
      { c: 15, v: 23, o: 'was er geboten hat', t: 'what he commanded', m: [[7, 14, 'gebieten']] },
      { c: 15, v: 24, o: 'so soll es sein.', t: 'so shall it be.', m: [[3, 7, 'sollen']] },
      { c: 15, v: 25, o: 'Und er sprach.', t: 'And he spoke.', m: [[7, 13, 'sprechen']] },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0].vStart).toBe(22);
    expect(merged[0].vEnd).toBe(24);
    expect(merged[0].verseCount).toBe(3);
    expect(merged[0].m.map(([s, e]) => merged[0].o.slice(s, e))).toEqual([
      'haltet',
      'geboten',
      'soll',
    ]);
    expect(merged[1].vStart).toBe(25);
    expect(merged[1].verseCount).toBe(1);
  });

  it('moves both left and right when start and end thumbs overlap', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <DualRangeSlider
        idPrefix="test"
        label="Verbs"
        minLimit={1}
        maxLimit={10}
        valueMin={5}
        valueMax={5}
        scaleLabels={['1', '4', '7', '10+']}
        onChange={onChange}
      />
    );

    const group = getByRole('group', { name: /Verbs range/i });
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 90,
      width: 90,
      top: 0,
      bottom: 28,
      height: 28,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Grab overlapped thumbs at value 5 (x=40) and drag LEFT to value 3 (x=20)
    fireEvent.pointerDown(group, { clientX: 40, button: 0, pointerId: 1 });
    fireEvent.pointerMove(group, { clientX: 20, pointerId: 1 });
    fireEvent.pointerUp(group, { clientX: 20, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(3, 5);

    onChange.mockClear();

    // Grab overlapped thumbs at value 5 (x=40) and drag RIGHT to value 8 (x=70)
    fireEvent.pointerDown(group, { clientX: 40, button: 0, pointerId: 2 });
    fireEvent.pointerMove(group, { clientX: 70, pointerId: 2 });
    fireEvent.pointerUp(group, { clientX: 70, pointerId: 2 });
    expect(onChange).toHaveBeenLastCalledWith(5, 8);
  });

  it('strips stray unmatched quotation marks while preserving balanced quotes', () => {
    expect(
      cleanStrayQuotes('But to eat with unwashed hands does not defile a person."')
    ).toBe('But to eat with unwashed hands does not defile a person.');
    expect(
      cleanStrayQuotes('These are what defile a man, but eating does not defile him.”')
    ).toBe('These are what defile a man, but eating does not defile him.');
    expect(cleanStrayQuotes('“Come out of the ark.')).toBe('Come out of the ark.');
    expect(cleanStrayQuotes('He said: "Peace be with you."')).toBe(
      'He said: "Peace be with you."'
    );
    expect(
      cleanStrayQuotes('"Listen," he said, "I am coming to you for advice.')
    ).toBe('"Listen," he said, "I am coming to you for advice."');
  });

  it('registers all 38 corpora with unique IDs and valid manifest URLs', () => {
    expect(CORPORA).toHaveLength(38);
    const ids = new Set(CORPORA.map((c) => c.id));
    expect(ids.size).toBe(CORPORA.length);
    for (const c of CORPORA) {
      expect(c.manifestUrl).toBe(`/data/${c.id}/manifest.json`);
      expect(['pl', 'de', 'cs', 'es']).toContain(c.language);
    }
  });

  it('strips stray outer guillemets (like es-verne-20k 2:52) while shifting span offsets accurately', () => {
    const raw = '»El narval vulgar o unicornio marino alcanza a menudo una longitud de sesenta pies.';
    const spans: [number, number, string, 'v' | 'n', boolean][] = [
      [37, 44, 'alcanzar', 'v', false],
      [4, 10, 'narval', 'n', true],
    ];
    const cleaned = cleanOriginalStrayQuotes(raw, spans);
    expect(cleaned.original).toBe(
      'El narval vulgar o unicornio marino alcanza a menudo una longitud de sesenta pies.'
    );
    expect(cleaned.original.slice(cleaned.spans[0][0], cleaned.spans[0][1])).toBe('alcanza');
    expect(cleaned.original.slice(cleaned.spans[1][0], cleaned.spans[1][1])).toBe('narval');

    // Balanced guillemets («...» or German »...«) stay untouched
    const balanced = cleanOriginalStrayQuotes('«Hola» dijo él.', [[7, 11, 'decir', 'v', false]]);
    expect(balanced.original).toBe('«Hola» dijo él.');
    expect(balanced.original.slice(balanced.spans[0][0], balanced.spans[0][1])).toBe('dijo');

    // Stray closing guillemet in translation is also stripped
    expect(cleanStrayQuotes('»The common narwhal reaches sixty feet.')).toBe(
      'The common narwhal reaches sixty feet.'
    );
  });

  it('resolves grammatical cues across PL, CS, ES, and DE without spoiling visible pronouns', () => {
    // Polish pl-verne-20k 37:185 ("Chciałem go wziąć z sobą." -> m.)
    const verne185: QuizQuestion = {
      id: 'pl-verne-20k:ch37:37:185-185:v',
      bookIndex: 36,
      bookId: 'ch37',
      bookNativeName: '20 000 mil podmorskiej żeglugi · Biegun południowy',
      bookEnName: 'Twenty Thousand Leagues Under the Seas',
      chapter: 37,
      verse: 185,
      verseEnd: 185,
      verseCount: 1,
      reference: '20 000 mil podmorskiej żeglugi 37:185',
      original: 'Chciałem go wziąć z sobą.',
      translation: 'I wanted to take him with me.',
      translationSource: 'VERNE → EN',
      blanks: [{ index: 0, start: 0, end: 8, answer: 'Chciałem', lemma: 'chcieć', kind: 'v', cue: 'm' }],
    };
    expect(resolveBlankCue(verne185.blanks[0], verne185, 'pl')?.label).toBe('m.');

    // Polish 1sg present of -łać verbs (wołam / zdołam) must NOT falsely trigger feminine past cue
    const wolamQ: QuizQuestion = {
      ...verne185,
      original: 'Nie zdołam opisać.',
      blanks: [{ index: 0, start: 4, end: 10, answer: 'zdołam', lemma: 'zdołać', kind: 'v' }],
    };
    expect(resolveBlankCue(wolamQ.blanks[0], wolamQ, 'pl')).toBeNull();

    // German: "Du gehst" hides 'sg.' when "Du" is visible, and shows 'sg.' when Pronouns blanks "Du"
    const deVisibleDu: QuizQuestion = {
      ...verne185,
      original: 'Du gehst nach Hause.',
      blanks: [{ index: 0, start: 3, end: 8, answer: 'gehst', lemma: 'gehen', kind: 'v', cue: '2s' }],
    };
    expect(resolveBlankCue(deVisibleDu.blanks[0], deVisibleDu, 'de')).toBeNull();

    const deBlankedDu: QuizQuestion = {
      ...deVisibleDu,
      blanks: [
        { index: 0, start: 0, end: 2, answer: 'Du', lemma: 'du', kind: 'r', cue: '2s' },
        { index: 1, start: 3, end: 8, answer: 'gehst', lemma: 'gehen', kind: 'v', cue: '2s' },
      ],
    };
    expect(resolveBlankCue(deBlankedDu.blanks[0], deBlankedDu, 'de')?.label).toBe('sg.');
    expect(resolveBlankCue(deBlankedDu.blanks[1], deBlankedDu, 'de')?.label).toBe('sg.');

    // Czech vykání ("Viděl jste ho?")
    const csVykani: QuizQuestion = {
      ...verne185,
      original: 'Viděl jste ho?',
      blanks: [
        { index: 0, start: 0, end: 5, answer: 'Viděl', lemma: 'vidět', kind: 'v', cue: 'fsm' },
        { index: 1, start: 6, end: 10, answer: 'jste', lemma: 'být', kind: 'v', cue: 'fs' },
      ],
    };
    expect(resolveBlankCue(csVykani.blanks[0], csVykani, 'cs')?.label).toBe('formal m.');
    expect(resolveBlankCue(csVykani.blanks[1], csVykani, 'cs')?.label).toBe('formal');

    // Spanish 2sg/2pl ("Hablas" / "Habláis") and consistent gender.number formatting
    const esYou: QuizQuestion = {
      ...verne185,
      original: 'Habláis muy bien.',
      blanks: [{ index: 0, start: 0, end: 7, answer: 'Habláis', lemma: 'hablar', kind: 'v', cue: '2p' }],
    };
    expect(resolveBlankCue(esYou.blanks[0], esYou, 'es')?.label).toBe('pl.');

    // Consistent gender.number order: m.sg., f.sg., m.pl., non-m.pl. / f.pl.
    expect(
      resolveBlankCue(
        { index: 0, start: 0, end: 8, answer: 'zrobiłaś', lemma: 'zrobić', kind: 'v', cue: '2sf' },
        { ...verne185, original: 'Zrobiłaś to.', blanks: [] },
        'pl'
      )?.label
    ).toBe('f.sg.');
    expect(
      resolveBlankCue(
        { index: 0, start: 0, end: 11, answer: 'chcieliście', lemma: 'chcieć', kind: 'v', cue: '2pm' },
        { ...verne185, original: 'Chcieliście to.', blanks: [] },
        'pl'
      )?.label
    ).toBe('m.pl.');
    expect(
      resolveBlankCue(
        { index: 0, start: 0, end: 11, answer: 'chciałyście', lemma: 'chcieć', kind: 'v', cue: '2pf' },
        { ...verne185, original: 'Chciałyście to.', blanks: [] },
        'pl'
      )?.label
    ).toBe('non-m.pl.');
    expect(
      resolveBlankCue(
        { index: 0, start: 0, end: 8, answer: 'vosotras', lemma: 'vosotros', kind: 'r', cue: '2pf' },
        { ...verne185, original: 'Vosotras vais.', blanks: [] },
        'es'
      )?.label
    ).toBe('f.pl.');
  });

  it('renders Skip in top utility rail above grid, shows grammar cues, and toggles chapter Context', () => {
    const items = mergeSplitVerses([
      {
        c: 37,
        v: 184,
        o: 'Gdy na tym stanęło, poszedłem zobaczyć się z Nedem Landem.',
        t: 'Upon that, I went to see Ned Land.',
        m: [[20, 29, 'pójść', 'v']],
      },
      {
        c: 37,
        v: 185,
        o: 'Chciałem go wziąć z sobą.',
        t: 'I wanted to take him with me.',
        m: [[0, 8, 'chcieć', 'v', 0, 'm']],
      },
      {
        c: 37,
        v: 186,
        o: 'Uparty Kanadyjczyk odmówił.',
        t: 'The obstinate Canadian refused.',
        m: [[19, 26, 'odmówić', 'v']],
      },
    ]);
    const context = buildContextItems(items, 1);
    expect(context).toHaveLength(2);

    const question: QuizQuestion = {
      id: 'pl-verne-20k:ch37:37:185-185:v',
      bookIndex: 36,
      bookId: 'ch37',
      bookNativeName: '20 000 mil podmorskiej żeglugi · Biegun południowy',
      bookEnName: 'Twenty Thousand Leagues Under the Seas',
      chapter: 37,
      verse: 185,
      verseEnd: 185,
      verseCount: 1,
      reference: '20 000 mil podmorskiej żeglugi 37:185',
      original: 'Chciałem go wziąć z sobą.',
      translation: 'I wanted to take him with me.',
      translationSource: 'VERNE → EN',
      blanks: [{ index: 0, start: 0, end: 8, answer: 'Chciałem', lemma: 'chcieć', kind: 'v', cue: 'm' }],
      context,
    };

    const { container, rerender } = render(
      <QuizCard
        question={question}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        showGrammarCues={true}
        archaicLevel="dated"
        archaicNote="19th-c. literary Polish — contains dated forms (rzekłem, żem, ów, mą)."
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );

    // Top utility rail has Show Context on the left and Skip → constantly on the right above .quiz-grid
    const topBar = container.querySelector('.quiz-top-bar');
    expect(topBar).not.toBeNull();
    const topButtons = topBar?.querySelectorAll('button');
    expect(topButtons).toHaveLength(2);
    expect(topButtons?.[0].textContent).toBe('Show context');
    expect(topButtons?.[1].textContent).toBe('Skip →');

    // Compact Dated tag renders cleanly inside Row 01 Reference without long explanation text
    const datedTag = screen.getByText('Dated');
    expect(datedTag).toBeInTheDocument();
    expect(screen.queryByText(/19th-c\. literary Polish/)).not.toBeInTheDocument();

    // Grammar cue badge renders cleanly on row 03 chip
    expect(screen.getByText('m.')).toBeInTheDocument();

    // Context is hidden until toggled via Show context
    expect(screen.queryByText(/poszedłem zobaczyć się/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show context' }));
    expect(screen.getByRole('button', { name: 'Hide context' })).toBeInTheDocument();
    expect(screen.getByText(/poszedłem zobaczyć się/)).toBeInTheDocument();
    expect(screen.getByText(/Upon that, I went to see Ned Land\./)).toBeInTheDocument();
    expect(screen.getByText(/Uparty Kanadyjczyk odmówił\./)).toBeInTheDocument();

    // Turning off showGrammarCues hides the cue badge cleanly
    rerender(
      <QuizCard
        question={question}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        showGrammarCues={false}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    expect(screen.queryByText('m.')).not.toBeInTheDocument();
  });

  it('autofocuses the active blank on new questions, on returning active, and when typing anywhere', async () => {
    const q1: QuizQuestion = {
      ...GENESIS_3_13,
      id: 'q1',
      blanks: [{ index: 0, start: 8, end: 15, answer: 'zapytał', lemma: 'zapytać', kind: 'v' }],
    };
    const q2: QuizQuestion = {
      ...GENESIS_3_13,
      id: 'q2',
      original: 'Chciałem go wziąć z sobą.',
      blanks: [{ index: 0, start: 0, end: 8, answer: 'Chciałem', lemma: 'chcieć', kind: 'v', cue: 'm' }],
    };

    const { rerender } = render(
      <QuizCard
        question={q1}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        isActive={true}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0]);
    });

    // Switching directly to a new question (like Skip ->) keeps blank 0 focused
    (document.activeElement as HTMLElement)?.blur();
    rerender(
      <QuizCard
        question={q2}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        isActive={true}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });

    // Type-anywhere autofocus captures letters & diacritic shortcuts even after blur
    input.blur();
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(document.body, { key: 'c' });
    expect(document.activeElement).toBe(input);
    input.blur();
    fireEvent.keyDown(window, { key: 'h' });
    input.blur();
    fireEvent.keyDown(document.body, { key: '4' }); // ł
    expect(input.value).toBe('Chł');

    // Returning from Study/Settings (isActive false -> true) restores focus
    input.blur();
    rerender(
      <QuizCard
        question={q2}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        isActive={false}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    rerender(
      <QuizCard
        question={q2}
        languageCode="pl"
        alphabet={POLISH_ALPHABET}
        diacritics={['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż']}
        diacriticMode="strict"
        isActive={true}
        wordForms={DEFAULT_WORD_FORMS}
        onComplete={vi.fn()}
        onNext={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  it('displays compact archaic corpus tag inside SettingsDrawer corpus selector', () => {
    render(
      <SettingsDrawer
        open={true}
        settings={{ ...DEFAULT_SETTINGS, language: 'cs', corpusId: 'cs-bible-bkr' }}
        manifest={null}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Archaic')).toBeInTheDocument();
    expect(screen.queryByText(/Archaic 16th-c\. Czech/)).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bible (Kralická) [Archaic]' })).toBeInTheDocument();
  });

  it('toggles Quiz / Study mode in the Header and renders grammar tables for all 4 languages', () => {
    const onChangeMode = vi.fn();
    render(
      <Header
        language={getLanguageOption('pl')}
        corpus={getCorpusOption('pl-verne-20k')}
        viewMode="quiz"
        solvedCount={3}
        attemptedCount={4}
        resolvedTheme="light"
        settingsOpen={false}
        onChangeViewMode={onChangeMode}
        onToggleTheme={vi.fn()}
        onToggleSettings={vi.fn()}
      />
    );

    const quizTab = screen.getByRole('tab', { name: 'Quiz' });
    const studyTab = screen.getByRole('tab', { name: 'Study' });
    expect(quizTab).toHaveAttribute('aria-selected', 'true');
    expect(studyTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(studyTab);
    expect(onChangeMode).toHaveBeenCalledWith('study');

    // StudyView renders full verb + non-verb grammar tables across all 4 languages
    for (const lang of LANGUAGES) {
      const secs = GRAMMAR_GUIDES[lang.code].sections;
      expect(secs.length).toBeGreaterThanOrEqual(11);
      // Section 01 includes both conjugation table and infinitive recognition guide
      expect(secs[0].tables.length).toBeGreaterThanOrEqual(2);
      expect(secs.some((s) => s.category === 'verbs')).toBe(true);
      expect(secs.some((s) => s.category === 'nouns')).toBe(true);
      expect(secs.some((s) => s.category === 'adj-pron')).toBe(true);
      expect(secs.some((s) => s.category === 'rules')).toBe(true);
    }

    const onBack = vi.fn();
    render(<StudyView language={getLanguageOption('pl')} onBackToQuiz={onBack} />);
    expect(screen.getByText('Polish Inflection Reference')).toBeInTheDocument();
    expect(screen.getByText('Past Endings (Example: chcieć — to want)')).toBeInTheDocument();

    // Category filter isolates Nouns & Cases cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Nouns & Cases' }));
    expect(screen.queryByText('Past Endings (Example: chcieć — to want)')).not.toBeInTheDocument();
    expect(screen.getByText('Identifying Noun Gender')).toBeInTheDocument();
    expect(screen.getByText('Prepositions by Governed Case')).toBeInTheDocument();

    // Switching back to All and filtering to Past Tense hides unrelated Present section
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: /02\s*Past Tense/i }));
    expect(screen.queryByText('Four Present Conjugation Classes')).not.toBeInTheDocument();
    expect(screen.getByText('Past Endings (Example: chcieć — to want)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to Quiz/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
