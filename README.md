# VERBA — Minimalist Swiss Verb Form Quiz

A cross-platform Progressive Web App for practicing verb conjugation in context, designed in Swiss International Typographic Style and set in **[Allo](https://allo.joshpuckett.me/)**.

## Quick Start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Features

- **Focused verb-form quiz**: Fill-in-the-blank verb conjugation with inline auto-sized inputs, strict alphabet filtering, auto-capitalization matching sentence case, and keys `1`–`9` for diacritics.
- **Swiss typographic UI**: Asymmetric grid, light & dark modes, and live **Allo** variable font axis sliders (`wght`, `ROND`, `opsz`).
- **Bible corpora (Polish, German & Czech)**:
  - **Polish**: 66 books of *Uwspółcześniona Biblia Gdańska* (`pl_ubg.json`).
  - **German**: 66 books of *Schlachter 1951* (`de_sch1951.json`).
  - **Czech**: 66 books of *Bible kralická* (`cs_bkr.json`).
- **Offline PWA**: Installable across desktop and mobile browsers with lazy-loaded per-book chunks.
