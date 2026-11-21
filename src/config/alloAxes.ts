import type { AlloFontAxes } from '../types/quiz';

/**
 * Exact variable axes verified from AlloVariable.woff2 (allo-font@1.0.3) fvar table:
 * - wght: 100..900 (default 400)
 * - ROND: 0..100 (default 50)
 * - opsz: 9..32 (default 14)
 */
export const ALLO_AXIS_LIMITS = {
  wght: { min: 100, max: 900, default: 400, step: 1, tag: 'wght', label: 'Weight' },
  rond: { min: 0, max: 100, default: 50, step: 1, tag: 'ROND', label: 'Roundness' },
  opsz: { min: 9, max: 32, default: 14, step: 0.5, tag: 'opsz', label: 'Optical Size' },
} as const;

export const DEFAULT_FONT_AXES: AlloFontAxes = {
  wght: ALLO_AXIS_LIMITS.wght.default,
  rond: ALLO_AXIS_LIMITS.rond.default,
  opsz: ALLO_AXIS_LIMITS.opsz.default,
  opszAuto: false,
};

export const ROND_PRESETS = [
  { label: 'Sharp', value: 0 },
  { label: 'Friendly', value: 50 },
  { label: 'Round', value: 100 },
] as const;

export const OPSZ_PRESETS = [
  { label: 'Small', value: 9 },
  { label: 'Text', value: 14 },
  { label: 'Display', value: 32 },
] as const;

export function clampAxisWeight(wght: number, delta = 0): number {
  return Math.min(
    ALLO_AXIS_LIMITS.wght.max,
    Math.max(ALLO_AXIS_LIMITS.wght.min, Math.round(wght + delta))
  );
}

export function buildFontVariationSettings(axes: AlloFontAxes, weightDelta = 0): string {
  const clampedWght = clampAxisWeight(axes.wght, weightDelta);
  const clampedRond = Math.min(
    ALLO_AXIS_LIMITS.rond.max,
    Math.max(ALLO_AXIS_LIMITS.rond.min, Math.round(axes.rond))
  );
  if (axes.opszAuto) {
    return `"wght" ${clampedWght}, "ROND" ${clampedRond}`;
  }
  const clampedOpsz = Math.min(
    ALLO_AXIS_LIMITS.opsz.max,
    Math.max(ALLO_AXIS_LIMITS.opsz.min, Number(axes.opsz.toFixed(1)))
  );
  return `"wght" ${clampedWght}, "ROND" ${clampedRond}, "opsz" ${clampedOpsz}`;
}
