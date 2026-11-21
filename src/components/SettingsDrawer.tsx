import React, { useEffect } from 'react';
import {
  ALLO_AXIS_LIMITS,
  buildFontVariationSettings,
  clampAxisWeight,
  DEFAULT_FONT_AXES,
  formatTracking,
  OPSZ_PRESETS,
  ROND_PRESETS,
  TRACKING_PRESETS,
} from '../config/alloAxes';
import { CORPORA, getLanguageOption, LANGUAGES } from '../config/catalog';
import {
  VERB_RANGE_MAX,
  VERB_RANGE_MIN,
  VERSE_RANGE_MAX,
  VERSE_RANGE_MIN,
  WORD_FORM_META,
  type AlloFontAxes,
  type AppSettings,
  type CorpusManifest,
  type DiacriticMode,
  type LanguageCode,
  type ThemeMode,
  type WordFormKind,
} from '../types/quiz';
import { DualRangeSlider } from './DualRangeSlider';

interface SettingsDrawerProps {
  open: boolean;
  settings: AppSettings;
  manifest: CorpusManifest | null;
  onChange: (next: AppSettings) => void;
  onLoadExample: () => void;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  settings,
  manifest,
  onChange,
  onLoadExample,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const updateAxes = (patch: Partial<AlloFontAxes>) => {
    onChange({
      ...settings,
      fontAxes: {
        ...settings.fontAxes,
        ...patch,
      },
    });
  };

  const { fontAxes } = settings;
  const activeLanguage = getLanguageOption(settings.language);
  const availableCorpora = CORPORA.filter((c) => c.language === settings.language);
  const specimenStyle: React.CSSProperties = {
    fontWeight: clampAxisWeight(fontAxes.wght),
    fontVariationSettings: buildFontVariationSettings(fontAxes),
    fontOpticalSizing: fontAxes.opszAuto ? 'auto' : 'none',
    letterSpacing: `${fontAxes.tracking.toFixed(3)}em`,
  };

  const toggleWordForm = (kind: WordFormKind) => {
    const current = settings.wordForms;
    const nextVal = !current[kind];
    // Prevent disabling the last remaining checked category
    if (!nextVal && Object.values(current).filter(Boolean).length <= 1) {
      return;
    }
    onChange({
      ...settings,
      wordForms: {
        ...current,
        [kind]: nextVal,
      },
    });
  };

  const verbsOnly =
    settings.wordForms.v && Object.values(settings.wordForms).filter(Boolean).length === 1;

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        id="settings-drawer"
        className="settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="drawer-head">
          <h2 className="drawer-title">Settings</h2>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* 01 / LANGUAGE */}
        <section className="drawer-section">
          <div className="drawer-section-head">
            <label htmlFor="language-select" className="drawer-section-label tabular">
              <span>01</span>Language
            </label>
          </div>
          <select
            id="language-select"
            className="swiss-select"
            value={settings.language}
            onChange={(e) => {
              const lang = e.target.value as LanguageCode;
              const firstCorpus = CORPORA.find((c) => c.language === lang);
              onChange({
                ...settings,
                language: lang,
                corpusId: firstCorpus?.id ?? settings.corpusId,
              });
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} — {lang.nativeName}
              </option>
            ))}
          </select>
        </section>

        {/* 02 / CORPUS */}
        <section className="drawer-section">
          <div className="drawer-section-head">
            <label htmlFor="corpus-select" className="drawer-section-label tabular">
              <span>02</span>Corpus
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                onLoadExample();
                onClose();
              }}
            >
              Gen 3:13
            </button>
          </div>
          <select
            id="corpus-select"
            className="swiss-select"
            value={settings.corpusId}
            onChange={(e) => onChange({ ...settings, corpusId: e.target.value })}
          >
            {availableCorpora.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {manifest && (
            <p className="corpus-caption tabular">
              <span>{manifest.subtitle}</span>
              <span>{manifest.quizVerses.toLocaleString()} verses</span>
            </p>
          )}
        </section>

        {/* 03 / FONT AXES (ALLO) */}
        <section className="drawer-section">
          <div className="drawer-section-head">
            <span className="drawer-section-label tabular">
              <span>03</span>Allo Font Axes
            </span>
            <button
              type="button"
              className="text-link"
              onClick={() => updateAxes({ ...DEFAULT_FONT_AXES })}
            >
              Reset
            </button>
          </div>

          <div className="specimen-box">
            <p className="specimen-sample" lang={activeLanguage.code} style={specimenStyle}>
              {activeLanguage.specimen}
            </p>
            <p className="specimen-coords tabular">
              wght {fontAxes.wght} · ROND {fontAxes.rond} · opsz{' '}
              {fontAxes.opszAuto ? 'auto' : fontAxes.opsz} · {formatTracking(fontAxes.tracking)}
            </p>
          </div>

          {/* wght */}
          <div className="axis-control">
            <div className="axis-row">
              <label htmlFor="axis-wght" className="axis-name">
                <span>{ALLO_AXIS_LIMITS.wght.label}</span>
                <span className="axis-tag">{ALLO_AXIS_LIMITS.wght.tag}</span>
              </label>
              <span className="axis-value tabular">{fontAxes.wght}</span>
            </div>
            <input
              id="axis-wght"
              type="range"
              className="swiss-slider"
              min={ALLO_AXIS_LIMITS.wght.min}
              max={ALLO_AXIS_LIMITS.wght.max}
              step={ALLO_AXIS_LIMITS.wght.step}
              value={fontAxes.wght}
              onInput={(e) => updateAxes({ wght: Number((e.target as HTMLInputElement).value) })}
              onChange={(e) => updateAxes({ wght: Number(e.target.value) })}
            />
          </div>

          {/* ROND */}
          <div className="axis-control">
            <div className="axis-row">
              <label htmlFor="axis-rond" className="axis-name">
                <span>{ALLO_AXIS_LIMITS.rond.label}</span>
                <span className="axis-tag">{ALLO_AXIS_LIMITS.rond.tag}</span>
              </label>
              <span className="axis-value tabular">{fontAxes.rond}</span>
            </div>
            <input
              id="axis-rond"
              type="range"
              className="swiss-slider"
              min={ALLO_AXIS_LIMITS.rond.min}
              max={ALLO_AXIS_LIMITS.rond.max}
              step={ALLO_AXIS_LIMITS.rond.step}
              value={fontAxes.rond}
              onInput={(e) => updateAxes({ rond: Number((e.target as HTMLInputElement).value) })}
              onChange={(e) => updateAxes({ rond: Number(e.target.value) })}
            />
            <div className="preset-row" role="group" aria-label="Roundness presets">
              {ROND_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-btn tabular"
                  aria-pressed={fontAxes.rond === p.value}
                  onClick={() => updateAxes({ rond: p.value })}
                >
                  {p.label} {p.value}
                </button>
              ))}
            </div>
          </div>

          {/* opsz */}
          <div className="axis-control">
            <div className="axis-row">
              <label htmlFor="axis-opsz" className="axis-name">
                <span>{ALLO_AXIS_LIMITS.opsz.label}</span>
                <span className="axis-tag">{ALLO_AXIS_LIMITS.opsz.tag}</span>
              </label>
              <span className="axis-value tabular">
                {fontAxes.opszAuto ? 'Auto' : fontAxes.opsz}
              </span>
            </div>
            <input
              id="axis-opsz"
              type="range"
              className="swiss-slider"
              min={ALLO_AXIS_LIMITS.opsz.min}
              max={ALLO_AXIS_LIMITS.opsz.max}
              step={ALLO_AXIS_LIMITS.opsz.step}
              value={fontAxes.opsz}
              disabled={fontAxes.opszAuto}
              onInput={(e) =>
                updateAxes({
                  opsz: Number((e.target as HTMLInputElement).value),
                  opszAuto: false,
                })
              }
              onChange={(e) => updateAxes({ opsz: Number(e.target.value), opszAuto: false })}
            />
            <div className="preset-row" role="group" aria-label="Optical size presets">
              <button
                type="button"
                className="preset-btn"
                aria-pressed={fontAxes.opszAuto}
                onClick={() => updateAxes({ opszAuto: !fontAxes.opszAuto })}
              >
                Auto
              </button>
              {OPSZ_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-btn tabular"
                  aria-pressed={!fontAxes.opszAuto && fontAxes.opsz === p.value}
                  onClick={() => updateAxes({ opsz: p.value, opszAuto: false })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kerning / letter-spacing */}
          <div className="axis-control">
            <div className="axis-row">
              <label htmlFor="axis-tracking" className="axis-name">
                <span>{ALLO_AXIS_LIMITS.tracking.label}</span>
                <span className="axis-tag">{ALLO_AXIS_LIMITS.tracking.tag}</span>
              </label>
              <span className="axis-value tabular">{formatTracking(fontAxes.tracking)}</span>
            </div>
            <input
              id="axis-tracking"
              type="range"
              className="swiss-slider"
              min={ALLO_AXIS_LIMITS.tracking.min}
              max={ALLO_AXIS_LIMITS.tracking.max}
              step={ALLO_AXIS_LIMITS.tracking.step}
              value={fontAxes.tracking}
              onInput={(e) =>
                updateAxes({ tracking: Number((e.target as HTMLInputElement).value) })
              }
              onChange={(e) => updateAxes({ tracking: Number(e.target.value) })}
            />
            <div className="preset-row" role="group" aria-label="Kerning presets">
              {TRACKING_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-btn tabular"
                  aria-pressed={Math.abs(fontAxes.tracking - p.value) < 0.0005}
                  onClick={() => updateAxes({ tracking: p.value })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 04 / APPEARANCE & PRACTICE */}
        <section className="drawer-section">
          <div className="drawer-section-head">
            <span className="drawer-section-label tabular">
              <span>04</span>Interface & Practice
            </span>
          </div>

          <div className="segment-group">
            <span className="segment-title">Appearance</span>
            <div className="segmented" role="group" aria-label="Color theme">
              {(
                [
                  ['system', 'System'],
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ] as [ThemeMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className="segmented-btn"
                  aria-pressed={settings.theme === mode}
                  onClick={() => onChange({ ...settings, theme: mode })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="segment-group">
            <span className="segment-title">
              Diacritics ({activeLanguage.diacritics.join(' ')})
            </span>
            <div className="segmented" role="group" aria-label="Diacritic tolerance">
              {(['strict', 'lenient'] as DiacriticMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="segmented-btn"
                  aria-pressed={settings.diacriticMode === mode}
                  onClick={() => onChange({ ...settings, diacriticMode: mode })}
                >
                  {mode === 'strict' ? 'Strict' : 'Lenient'}
                </button>
              ))}
            </div>
          </div>

          <div className="segment-group">
            <span className="segment-title">Word forms</span>
            <div className="form-checks" role="group" aria-label="Word forms to quiz">
              {WORD_FORM_META.map(({ kind, label, shortTag }) => {
                const checked = settings.wordForms[kind];
                const isLastChecked =
                  checked && Object.values(settings.wordForms).filter(Boolean).length <= 1;
                return (
                  <label
                    key={kind}
                    className={`form-check${checked ? ' form-check--checked' : ''}${
                      isLastChecked ? ' form-check--locked' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLastChecked}
                      onChange={() => toggleWordForm(kind)}
                    />
                    <span className="form-check-box" aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    <span className="form-check-label">{label}</span>
                    <span className="form-check-tag tabular">{shortTag}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DualRangeSlider
            idPrefix="verbs"
            label={verbsOnly ? 'Verbs' : 'Blanks'}
            minLimit={VERB_RANGE_MIN}
            maxLimit={VERB_RANGE_MAX}
            valueMin={settings.verbRange.min}
            valueMax={settings.verbRange.max}
            scaleLabels={['1', '4', '7', '10+']}
            onChange={(min, max) => onChange({ ...settings, verbRange: { min, max } })}
          />

          <DualRangeSlider
            idPrefix="verses"
            label="Verses"
            minLimit={VERSE_RANGE_MIN}
            maxLimit={VERSE_RANGE_MAX}
            valueMin={settings.verseRange.min}
            valueMax={settings.verseRange.max}
            scaleLabels={['1', '2', '3', '4', '5+']}
            onChange={(min, max) => onChange({ ...settings, verseRange: { min, max } })}
          />
        </section>
      </aside>
    </div>
  );
};
