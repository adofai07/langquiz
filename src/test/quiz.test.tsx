import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  evaluateAllBlanks,
  evaluateBlank,
  matchOriginalCase,
  stripPolishDiacritics,
} from '../services/answerCheck';
import { matchesVerbRange, matchesVerseRange, mergeSplitVerses } from '../services/corpusLoader';
import { buildFontVariationSettings, DEFAULT_FONT_AXES } from '../config/alloAxes';
import {
  CZECH_ALPHABET,
  filterAlphabetInput,
  GERMAN_ALPHABET,
  POLISH_ALPHABET,
} from '../config/catalog';
import { DualRangeSlider } from '../components/DualRangeSlider';
import { QuizCard } from '../components/QuizCard';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { DEFAULT_SETTINGS } from '../hooks/usePersistedSettings';
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
    { index: 0, start: 8, end: 15, answer: 'zapytał', lemma: 'zapytać' },
    { index: 1, start: 28, end: 36, answer: 'zrobiłaś', lemma: 'zrobić' },
    { index: 2, start: 40, end: 53, answer: 'odpowiedziała', lemma: 'odpowiedzieć' },
    { index: 3, start: 72, end: 78, answer: 'zwiódł', lemma: 'zwieść' },
    { index: 4, start: 81, end: 88, answer: 'zjadłam', lemma: 'zjeść' },
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
    { index: 0, start: 3, end: 9, answer: 'sprach', lemma: 'sprechen' },
    { index: 1, start: 41, end: 45, answer: 'hast', lemma: 'haben' },
    { index: 2, start: 53, end: 58, answer: 'getan', lemma: 'tun' },
    { index: 3, start: 69, end: 79, answer: 'antwortete', lemma: 'antworten' },
    { index: 4, start: 94, end: 103, answer: 'verführte', lemma: 'verführen' },
    { index: 5, start: 118, end: 120, answer: 'aß', lemma: 'essen' },
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
        { index: 0, start: 0, end: 6, answer: 'Napisz', lemma: 'napisać' },
        'napisz',
        'strict'
      ).status
    ).toBe('exact');
    expect(
      evaluateBlank(
        { index: 0, start: 0, end: 7, answer: 'Ćwiczył', lemma: 'ćwiczyć' },
        'ćwiczył',
        'strict'
      ).status
    ).toBe('exact');
    expect(matchOriginalCase('napisz', 'Napisz', 'pl')).toBe('Napisz');
    expect(matchOriginalCase('ćwiczył', 'Ćwiczył', 'pl')).toBe('Ćwiczył');
    expect(matchOriginalCase('hat', 'Hat', 'de')).toBe('Hat');
    expect(matchOriginalCase('zapytał', 'zapytał', 'pl')).toBe('zapytał');
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
    const blank = { index: 0, start: 2, end: 6, answer: 'řekl', lemma: 'říci' };
    expect(evaluateBlank(blank, 'řekl', 'strict', 'cs').status).toBe('exact');
    expect(evaluateBlank(blank, 'rekl', 'strict', 'cs').status).toBe('wrong');
    expect(evaluateBlank(blank, 'rekl', 'lenient', 'cs').status).toBe('diacritic-close');
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
      buildFontVariationSettings({ wght: 650, rond: 100, opsz: 32, opszAuto: true })
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
        { index: 0, start: 2, end: 6, answer: 'řekl', lemma: 'říci' },
        { index: 1, start: 37, end: 44, answer: 'učinila', lemma: 'učinit' },
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

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lenient' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ diacriticMode: 'lenient' })
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

    fireEvent.click(screen.getByRole('button', { name: 'Gen 3:13' }));
    expect(onLoadExample).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
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
});
