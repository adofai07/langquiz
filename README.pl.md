# VERBA — Minimalistyczny szwajcarski quiz fleksyjny

[English](README.md) | **Polski** | [Deutsch](README.de.md) | [Čeština](README.cs.md) | [Español](README.es.md)

Wieloplatformowa aplikacja Progressive Web App do ćwiczenia koniugacji i deklinacji w kontekście, zaprojektowana w szwajcarskim stylu typograficznym i złożona zmiennym krojem **[Allo](https://allo.joshpuckett.me/)**.

## Szybki start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Funkcje

- **Skupiony quiz fleksyjny**: Ćwiczenie odmiany z uzupełnianiem luk i wyborem części mowy dla danego języka (`Verbs` / czasowniki, `Participles` / imiesłowy, `Gerunds` / gerundia w hiszpańskim, `Articles` / rodzajniki w niemieckim i hiszpańskim, `Transgressives` / imiesłowy przysłówkowe w czeskim, `Nouns` / rzeczowniki, `Adjectives` / przymiotniki, `Pronouns` / zaimki), przełączanie form podstawowych, znaczenia haseł w locie, zwięzłe wskazówki gramatyczne (`m.`, `f.`, `m.pl.`, `formal` itd.), rozwijany kontekst rozdziału (`Show context`), ścisłe filtrowanie alfabetu, automatyczne dopasowanie wielkości liter (również przy włączonym Caps Locku) oraz jednoklawiszowe skróty dla znaków diakrytycznych.
- **Wbudowana zakładka Study**: Przełączanie między trybami **Quiz** i **Study** na górnym pasku bez utraty bieżącego pytania — z pełnymi tabelami koniugacji, strony biernej, deklinacji, przyimków, zaimków oraz oboczności dla wszystkich czterech języków.
- **Szwajcarski interfejs typograficzny**: Asymetryczna siatka, tryb jasny i ciemny, zwięzłe oznaczenia `Archaic` / `Dated` dla starszych tekstów oraz sterowanie osiami zmiennego fontu **Allo** na żywo (`wght`, `ROND`, `opsz`, `Kerning`).
- **38 wbudowanych korpusów z domeny publicznej (polski, niemiecki, czeski i hiszpański)**:
  - **Polski (11)**: *Biblia (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **Niemiecki (10)**: *Bible (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Czeski (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
  - **Hiszpański (10)**: *Bible (Reina-Valera 1909)*, *Veinte mil leguas de viaje submarino* (Verne), *La vuelta al mundo en ochenta días* (Verne), *El sabueso de los Baskerville* (Doyle), *La isla del tesoro* (Stevenson), *Las aventuras de Tom Sawyer* (Twain), *Don Quijote de la Mancha* (Cervantes), *Cuentos de amor, de locura y de muerte* (Quiroga), *Lazarillo de Tormes*, *Niebla* (Unamuno).
- **Importer własnych książek**: Importowanie dowolnych książek `.txt` lub `.epub` w języku polskim, niemieckim, czeskim lub hiszpańskim przez `scripts/build_book_corpus.py`.
- **PWA działające offline**: Możliwość instalacji w przeglądarkach desktopowych i mobilnych z leniwym ładowaniem poszczególnych ksiąg i rozdziałów.
