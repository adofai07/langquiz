import React, { useEffect, useRef, useState } from 'react';
import { DIACRITIC_SHORTCUT_KEYS, filterAlphabetInput } from '../config/catalog';
import {
  evaluateAllBlanks,
  isEvaluationCorrect,
  matchOriginalCase,
} from '../services/answerCheck';
import { resolveBlankCue } from '../services/grammarCue';
import {
  WORD_FORM_META,
  type BlankEvaluation,
  type CorpusArchaicLevel,
  type DiacriticMode,
  type EnabledWordForms,
  type GlossMode,
  type LanguageCode,
  type QuizContextItem,
  type QuizQuestion,
} from '../types/quiz';
import { PolishKeyboardBar } from './PolishKeyboardBar';

interface QuizCardProps {
  question: QuizQuestion;
  languageCode: LanguageCode;
  alphabet: string;
  diacritics: string[];
  diacriticMode: DiacriticMode;
  glossMode?: GlossMode;
  showGrammarCues?: boolean;
  archaicLevel?: CorpusArchaicLevel;
  archaicNote?: string;
  glossary?: Record<string, string>;
  wordForms: EnabledWordForms;
  isActive?: boolean;
  onComplete: (allCorrect: boolean) => void;
  onNext: () => void;
}

type RoundPhase = 'answering' | 'checked' | 'revealed';

const KIND_TAG_MAP = Object.fromEntries(WORD_FORM_META.map((m) => [m.kind, m])) as Record<
  string,
  { label: string; shortTag: string }
>;

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  languageCode,
  alphabet,
  diacritics,
  diacriticMode,
  glossMode = 'always',
  showGrammarCues = true,
  archaicLevel,
  archaicNote,
  glossary,
  wordForms,
  isActive = true,
  onComplete,
  onNext,
}) => {
  const [inputs, setInputs] = useState<string[]>(() => question.blanks.map(() => ''));
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [phase, setPhase] = useState<RoundPhase>('answering');
  const [evaluations, setEvaluations] = useState<BlankEvaluation[] | null>(null);
  const [contextOpen, setContextOpen] = useState<boolean>(false);
  const scoredForQuestionRef = useRef<string | null>(null);
  const composingRef = useRef<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  const activeIndexRef = useRef<number>(0);
  activeIndexRef.current = activeIndex;
  const inputsRef = useRef<string[]>(inputs);
  inputsRef.current = inputs;

  const focusBlank = (idx: number) => {
    const targetIdx = Math.max(0, Math.min(idx, question.blanks.length - 1));
    const el = inputRefs.current[targetIdx];
    if (el) {
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // Ignore selection errors on unsupported input types
      }
    }
  };

  // Reset state whenever the question changes and autofocus the first blank
  useEffect(() => {
    setInputs(question.blanks.map(() => ''));
    setActiveIndex(0);
    setPhase('answering');
    setEvaluations(null);
    setContextOpen(false);
    scoredForQuestionRef.current = null;
    inputRefs.current.length = question.blanks.length;
    if (!isActive) return;
    const timer = window.setTimeout(() => {
      focusBlank(0);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, question.blanks]);

  // Restore focus to active blank whenever Quiz becomes active (e.g. closing Settings or returning from Study)
  useEffect(() => {
    if (!isActive || phase !== 'answering') return;
    const timer = window.setTimeout(() => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl.classList.contains('blank-input')) return;
      focusBlank(activeIndexRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, phase]);

  // Type-anywhere autofocus: if focus leaves the input during answering, typing any valid letter,
  // diacritic shortcut, or Backspace immediately focuses the active blank without dropping the keystroke.
  useEffect(() => {
    if (!isActive || phase !== 'answering') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === ',') return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('#settings-drawer'))
      ) {
        return;
      }

      const targetIdx = Math.max(0, Math.min(activeIndexRef.current, question.blanks.length - 1));
      const el = inputRefs.current[targetIdx];
      if (!el) return;

      const shortcutIdx = (DIACRITIC_SHORTCUT_KEYS as readonly string[]).indexOf(e.key);
      if (shortcutIdx !== -1 && shortcutIdx < diacritics.length) {
        e.preventDefault();
        const char = diacritics[shortcutIdx];
        const current = inputsRef.current[targetIdx] ?? '';
        handleInputChange(targetIdx, current + char);
        focusBlank(targetIdx);
        requestAnimationFrame(() => focusBlank(targetIdx));
        return;
      }

      if (e.key.length === 1 && alphabet.includes(e.key)) {
        e.preventDefault();
        const current = inputsRef.current[targetIdx] ?? '';
        handleInputChange(targetIdx, current + e.key);
        focusBlank(targetIdx);
        requestAnimationFrame(() => focusBlank(targetIdx));
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        const current = inputsRef.current[targetIdx] ?? '';
        if (current.length > 0) {
          handleInputChange(targetIdx, current.slice(0, -1));
        }
        focusBlank(targetIdx);
        requestAnimationFrame(() => focusBlank(targetIdx));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, phase, question.blanks, alphabet, diacritics, languageCode]);

  // Move focus to Next button once checked/revealed and allow Enter anywhere to advance
  useEffect(() => {
    if (phase === 'answering' || !isActive) return;
    nextBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
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
  }, [phase, isActive, onNext]);

  const handleInputChange = (idx: number, value: string, skipFilter = false) => {
    const cleaned = skipFilter ? value : filterAlphabetInput(value, alphabet);
    const expected = question.blanks[idx]?.answer ?? '';
    const cased = skipFilter ? cleaned : matchOriginalCase(cleaned, expected, languageCode);
    const syncNext = [...inputsRef.current];
    syncNext[idx] = cased;
    inputsRef.current = syncNext;
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
                autoFocus={isActive && idx === 0}
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
  const enabledCount = Object.values(wordForms).filter(Boolean).length;
  const verbsOnly = enabledCount === 1 && wordForms.v;
  const formsRowLabel = verbsOnly ? 'Verb' : 'Forms';
  const showKindTags = enabledCount > 1;
  const showGloss =
    Boolean(glossary) &&
    (glossMode === 'always' || (glossMode === 'after-check' && phase !== 'answering'));
  const prevContext: QuizContextItem[] = (question.context ?? []).filter(
    (c) => c.position === 'prev'
  );
  const nextContext: QuizContextItem[] = (question.context ?? []).filter(
    (c) => c.position === 'next'
  );
  const hasContext = prevContext.length > 0 || nextContext.length > 0;

  const formatContextRef = (c: QuizContextItem) =>
    c.verse === c.verseEnd ? `${c.chapter}:${c.verse}` : `${c.chapter}:${c.verse}–${c.verseEnd}`;

  return (
    <article className="quiz-card" aria-label="Verb form quiz question">
      {/* Top Utility Rail — Show Context on left, Skip constantly anchored at far right above top rule */}
      <div className="quiz-top-bar">
        {hasContext ? (
          <button
            type="button"
            className={`top-bar-link${contextOpen ? ' top-bar-link--active' : ''}`}
            aria-expanded={contextOpen}
            onClick={() => {
              setContextOpen((v) => !v);
              if (phase === 'answering') {
                window.setTimeout(() => focusBlank(activeIndexRef.current), 0);
              }
            }}
          >
            {contextOpen ? 'Hide context' : 'Show context'}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button type="button" className="skip-link" onClick={onNext}>
          Skip →
        </button>
      </div>

      <div className="quiz-grid">
        {/* 01 / REFERENCE */}
        <div className="grid-row">
          <div className="grid-label tabular">
            <span className="grid-label-num">01</span>
            <span>Reference</span>
          </div>
          <div className="grid-value reference-head">
            <h1 className="reference-text tabular">
              {question.bookNativeName}{' '}
              <span className="reference-sub">({question.bookEnName})</span>{' '}
              {question.verse === question.verseEnd
                ? `${question.chapter}:${question.verse}`
                : `${question.chapter}:${question.verse}–${question.verseEnd}`}
            </h1>
            {archaicLevel && (
              <span
                className={`archaic-tag tabular${
                  archaicLevel === 'archaic' ? ' archaic-tag--strong' : ''
                }`}
                title={archaicNote}
              >
                {archaicLevel === 'archaic' ? 'Archaic' : 'Dated'}
              </span>
            )}
          </div>
        </div>

        {/* 02 / ORIGINAL */}
        <div className="grid-row grid-row--original">
          <div className="grid-label tabular">
            <span className="grid-label-num">02</span>
            <span>Original</span>
          </div>
          <div className="grid-value">
            {contextOpen && prevContext.length > 0 && (
              <div className="context-block context-block--before" lang={languageCode}>
                {prevContext.map((c) => (
                  <p key={`po-${c.chapter}-${c.verse}`} className="context-line">
                    <span className="context-ref tabular">{formatContextRef(c)}</span>
                    <span>{c.original}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="original-sentence" lang={languageCode}>
              {renderOriginal()}
            </p>
            {contextOpen && nextContext.length > 0 && (
              <div className="context-block context-block--after" lang={languageCode}>
                {nextContext.map((c) => (
                  <p key={`no-${c.chapter}-${c.verse}`} className="context-line">
                    <span className="context-ref tabular">{formatContextRef(c)}</span>
                    <span>{c.original}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 03 / VERB OR FORMS */}
        <div className="grid-row">
          <div className="grid-label tabular">
            <span className="grid-label-num">03</span>
            <span>{formsRowLabel}</span>
          </div>
          <div className="grid-value">
            <ul className="verb-list" aria-label="Base forms">
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
                const kindMeta = KIND_TAG_MAP[blank.kind];
                const meaning = showGloss
                  ? (glossary?.[blank.lemma] ?? glossary?.[blank.lemma.toLowerCase()])
                  : undefined;
                const cue = showGrammarCues
                  ? resolveBlankCue(blank, question, languageCode)
                  : null;
                const chipTitle = [kindMeta?.label, cue?.title].filter(Boolean).join(' · ') || undefined;

                return (
                  <li key={`${blank.start}-${idx}`}>
                    <button
                      type="button"
                      className={`verb-chip${statusClass}`}
                      title={chipTitle}
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
                      {meaning && (
                        <span className="verb-chip-gloss" lang="en">
                          {meaning}
                        </span>
                      )}
                      {cue && (
                        <span
                          className="verb-chip-cue tabular"
                          title={cue.title}
                          aria-label={cue.title}
                        >
                          {cue.label}
                        </span>
                      )}
                      {showKindTags && kindMeta && (
                        <span className="verb-chip-kind tabular" aria-label={kindMeta.label}>
                          {kindMeta.shortTag}
                        </span>
                      )}
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
            {contextOpen && prevContext.length > 0 && (
              <div className="context-block context-block--before context-block--translation" lang="en">
                {prevContext.map((c) => (
                  <p key={`pt-${c.chapter}-${c.verse}`} className="context-line">
                    <span className="context-ref tabular">{formatContextRef(c)}</span>
                    <span>{c.translation}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="translation-text" lang="en">
              {question.translation}
              <span className="translation-source">{question.translationSource}</span>
            </p>
            {contextOpen && nextContext.length > 0 && (
              <div className="context-block context-block--after context-block--translation" lang="en">
                {nextContext.map((c) => (
                  <p key={`nt-${c.chapter}-${c.verse}`} className="context-line">
                    <span className="context-ref tabular">{formatContextRef(c)}</span>
                    <span>{c.translation}</span>
                  </p>
                ))}
              </div>
            )}
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
      </div>
    </article>
  );
};
