import React, { useEffect, useRef, useState } from 'react';
import { DIACRITIC_SHORTCUT_KEYS, filterAlphabetInput } from '../config/catalog';
import {
  evaluateAllBlanks,
  isEvaluationCorrect,
  matchOriginalCase,
} from '../services/answerCheck';
import type {
  BlankEvaluation,
  DiacriticMode,
  LanguageCode,
  QuizQuestion,
} from '../types/quiz';
import { PolishKeyboardBar } from './PolishKeyboardBar';

interface QuizCardProps {
  question: QuizQuestion;
  languageCode: LanguageCode;
  alphabet: string;
  diacritics: string[];
  diacriticMode: DiacriticMode;
  onComplete: (allCorrect: boolean) => void;
  onNext: () => void;
}

type RoundPhase = 'answering' | 'checked' | 'revealed';

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  languageCode,
  alphabet,
  diacritics,
  diacriticMode,
  onComplete,
  onNext,
}) => {
  const [inputs, setInputs] = useState<string[]>(() => question.blanks.map(() => ''));
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [phase, setPhase] = useState<RoundPhase>('answering');
  const [evaluations, setEvaluations] = useState<BlankEvaluation[] | null>(null);
  const scoredForQuestionRef = useRef<string | null>(null);
  const composingRef = useRef<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  // Reset state whenever the question changes
  useEffect(() => {
    setInputs(question.blanks.map(() => ''));
    setActiveIndex(0);
    setPhase('answering');
    setEvaluations(null);
    scoredForQuestionRef.current = null;
    inputRefs.current = [];
    const timer = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [question.id, question.blanks]);

  // Move focus to Next button once checked/revealed and allow Enter anywhere to advance
  useEffect(() => {
    if (phase === 'answering') return;
    nextBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.closest('#settings-drawer'))
      ) {
        return;
      }
      e.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onNext]);

  const handleInputChange = (idx: number, value: string, skipFilter = false) => {
    const cleaned = skipFilter ? value : filterAlphabetInput(value, alphabet);
    const expected = question.blanks[idx]?.answer ?? '';
    const cased = skipFilter ? cleaned : matchOriginalCase(cleaned, expected, languageCode);
    setInputs((prev) => {
      const next = [...prev];
      next[idx] = cased;
      return next;
    });
  };

  const handleInsertDiacritic = (char: string) => {
    if (phase !== 'answering') return;
    const targetIdx = Math.min(activeIndex, question.blanks.length - 1);
    const el = inputRefs.current[targetIdx];
    const current = inputs[targetIdx] ?? '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const updated = current.slice(0, start) + char + current.slice(end);
    handleInputChange(targetIdx, updated);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(start + char.length, start + char.length);
      }
    });
  };

  const handleCheck = () => {
    if (phase !== 'answering') return;
    const results = evaluateAllBlanks(question.blanks, inputs, diacriticMode, languageCode);
    setEvaluations(results);
    setPhase('checked');
    const allOk = results.every(isEvaluationCorrect);
    if (scoredForQuestionRef.current !== question.id) {
      scoredForQuestionRef.current = question.id;
      onComplete(allOk);
    }
  };

  const handleReveal = () => {
    if (phase !== 'answering') return;
    const results: BlankEvaluation[] = question.blanks.map((blank, idx) => ({
      status: 'revealed',
      expected: blank.answer,
      given: inputs[idx] ?? '',
      lemma: blank.lemma,
    }));
    setEvaluations(results);
    setPhase('revealed');
    if (scoredForQuestionRef.current !== question.id) {
      scoredForQuestionRef.current = question.id;
      onComplete(false);
    }
  };

  const handleRetry = () => {
    setInputs(question.blanks.map(() => ''));
    setEvaluations(null);
    setPhase('answering');
    setActiveIndex(0);
    window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Shortcut keys (1-9, plus 0, -, =, [, ], ; for larger diacritic sets like Czech) insert diacritics directly
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const shortcutIdx = (DIACRITIC_SHORTCUT_KEYS as readonly string[]).indexOf(e.key);
      if (shortcutIdx !== -1 && shortcutIdx < diacritics.length) {
        const char = diacritics[shortcutIdx];
        e.preventDefault();
        const el = e.currentTarget;
        const current = inputs[idx] ?? '';
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? current.length;
        const updated = current.slice(0, start) + char + current.slice(end);
        handleInputChange(idx, updated);
        requestAnimationFrame(() => {
          el.setSelectionRange(start + char.length, start + char.length);
        });
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // If there is another empty blank ahead, jump to it; otherwise check
      const nextEmpty = inputs.findIndex((val, i) => i > idx && val.trim() === '');
      if (nextEmpty !== -1) {
        inputRefs.current[nextEmpty]?.focus();
        return;
      }
      const anyEarlierEmpty = inputs.findIndex((val, i) => i < idx && val.trim() === '');
      if (anyEarlierEmpty !== -1 && inputs[idx].trim() !== '') {
        inputRefs.current[anyEarlierEmpty]?.focus();
        return;
      }
      handleCheck();
      return;
    }

    // Reject any single printable character outside the language's alphabet
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !alphabet.includes(e.key)) {
      e.preventDefault();
    }
  };

  // Build segments splitting the original sentence cleanly around each verb span
  const renderOriginal = () => {
    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    question.blanks.forEach((blank, idx) => {
      if (blank.start > cursor) {
        nodes.push(
          <React.Fragment key={`txt-${idx}`}>
            {question.original.slice(cursor, blank.start)}
          </React.Fragment>
        );
      }

      const val = inputs[idx] ?? '';
      const ev = evaluations?.[idx];
      const isActive = phase === 'answering' && activeIndex === idx;
      const numLabel = idx + 1;

      if (phase === 'answering') {
        nodes.push(
          <span
            key={`blank-${idx}`}
            className={`blank-wrap${isActive ? ' blank-wrap--active' : ''}`}
          >
            <span className="blank-index tabular" aria-hidden="true">
              {numLabel}
            </span>
            <span className="blank-sizer">
              <span className="blank-mirror" aria-hidden="true">
                {val || '\u00A0'}
              </span>
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                size={1}
                className="blank-input"
                value={val}
                aria-label={`Blank ${numLabel}: ${blank.lemma}`}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onFocus={() => setActiveIndex(idx)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  handleInputChange(idx, e.currentTarget.value);
                }}
                onChange={(e) => handleInputChange(idx, e.target.value, composingRef.current)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
              />
            </span>
          </span>
        );
      } else if (ev) {
        const resultClass =
          ev.status === 'exact'
            ? 'blank-result--exact'
            : ev.status === 'diacritic-close'
              ? 'blank-result--diacritic'
              : ev.status === 'revealed'
                ? 'blank-result--revealed'
                : 'blank-result--wrong';

        nodes.push(
          <span key={`res-${idx}`} className="blank-wrap">
            <span className="blank-index tabular" aria-hidden="true">
              {numLabel}
            </span>
            <span className={`blank-result ${resultClass}`}>
              {ev.status === 'exact' && <span>{ev.expected}</span>}
              {ev.status === 'diacritic-close' && (
                <>
                  <span>{ev.given}</span>
                  <span className="blank-correction--warn">({ev.expected})</span>
                </>
              )}
              {ev.status === 'wrong' && (
                <>
                  {ev.given && <span className="blank-strike">{ev.given}</span>}
                  <span className="blank-correction">{ev.expected}</span>
                </>
              )}
              {ev.status === 'revealed' && <span>{ev.expected}</span>}
            </span>
          </span>
        );
      }

      cursor = blank.end;
    });

    if (cursor < question.original.length) {
      nodes.push(
        <React.Fragment key="txt-tail">{question.original.slice(cursor)}</React.Fragment>
      );
    }

    return nodes;
  };

  const correctCount = evaluations ? evaluations.filter(isEvaluationCorrect).length : 0;
  const totalBlanks = question.blanks.length;
  const allCorrect = evaluations !== null && correctCount === totalBlanks && phase === 'checked';

  return (
    <article className="quiz-grid" aria-label="Verb form quiz question">
      {/* 01 / REFERENCE */}
      <div className="grid-row">
        <div className="grid-label tabular">
          <span className="grid-label-num">01</span>
          <span>Reference</span>
        </div>
        <div className="grid-value reference-row">
          <h1 className="reference-text tabular">
            {question.bookNativeName}{' '}
            <span className="reference-sub">({question.bookEnName})</span>{' '}
            {question.verse === question.verseEnd
              ? `${question.chapter}:${question.verse}`
              : `${question.chapter}:${question.verse}–${question.verseEnd}`}
          </h1>
          <button type="button" className="skip-link" onClick={onNext}>
            Skip →
          </button>
        </div>
      </div>

      {/* 02 / ORIGINAL */}
      <div className="grid-row grid-row--original">
        <div className="grid-label tabular">
          <span className="grid-label-num">02</span>
          <span>Original</span>
        </div>
        <div className="grid-value">
          <p className="original-sentence" lang={languageCode}>
            {renderOriginal()}
          </p>
        </div>
      </div>

      {/* 03 / VERB */}
      <div className="grid-row">
        <div className="grid-label tabular">
          <span className="grid-label-num">03</span>
          <span>Verb</span>
        </div>
        <div className="grid-value">
          <ul className="verb-list" aria-label="Infinitive verbs">
            {question.blanks.map((blank, idx) => {
              const ev = evaluations?.[idx];
              const isActive = phase === 'answering' && activeIndex === idx;
              const statusClass = ev
                ? ev.status === 'exact'
                  ? ' verb-chip--exact'
                  : ev.status === 'diacritic-close'
                    ? ' verb-chip--diacritic'
                    : ev.status === 'wrong'
                      ? ' verb-chip--wrong'
                      : ''
                : isActive
                  ? ' verb-chip--active'
                  : '';

              return (
                <li key={`${blank.start}-${idx}`}>
                  <button
                    type="button"
                    className={`verb-chip${statusClass}`}
                    onClick={() => {
                      if (phase === 'answering') {
                        setActiveIndex(idx);
                        inputRefs.current[idx]?.focus();
                      }
                    }}
                  >
                    <span className="verb-chip-idx tabular">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span lang={languageCode}>{blank.lemma}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 04 / TRANSLATION */}
      <div className="grid-row">
        <div className="grid-label tabular">
          <span className="grid-label-num">04</span>
          <span>Translation</span>
        </div>
        <div className="grid-value">
          <p className="translation-text" lang="en">
            {question.translation}
            <span className="translation-source">{question.translationSource}</span>
          </p>
        </div>
      </div>

      {/* Action Rail */}
      <div className="action-rail">
        <PolishKeyboardBar
          diacritics={diacritics}
          disabled={phase !== 'answering'}
          onInsert={handleInsertDiacritic}
        />

        <div className="action-buttons">
          {phase === 'answering' ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={handleReveal}>
                Reveal
              </button>
              <button type="button" className="btn btn--primary" onClick={handleCheck}>
                Check ↵
              </button>
            </>
          ) : (
            <>
              {!allCorrect && (
                <button type="button" className="btn btn--ghost" onClick={handleRetry}>
                  Retry
                </button>
              )}
              <button
                ref={nextBtnRef}
                type="button"
                className={`btn ${allCorrect ? 'btn--primary' : 'btn--accent'}`}
                onClick={onNext}
              >
                Next →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subtle Post-Check Summary */}
      {phase !== 'answering' && evaluations && (
        <div className="feedback-banner" role="status" aria-live="polite">
          <span
            className={`feedback-status tabular ${
              allCorrect ? 'feedback-status--ok' : 'feedback-status--err'
            }`}
          >
            {phase === 'revealed'
              ? `Revealed — ${totalBlanks} ${totalBlanks === 1 ? 'form' : 'forms'}`
              : allCorrect
                ? `Correct — ${correctCount} / ${totalBlanks}`
                : `${correctCount} / ${totalBlanks} correct`}
          </span>
          <span className="feedback-hint">Press Enter for next</span>
        </div>
      )}
    </article>
  );
};
