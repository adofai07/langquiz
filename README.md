# VERBA — Minimalist Swiss Verb Form Quiz

A cross-platform Progressive Web App for practicing verb conjugation in context, designed in Swiss International Typographic Style and set in **[Allo](https://allo.joshpuckett.me/)**.

## Quick Start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Features

- **Focused inflection quiz**: Fill-in-the-blank conjugation and declension with language-specific word-form checkboxes (`Verbs`, `Participles`, `Articles` in German, `Transgressives` in Czech, `Nouns`, `Adjectives`, `Pronouns`), toggleable base/infinitive forms, inline lemma meanings, strict alphabet filtering, auto-capitalization matching sentence case, and single-key diacritic shortcuts.
- **Swiss typographic UI**: Asymmetric grid, light & dark modes, and live **Allo** variable font controls (`wght`, `ROND`, `opsz`, `Kerning`).
- **28 built-in public-domain corpora (Polish, German & Czech)**:
  - **Polish (11)**: *Bible (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **German (10)**: *Bible (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Czech (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
- **Custom book importer**: Import any `.txt` or `.epub` book in Polish, German, or Czech via `scripts/build_book_corpus.py`.
- **Offline PWA**: Installable across desktop and mobile browsers with lazy-loaded per-book/chapter chunks.
