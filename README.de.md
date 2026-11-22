# VERBA — Minimalistisches Schweizer Flexionsquiz

[English](README.md) | [Polski](README.pl.md) | **Deutsch** | [Čeština](README.cs.md) | [Español](README.es.md)

Eine plattformübergreifende Progressive Web App zum Üben von Verbkonjugation und Wortdeklination im Kontext, gestaltet im Schweizer Internationalen Typografischen Stil und gesetzt in **[Allo](https://allo.joshpuckett.me/)**.

## Schnellstart

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Funktionen

- **Fokussiertes Flexionsquiz**: Lückentext-Übungen für Konjugation und Deklination mit sprachspezifischen Wortart-Filtern (`Verbs`, `Participles`, `Gerunds` im Spanischen, `Articles` im Deutschen & Spanischen, `Transgressives` im Tschechischen, `Nouns`, `Adjectives`, `Pronouns`), zuschaltbaren Grundformen, direkten Bedeutungsangaben, knappen Grammatikhinweisen (`m.`, `f.`, `m.pl.`, `formal` usw.), aufklappbarem Kapitelkontext (`Show context`), strenger Alphabetfilterung, automatischer Groß-/Kleinschreibungsanpassung (auch bei aktiver Feststelltaste) und Eintasten-Kürzeln für Sonderzeichen.
- **Integrierter Study-Tab**: Nahtloser Wechsel zwischen **Quiz** und **Study** in der Kopfzeile ohne Verlust der aktuellen Aufgabe — mit vollständigen Tabellen zu Konjugation, Passiv, Kasusdeklination, Präpositionen, Pronomen und Laut-/Rechtschreibregeln für alle vier Sprachen.
- **Schweizer Typografie-UI**: Asymmetrisches Raster, Hell- & Dunkelmodus, kompakte `Archaic`- / `Dated`-Markierungen für historische Texte sowie Live-Regler für den variablen Font **Allo** (`wght`, `ROND`, `opsz`, `Kerning`).
- **38 integrierte gemeinfreie Korpora (Polnisch, Deutsch, Tschechisch & Spanisch)**:
  - **Polnisch (11)**: *Bible (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **Deutsch (10)**: *Bibel (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Tschechisch (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
  - **Spanisch (10)**: *Bible (Reina-Valera 1909)*, *Veinte mil leguas de viaje submarino* (Verne), *La vuelta al mundo en ochenta días* (Verne), *El sabueso de los Baskerville* (Doyle), *La isla del tesoro* (Stevenson), *Las aventuras de Tom Sawyer* (Twain), *Don Quijote de la Mancha* (Cervantes), *Cuentos de amor, de locura y de muerte* (Quiroga), *Lazarillo de Tormes*, *Niebla* (Unamuno).
- **Eigener Buch-Importer**: Beliebige `.txt`- oder `.epub`-Bücher auf Polnisch, Deutsch, Tschechisch oder Spanisch über `scripts/build_book_corpus.py` importieren.
- **Offline-PWA**: Installierbar auf Desktop- und Mobilgeräten mit bedarfsgerechtem Nachladen einzelner Bücher und Kapitel.
