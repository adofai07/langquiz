import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { QuizCard } from './components/QuizCard';
import { SettingsDrawer } from './components/SettingsDrawer';
import { buildFontVariationSettings, clampAxisWeight } from './config/alloAxes';
import { getCorpusOption, getLanguageOption } from './config/catalog';
import { usePersistedSettings } from './hooks/usePersistedSettings';
import {
  loadCorpusGlossary,
  loadCorpusManifest,
  loadSpecificQuestion,
  matchesVerbRange,
  matchesVerseRange,
  pickRandomQuestion,
} from './services/corpusLoader';
import type { CorpusManifest, QuizQuestion, ThemeMode } from './types/quiz';

function getSystemDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function resolveTheme(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemDark ? 'dark' : 'light';
}

export const App: React.FC = () => {
  const [settings, setSettings] = usePersistedSettings();
  const [systemDark, setSystemDark] = useState<boolean>(getSystemDark);
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [glossary, setGlossary] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [attemptedCount, setAttemptedCount] = useState<number>(0);
  const recentIdsRef = useRef<Set<string>>(new Set());

  const language = getLanguageOption(settings.language);
  const corpus = getCorpusOption(settings.corpusId);
  const activeWordForms = settings.wordFormsByLang[settings.language];
  const resolvedTheme = resolveTheme(settings.theme, systemDark);

  // Listen to OS dark mode changes when theme is set to 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Apply resolved light/dark theme attribute and PWA theme-color meta tag
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'dark' ? '#0E0E0D' : '#F6F5F0');
    }
  }, [resolvedTheme]);

  // Sync Allo variable font axes (both font-weight and font-variation-settings) to :root
  useEffect(() => {
    const root = document.documentElement;
    const { fontAxes } = settings;
    const baseWght = clampAxisWeight(fontAxes.wght, 0);
    const mediumWght = clampAxisWeight(fontAxes.wght, 120);
    const boldWght = clampAxisWeight(fontAxes.wght, 260);
    const labelWght = clampAxisWeight(fontAxes.wght, 180);

    const baseFvs = buildFontVariationSettings(fontAxes, 0);
    const mediumFvs = buildFontVariationSettings(fontAxes, 120);
    const boldFvs = buildFontVariationSettings(fontAxes, 260);
    const labelFvs = buildFontVariationSettings(fontAxes, 180);
    const optical = fontAxes.opszAuto ? 'auto' : 'none';
    const letterSpacing = `${fontAxes.tracking.toFixed(3)}em`;

    root.style.setProperty('--allo-wght-base', String(baseWght));
    root.style.setProperty('--allo-wght-medium', String(mediumWght));
    root.style.setProperty('--allo-wght-bold', String(boldWght));
    root.style.setProperty('--allo-wght-label', String(labelWght));

    root.style.setProperty('--allo-fvs-base', baseFvs);
    root.style.setProperty('--allo-fvs-medium', mediumFvs);
    root.style.setProperty('--allo-fvs-bold', boldFvs);
    root.style.setProperty('--allo-fvs-label', labelFvs);
    root.style.setProperty('--allo-optical-sizing', optical);
    root.style.setProperty('--allo-letter-spacing', letterSpacing);

    // Also set directly on <body> so every browser engine flushes glyph caches immediately
    document.body.style.fontWeight = String(baseWght);
    document.body.style.fontVariationSettings = baseFvs;
    document.body.style.fontOpticalSizing = optical;
  }, [settings.fontAxes]);

  const wordFormsRef = useRef(activeWordForms);
  wordFormsRef.current = activeWordForms;
  const includeBaseRef = useRef(settings.includeBaseForms);
  includeBaseRef.current = settings.includeBaseForms;
  const verbRangeRef = useRef(settings.verbRange);
  verbRangeRef.current = settings.verbRange;
  const verseRangeRef = useRef(settings.verseRange);
  verseRangeRef.current = settings.verseRange;

  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await loadCorpusManifest(corpus.manifestUrl);
      setManifest(m);
      const q = await pickRandomQuestion(
        corpus.manifestUrl,
        wordFormsRef.current,
        includeBaseRef.current,
        verbRangeRef.current,
        verseRangeRef.current,
        recentIdsRef.current
      );
      recentIdsRef.current.add(q.id.split(':').slice(0, 4).join(':'));
      if (recentIdsRef.current.size > 120) {
        const first = recentIdsRef.current.values().next().value;
        if (first) recentIdsRef.current.delete(first);
      }
      setQuestion(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load corpus.');
    } finally {
      setLoading(false);
    }
  }, [corpus.manifestUrl]);

  const loadCorpusExample = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ref = corpus.exampleRef ?? { bookId: 'gn', chapter: 3, verse: 13, label: 'Gen 3:13' };
    try {
      const m = await loadCorpusManifest(corpus.manifestUrl);
      setManifest(m);
      const q = await loadSpecificQuestion(
        corpus.manifestUrl,
        ref.bookId,
        ref.chapter,
        ref.verse,
        wordFormsRef.current,
        includeBaseRef.current
      );
      if (q) {
        setQuestion(q);
      } else {
        await fetchNextQuestion();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load example passage.');
    } finally {
      setLoading(false);
    }
  }, [corpus.manifestUrl, corpus.exampleRef, fetchNextQuestion]);

  // Lazily load the active corpus's lemma glossary once per corpus
  useEffect(() => {
    let cancelled = false;
    void loadCorpusGlossary(corpus.manifestUrl).then((dict) => {
      if (!cancelled) {
        setGlossary(dict);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [corpus.manifestUrl]);

  // StrictMode-safe initial load (supports ?ref=gn-3-13 deep link) & reload when corpus changes
  const appliedInitialRefForUrl = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    const refMatch = refParam ? /^([a-z0-9]+)-(\d+)-(\d+)$/i.exec(refParam.trim()) : null;

    if (refMatch && appliedInitialRefForUrl.current !== corpus.manifestUrl) {
      const [, bookId, chStr, vStr] = refMatch;
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const m = await loadCorpusManifest(corpus.manifestUrl);
          if (cancelled) return;
          setManifest(m);
          const q = await loadSpecificQuestion(
            corpus.manifestUrl,
            bookId.toLowerCase(),
            Number(chStr),
            Number(vStr),
            wordFormsRef.current,
            includeBaseRef.current
          );
          if (cancelled) return;
          appliedInitialRefForUrl.current = corpus.manifestUrl;
          if (q) {
            setQuestion(q);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to random question
        }
        if (!cancelled) {
          await fetchNextQuestion();
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    void fetchNextQuestion();
    return () => {
      cancelled = true;
    };
  }, [corpus.manifestUrl, fetchNextQuestion]);

  // Re-apply active wordForms / includeBaseForms on the current verse immediately when toggled, or re-fetch if range no longer fits
  const prevFilterRef = useRef({
    lang: settings.language,
    forms: activeWordForms,
    includeBase: settings.includeBaseForms,
    verb: settings.verbRange,
    verse: settings.verseRange,
  });
  useEffect(() => {
    const prev = prevFilterRef.current;
    prevFilterRef.current = {
      lang: settings.language,
      forms: activeWordForms,
      includeBase: settings.includeBaseForms,
      verb: settings.verbRange,
      verse: settings.verseRange,
    };
    // Corpus switch is already handled by the corpus.manifestUrl effect above
    if (prev.lang !== settings.language) return;

    const formsChanged =
      prev.includeBase !== settings.includeBaseForms ||
      prev.forms.v !== activeWordForms.v ||
      prev.forms.p !== activeWordForms.p ||
      prev.forms.t !== activeWordForms.t ||
      prev.forms.d !== activeWordForms.d ||
      prev.forms.n !== activeWordForms.n ||
      prev.forms.a !== activeWordForms.a ||
      prev.forms.r !== activeWordForms.r;
    const rangesChanged =
      prev.verb.min !== settings.verbRange.min ||
      prev.verb.max !== settings.verbRange.max ||
      prev.verse.min !== settings.verseRange.min ||
      prev.verse.max !== settings.verseRange.max;

    if (!formsChanged && !rangesChanged) return;
    if (!question || loading) return;

    if (formsChanged) {
      void (async () => {
        const refreshed = await loadSpecificQuestion(
          corpus.manifestUrl,
          question.bookId,
          question.chapter,
          question.verse,
          activeWordForms,
          settings.includeBaseForms
        );
        if (refreshed && matchesVerbRange(refreshed.blanks.length, settings.verbRange)) {
          setQuestion(refreshed);
        } else {
          await fetchNextQuestion();
        }
      })();
      return;
    }

    if (
      !matchesVerbRange(question.blanks.length, settings.verbRange) ||
      !matchesVerseRange(question.verseCount, settings.verseRange)
    ) {
      void fetchNextQuestion();
    }
  }, [
    settings.language,
    activeWordForms,
    settings.includeBaseForms,
    settings.verbRange,
    settings.verseRange,
    corpus.manifestUrl,
    question,
    loading,
    fetchNextQuestion,
  ]);

  const handleComplete = useCallback((allCorrect: boolean) => {
    setAttemptedCount((c) => c + 1);
    if (allCorrect) {
      setSolvedCount((c) => c + 1);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const currentlyDark = resolveTheme(prev.theme, systemDark) === 'dark';
      return { ...prev, theme: currentlyDark ? 'light' : 'dark' };
    });
  }, [setSettings, systemDark]);

  // Keyboard shortcut: ',' opens/closes Settings when not typing in a field
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ',' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      e.preventDefault();
      setSettingsOpen((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const shellFontStyle: React.CSSProperties = {
    fontWeight: clampAxisWeight(settings.fontAxes.wght),
    fontVariationSettings: buildFontVariationSettings(settings.fontAxes),
    fontOpticalSizing: settings.fontAxes.opszAuto ? 'auto' : 'none',
  };

  return (
    <div className="app-shell" style={shellFontStyle}>
      <Header
        language={language}
        corpus={corpus}
        solvedCount={solvedCount}
        attemptedCount={attemptedCount}
        resolvedTheme={resolvedTheme}
        settingsOpen={settingsOpen}
        onToggleTheme={handleToggleTheme}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
      />

      <main className="main-stage">
        {loading && !question ? (
          <div className="status-panel">
            <span>Loading {corpus.name}…</span>
          </div>
        ) : error ? (
          <div className="status-panel" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--primary" onClick={fetchNextQuestion}>
              Retry
            </button>
          </div>
        ) : question ? (
          <QuizCard
            question={question}
            languageCode={language.code}
            alphabet={language.alphabet}
            diacritics={language.diacritics}
            diacriticMode={settings.diacriticMode}
            glossMode={settings.glossMode}
            glossary={glossary}
            wordForms={activeWordForms}
            onComplete={handleComplete}
            onNext={fetchNextQuestion}
          />
        ) : null}
      </main>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        manifest={manifest}
        onChange={setSettings}
        onLoadExample={loadCorpusExample}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
