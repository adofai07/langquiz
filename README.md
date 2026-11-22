# VERBA — Minimalist Swiss Inflection Quiz

**English** | [Polski](README.pl.md) | [Deutsch](README.de.md) | [Čeština](README.cs.md) | [Español](README.es.md)

A cross-platform Progressive Web App for practicing verb conjugation and word declension in context, designed in Swiss International Typographic Style and set in **[Allo](https://allo.joshpuckett.me/)**.

## Quick Start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Features

- **Focused inflection quiz**: Fill-in-the-blank conjugation and declension with language-specific word-form checkboxes (`Verbs`, `Participles`, `Gerunds` in Spanish, `Articles` in German & Spanish, `Transgressives` in Czech, `Nouns`, `Adjectives`, `Pronouns`), toggleable base/infinitive forms, inline lemma meanings, grammatical disambiguation cues (`m.`, `f.`, `m.pl.`, `formal`, etc.), expandable chapter context (`Show context`), strict alphabet filtering, automatic case matching (including Caps Lock correction), and single-key diacritic shortcuts.
- **Built-in Study tab**: Toggle between **Quiz** and **Study** in the top bar without losing your current question—featuring full conjugation, passive voice, case declension, preposition, pronoun, and spelling-rule tables for all four languages.
- **Swiss typographic UI**: Asymmetric grid, light & dark modes, compact `Archaic` / `Dated` corpus tags, and live **Allo** variable font controls (`wght`, `ROND`, `opsz`, `Kerning`).
- **38 built-in public-domain corpora (Polish, German, Czech & Spanish)**:
  - **Polish (11)**: *Bible (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **German (10)**: *Bible (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Czech (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
  - **Spanish (10)**: *Bible (Reina-Valera 1909)*, *Veinte mil leguas de viaje submarino* (Verne), *La vuelta al mundo en ochenta días* (Verne), *El sabueso de los Baskerville* (Doyle), *La isla del tesoro* (Stevenson), *Las aventuras de Tom Sawyer* (Twain), *Don Quijote de la Mancha* (Cervantes), *Cuentos de amor, de locura y de muerte* (Quiroga), *Lazarillo de Tormes*, *Niebla* (Unamuno).
- **Custom book importer**: Import any `.txt` or `.epub` book in Polish, German, Czech, or Spanish via `scripts/build_book_corpus.py`.
- **Offline PWA**: Installable across desktop and mobile browsers with lazy-loaded per-book/chapter chunks.
