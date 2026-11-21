import { useEffect, useState } from 'react';
import { DEFAULT_FONT_AXES } from '../config/alloAxes';
import {
  VERB_RANGE_MAX,
  VERB_RANGE_MIN,
  VERSE_RANGE_MAX,
  VERSE_RANGE_MIN,
  type AppSettings,
  type CountRange,
  type VerbRange,
  type VerseRange,
} from '../types/quiz';

const STORAGE_KEY = 'verba.settings.v1';

export const DEFAULT_VERB_RANGE: VerbRange = {
  min: 1,
  max: 5,
};

export const DEFAULT_VERSE_RANGE: VerseRange = {
  min: 1,
  max: 3,
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pl',
  corpusId: 'pl-bible-ubg',
  fontAxes: { ...DEFAULT_FONT_AXES },
  diacriticMode: 'strict',
  verbRange: { ...DEFAULT_VERB_RANGE },
  verseRange: { ...DEFAULT_VERSE_RANGE },
  theme: 'system',
};

function sanitizeRange(
  raw: unknown,
  minLimit: number,
  maxLimit: number,
  fallback: CountRange
): CountRange {
  if (raw && typeof raw === 'object' && 'min' in raw && 'max' in raw) {
    const r = raw as { min: unknown; max: unknown };
    const rawMin = Number(r.min);
    const rawMax = Number(r.max);
    if (Number.isFinite(rawMin) && Number.isFinite(rawMax)) {
      const min = Math.min(maxLimit, Math.max(minLimit, Math.round(rawMin)));
      const max = Math.min(maxLimit, Math.max(min, Math.round(rawMax)));
      return { min, max };
    }
  }
  return { ...fallback };
}

function sanitizeVerbRange(raw: unknown, legacyLimit?: unknown): VerbRange {
  if (raw && typeof raw === 'object' && 'min' in raw && 'max' in raw) {
    return sanitizeRange(raw, VERB_RANGE_MIN, VERB_RANGE_MAX, DEFAULT_VERB_RANGE);
  }
  if (legacyLimit === 'up-to-3') return { min: 1, max: 3 };
  if (legacyLimit === 'up-to-5') return { min: 1, max: 5 };
  if (legacyLimit === 'all') return { min: 1, max: VERB_RANGE_MAX };
  return { ...DEFAULT_VERB_RANGE };
}

function readStoredSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { blankLimit?: unknown };
    return {
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      corpusId: parsed.corpusId ?? DEFAULT_SETTINGS.corpusId,
      diacriticMode: parsed.diacriticMode ?? DEFAULT_SETTINGS.diacriticMode,
      verbRange: sanitizeVerbRange(parsed.verbRange, parsed.blankLimit),
      verseRange: sanitizeRange(
        parsed.verseRange,
        VERSE_RANGE_MIN,
        VERSE_RANGE_MAX,
        DEFAULT_VERSE_RANGE
      ),
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
      fontAxes: {
        ...DEFAULT_FONT_AXES,
        ...(parsed.fontAxes ?? {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function usePersistedSettings() {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota / private mode failures
    }
  }, [settings]);

  return [settings, setSettings] as const;
}
