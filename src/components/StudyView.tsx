import React, { useEffect, useState } from 'react';
import {
  GRAMMAR_CATEGORIES,
  GRAMMAR_GUIDES,
  type GrammarCategory,
} from '../data/grammarGuides';
import type { LanguageOption } from '../types/quiz';

interface StudyViewProps {
  language: LanguageOption;
  onBackToQuiz: () => void;
}

/**
 * Render inline **highlighted** inflectional endings with Swiss accent emphasis.
 */
function renderMarkedCell(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="grammar-end">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const StudyView: React.FC<StudyViewProps> = ({ language, onBackToQuiz }) => {
  const guide = GRAMMAR_GUIDES[language.code];
  const [selectedCategory, setSelectedCategory] = useState<'all' | GrammarCategory>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Reset filters when switching languages
  useEffect(() => {
    setSelectedCategory('all');
    setSelectedSection('all');
  }, [language.code]);

  const categorySections =
    selectedCategory === 'all'
      ? guide.sections
      : guide.sections.filter((s) => s.category === selectedCategory);

  const visibleSections =
    selectedSection === 'all'
      ? categorySections
      : categorySections.filter((s) => s.id === selectedSection);

  const handleSelectCategory = (cat: 'all' | GrammarCategory) => {
    setSelectedCategory(cat);
    setSelectedSection('all');
  };

  return (
    <section className="study-view" aria-label={`${language.name} grammar study guide`}>
      <div className="quiz-top-bar">
        <span className="study-kicker tabular">
          {language.name} · {language.nativeName}
        </span>
        <button type="button" className="skip-link" onClick={onBackToQuiz}>
          Back to Quiz →
        </button>
      </div>

      <div className="study-grid">
        {/* Header Row */}
        <div className="study-head">
          <div>
            <h1 className="study-title">{guide.title}</h1>
            <p className="study-subtitle">{guide.subtitle}</p>
          </div>
        </div>

        {/* Category Filter Tabs (Verbs / Nouns & Cases / Adjectives & Pronouns / Rules) */}
        <div className="study-cat-bar" role="group" aria-label="Grammar categories">
          {GRAMMAR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="study-cat-btn"
              aria-pressed={selectedCategory === cat.id}
              onClick={() => handleSelectCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Section Filter Pills */}
        <nav className="study-nav" aria-label="Grammar topics">
          <button
            type="button"
            className="study-pill"
            aria-pressed={selectedSection === 'all'}
            onClick={() => setSelectedSection('all')}
          >
            All ({categorySections.length})
          </button>
          {categorySections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className="study-pill tabular"
              aria-pressed={selectedSection === sec.id}
              onClick={() => setSelectedSection(sec.id)}
            >
              <span className="study-pill-num">{sec.num}</span>
              <span>{sec.title}</span>
            </button>
          ))}
        </nav>

        {/* Grammar Sections */}
        {visibleSections.map((sec) => (
          <div key={sec.id} className="grid-row study-section">
            <div className="grid-label tabular">
              <span className="grid-label-num">{sec.num}</span>
              <span>{sec.title}</span>
            </div>

            <div className="grid-value study-section-body">
              <div className="study-section-head">
                <h2 className="study-section-title">{sec.title}</h2>
                {sec.nativeTitle && (
                  <span className="study-section-native" lang={language.code}>
                    {sec.nativeTitle}
                  </span>
                )}
              </div>

              <p className="study-summary">{sec.summary}</p>

              {sec.tables.map((tbl, tIdx) => (
                <div key={tIdx} className="grammar-table-block">
                  {tbl.caption && <p className="grammar-table-caption">{tbl.caption}</p>}
                  <div className="grammar-table-wrap">
                    <table className="grammar-table">
                      <thead>
                        <tr>
                          {tbl.headers.map((h, hIdx) => (
                            <th key={hIdx} scope="col">
                              {renderMarkedCell(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={cIdx === 0 ? 'grammar-col-lead' : undefined}
                                lang={cIdx > 0 ? language.code : undefined}
                              >
                                {renderMarkedCell(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {sec.notes && sec.notes.length > 0 && (
                <ul className="grammar-notes">
                  {sec.notes.map((note, nIdx) => (
                    <li key={nIdx}>{renderMarkedCell(note)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
