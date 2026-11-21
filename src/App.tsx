import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { QuizCard } from './components/QuizCard';
import { SettingsDrawer } from './components/SettingsDrawer';
import { buildFontVariationSettings, clampAxisWeight } from './config/alloAxes';
import { getCorpusOption, getLanguageOption } from './config/catalog';
import { usePersistedSettings } from './hooks/usePersistedSettings';
import {
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
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [attemptedCount, setAttemptedCount] = useState<number>(0);
  const recentIdsRef = useRef<Set<string>>(new Set());

  const language = getLanguageOption(settings.language);
  const corpus = getCorpusOption(settings.corpusId);
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

    root.style.setProperty('--allo-wght-base', String(baseWght));
    root.style.setProperty('--allo-wght-medium', String(mediumWght));
    root.style.setProperty('--allo-wght-bold', String(boldWght));
    root.style.setProperty('--allo-wght-label', String(labelWght));

    root.style.setProperty('--allo-fvs-base', baseFvs);
    root.style.setProperty('--allo-fvs-medium', mediumFvs);
    root.style.setProperty('--allo-fvs-bold', boldFvs);
    root.style.setProperty('--allo-fvs-label', labelFvs);
    root.style.setProperty('--allo-optical-sizing', optical);

    // Also set directly on <body> so every browser engine flushes glyph caches immediately
    document.body.style.fontWeight = String(baseWght);
    document.body.style.fontVariationSettings = baseFvs;
    document.body.style.fontOpticalSizing = optical;
  }, [settings.fontAxes]);

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
        verbRangeRef.current,
        verseRangeRef.current,
        recentIdsRef.current
      );
      recentIdsRef.current.add(q.id);
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

  const loadGenesisExample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await loadCorpusManifest(corpus.manifestUrl);
      setManifest(m);
      const q = await loadSpecificQuestion(corpus.manifestUrl, 'gn', 3, 13);
      if (q) {
        setQuestion(q);
      } else {
        await fetchNextQuestion();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load example verse.');
    } finally {
      setLoading(false);
    }
  }, [corpus.manifestUrl, fetchNextQuestion]);

  // StrictMode-safe initial load (supports ?ref=gn-3-13 deep link) & reload when corpus/blankLimit changes
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
            Number(vStr)
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

  // Only re-fetch when the user changes verbRange/verseRange and the active verse no longer fits
  // (never override an explicitly loaded example or ?ref= deep link)
  const prevFilterRef = useRef({
    verb: settings.verbRange,
    verse: settings.verseRange,
  });
  useEffect(() => {
    const prev = prevFilterRef.current;
    prevFilterRef.current = { verb: settings.verbRange, verse: settings.verseRange };
    const unchanged =
      prev.verb.min === settings.verbRange.min &&
      prev.verb.max === settings.verbRange.max &&
      prev.verse.min === settings.verseRange.min &&
      prev.verse.max === settings.verseRange.max;
    if (unchanged) return;
    if (!question || loading) return;
    if (
      !matchesVerbRange(question.blanks.length, settings.verbRange) ||
      !matchesVerseRange(question.verseCount, settings.verseRange)
    ) {
      void fetchNextQuestion();
    }
  }, [settings.verbRange, settings.verseRange, question, loading, fetchNextQuestion]);

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
        onLoadExample={loadGenesisExample}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
