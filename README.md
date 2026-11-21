# VERBA — Minimalist Swiss Verb Form Quiz

A cross-platform Progressive Web App for practicing verb conjugation in context, designed in Swiss International Typographic Style and set in **[Allo](https://allo.joshpuckett.me/)**.

## Quick Start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Features

- **Focused inflection quiz**: Fill-in-the-blank conjugation and declension with language-specific word-form checkboxes (`Verbs`, `Participles`, `Articles` in German, `Transgressives` in Czech, `Nouns`, `Adjectives`, `Pronouns`), toggleable base/infinitive forms, inline lemma meanings, strict alphabet filtering, auto-capitalization matching sentence case, and single-key diacritic shortcuts.
- **Swiss typographic UI**: Asymmetric grid, light & dark modes, and live **Allo** variable font controls (`wght`, `ROND`, `opsz`, `Kerning`).
- **10 built-in corpora (Polish, German & Czech)**:
  - **Polish**: *Bible (UBG)*, *Król Maciuś Pierwszy* (Korczak), *Pies Baskerville'ów* (Doyle).
  - **German**: *Bible (Schlachter 1951)*, *Die Verwandlung* (Kafka), *Siddhartha* (Hesse), *Späte Rache* (Doyle).
  - **Czech**: *Bible (Kralická)*, *Povídky z jedné kapsy* (Čapek), *Pes baskervillský* (Doyle).
- **Custom book importer**: Import any `.txt` or `.epub` book in Polish, German, or Czech via `scripts/build_book_corpus.py`.
- **Offline PWA**: Installable across desktop and mobile browsers with lazy-loaded per-book/chapter chunks.
