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
  tracking: { min: -0.04, max: 0.12, default: 0, step: 0.005, tag: 'em', label: 'Kerning' },
} as const;

export const DEFAULT_FONT_AXES: AlloFontAxes = {
  wght: ALLO_AXIS_LIMITS.wght.default,
  rond: ALLO_AXIS_LIMITS.rond.default,
  opsz: ALLO_AXIS_LIMITS.opsz.default,
  opszAuto: false,
  tracking: ALLO_AXIS_LIMITS.tracking.default,
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

export const TRACKING_PRESETS = [
  { label: 'Tight', value: -0.02 },
  { label: 'Normal', value: 0 },
  { label: 'Open', value: 0.03 },
  { label: 'Wide', value: 0.06 },
] as const;

export function formatTracking(em: number): string {
  const fixed = Math.abs(em) < 0.0005 ? '0.000' : em.toFixed(3);
  return em > 0.0005 ? `+${fixed}em` : `${fixed}em`;
}

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
