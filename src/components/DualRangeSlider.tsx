import React, { useRef, useState } from 'react';

interface DualRangeSliderProps {
  idPrefix: string;
  label: string;
  minLimit: number;
  maxLimit: number;
  valueMin: number;
  valueMax: number;
  maxPlusSuffix?: boolean;
  scaleLabels: string[];
  onChange: (nextMin: number, nextMax: number) => void;
}

type ActiveThumb = 'min' | 'max' | 'either' | null;

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  idPrefix,
  label,
  minLimit,
  maxLimit,
  valueMin,
  valueMax,
  maxPlusSuffix = true,
  scaleLabels,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeThumbRef = useRef<ActiveThumb>(null);
  const anchorValRef = useRef<number>(valueMin);
  const [draggingThumb, setDraggingThumb] = useState<'min' | 'max' | null>(null);

  const span = Math.max(1, maxLimit - minLimit);
  const minPct = ((valueMin - minLimit) / span) * 100;
  const maxPct = ((valueMax - minLimit) / span) * 100;

  const formatBound = (n: number) => (maxPlusSuffix && n >= maxLimit ? `${maxLimit}+` : String(n));
  const summary =
    valueMin === valueMax
      ? formatBound(valueMax)
      : `${valueMin}–${formatBound(valueMax)}`;

  const valueFromClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return valueMin;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(minLimit + ratio * span);
  };

  const applyValue = (rawVal: number) => {
    let thumb = activeThumbRef.current;
    if (!thumb) return;

    // When start and end overlap, the first movement direction picks which thumb moves
    if (thumb === 'either') {
      if (rawVal < anchorValRef.current) {
        thumb = 'min';
        activeThumbRef.current = 'min';
        setDraggingThumb('min');
      } else if (rawVal > anchorValRef.current) {
        thumb = 'max';
        activeThumbRef.current = 'max';
        setDraggingThumb('max');
      } else {
        return;
      }
    }

    if (thumb === 'min') {
      const nextMin = Math.min(valueMax, Math.max(minLimit, rawVal));
      if (nextMin !== valueMin) onChange(nextMin, valueMax);
    } else {
      const nextMax = Math.max(valueMin, Math.min(maxLimit, rawVal));
      if (nextMax !== valueMax) onChange(valueMin, nextMax);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);

    const clickedVal = valueFromClientX(e.clientX);
    if (valueMin === valueMax) {
      if (clickedVal < valueMin) {
        activeThumbRef.current = 'min';
        setDraggingThumb('min');
        onChange(clickedVal, valueMax);
      } else if (clickedVal > valueMax) {
        activeThumbRef.current = 'max';
        setDraggingThumb('max');
        onChange(valueMin, clickedVal);
      } else {
        // Grabbed right on top of overlapped thumbs: decide on first drag movement
        activeThumbRef.current = 'either';
        anchorValRef.current = valueMin;
        setDraggingThumb('min');
      }
    } else {
      const distMin = Math.abs(clickedVal - valueMin);
      const distMax = Math.abs(clickedVal - valueMax);
      const chosen: 'min' | 'max' = distMin <= distMax ? 'min' : 'max';
      activeThumbRef.current = chosen;
      setDraggingThumb(chosen);
      applyValue(clickedVal);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeThumbRef.current) return;
    applyValue(valueFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeThumbRef.current) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    activeThumbRef.current = null;
    setDraggingThumb(null);
  };

  const handleThumbKeyDown = (which: 'min' | 'max', e: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 1;
    else if (e.key === 'Home') delta = minLimit - maxLimit;
    else if (e.key === 'End') delta = maxLimit - minLimit;
    else return;

    e.preventDefault();
    if (which === 'min') {
      const nextMin = Math.min(valueMax, Math.max(minLimit, valueMin + delta));
      if (nextMin !== valueMin) onChange(nextMin, valueMax);
    } else {
      const nextMax = Math.max(valueMin, Math.min(maxLimit, valueMax + delta));
      if (nextMax !== valueMax) onChange(valueMin, nextMax);
    }
  };

  return (
    <div className="segment-group">
      <div className="axis-row">
        <span className="segment-title" style={{ marginBottom: 0 }}>
          {label}
        </span>
        <span className="axis-value tabular">{summary}</span>
      </div>

      <div
        ref={trackRef}
        className="dual-range"
        role="group"
        aria-label={`${label} range`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="dual-range-track" aria-hidden="true">
          <div
            className="dual-range-fill"
            style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
          />
        </div>

        <div
          id={`${idPrefix}-min`}
          role="slider"
          tabIndex={0}
          className={`dual-range-thumb${draggingThumb === 'min' ? ' dual-range-thumb--active' : ''}`}
          style={{ left: `${minPct}%` }}
          aria-label={`Minimum ${label.toLowerCase()}`}
          aria-valuemin={minLimit}
          aria-valuemax={valueMax}
          aria-valuenow={valueMin}
          onKeyDown={(e) => handleThumbKeyDown('min', e)}
        />

        <div
          id={`${idPrefix}-max`}
          role="slider"
          tabIndex={0}
          className={`dual-range-thumb${draggingThumb === 'max' ? ' dual-range-thumb--active' : ''}`}
          style={{ left: `${maxPct}%` }}
          aria-label={`Maximum ${label.toLowerCase()}`}
          aria-valuemin={valueMin}
          aria-valuemax={maxLimit}
          aria-valuenow={valueMax}
          onKeyDown={(e) => handleThumbKeyDown('max', e)}
        />
      </div>

      <div className="range-scale tabular" aria-hidden="true">
        {scaleLabels.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
};
