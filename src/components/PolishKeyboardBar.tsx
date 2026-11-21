import React from 'react';
import { DIACRITIC_SHORTCUT_KEYS } from '../config/catalog';

interface PolishKeyboardBarProps {
  diacritics: string[];
  disabled: boolean;
  onInsert: (char: string) => void;
}

export const PolishKeyboardBar: React.FC<PolishKeyboardBarProps> = ({
  diacritics,
  disabled,
  onInsert,
}) => {
  if (diacritics.length === 0) return null;

  return (
    <div className="diacritic-bar" role="group" aria-label="Special characters">
      {diacritics.map((ch, idx) => {
        const shortcut = DIACRITIC_SHORTCUT_KEYS[idx] ?? null;
        return (
          <button
            key={ch}
            type="button"
            className="diacritic-key"
            disabled={disabled}
            aria-label={shortcut ? `Insert ${ch} (key ${shortcut})` : `Insert ${ch}`}
            title={shortcut ? `${ch} (press ${shortcut})` : ch}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(ch)}
          >
            {shortcut !== null && (
              <span className="diacritic-key-num tabular" aria-hidden="true">
                {shortcut}
              </span>
            )}
            <span>{ch}</span>
          </button>
        );
      })}
    </div>
  );
};
