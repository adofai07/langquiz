import React from 'react';
import type { CorpusOption, LanguageOption } from '../types/quiz';

interface HeaderProps {
  language: LanguageOption;
  corpus: CorpusOption;
  solvedCount: number;
  attemptedCount: number;
  resolvedTheme: 'light' | 'dark';
  settingsOpen: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  corpus,
  solvedCount,
  attemptedCount,
  resolvedTheme,
  settingsOpen,
  onToggleTheme,
  onToggleSettings,
}) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const isDark = resolvedTheme === 'dark';

  return (
    <header className="swiss-header">
      <div className="swiss-header-inner">
        <div className="brand-group">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-title">VERBA</span>
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          <span className="brand-meta tabular">
            {language.code.toUpperCase()} · {corpus.shortLabel}
          </span>
        </div>

        <div className="header-actions">
          <div className="session-counter tabular" aria-label="Session score">
            <strong>{pad(solvedCount)}</strong>
            <span>/</span>
            <span>{pad(attemptedCount)}</span>
          </div>

          <button
            type="button"
            className="icon-btn icon-btn--square"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
                <line x1="7" y1="0.8" x2="7" y2="2.4" stroke="currentColor" strokeWidth="1.3" />
                <line x1="7" y1="11.6" x2="7" y2="13.2" stroke="currentColor" strokeWidth="1.3" />
                <line x1="0.8" y1="7" x2="2.4" y2="7" stroke="currentColor" strokeWidth="1.3" />
                <line x1="11.6" y1="7" x2="13.2" y2="7" stroke="currentColor" strokeWidth="1.3" />
                <line x1="2.6" y1="2.6" x2="3.7" y2="3.7" stroke="currentColor" strokeWidth="1.3" />
                <line x1="10.3" y1="10.3" x2="11.4" y2="11.4" stroke="currentColor" strokeWidth="1.3" />
                <line x1="11.4" y1="2.6" x2="10.3" y2="3.7" stroke="currentColor" strokeWidth="1.3" />
                <line x1="3.7" y1="10.3" x2="2.6" y2="11.4" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M11.6 8.8A4.9 4.9 0 0 1 5.2 2.4a5.2 5.2 0 1 0 6.4 6.4Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={onToggleSettings}
            aria-expanded={settingsOpen}
            aria-controls="settings-drawer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="4.5" cy="3" r="1.6" fill="currentColor" />
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="9.5" cy="7" r="1.6" fill="currentColor" />
              <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="6" cy="11" r="1.6" fill="currentColor" />
            </svg>
            Settings
          </button>
        </div>
      </div>
    </header>
  );
};
