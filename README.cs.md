# VERBA — Minimalistický švýcarský kvíz tvarosloví

[English](README.md) | [Polski](README.pl.md) | [Deutsch](README.de.md) | **Čeština** | [Español](README.es.md)

Multiplatformní progresivní webová aplikace (PWA) pro procvičování časování a skloňování v kontextu, navržená ve švýcarském mezinárodním typografickém stylu a vysázená variabilním písmem **[Allo](https://allo.joshpuckett.me/)**.

## Rychlý start

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Funkce

- **Soustředěný kvíz ohýbání slov**: Doplňování slovesných i jmenných tvarů s výběrem slovních druhů pro jednotlivé jazyky (`Verbs` / slovesa, `Participles` / příčestí, `Gerunds` / gerundia ve španělštině, `Articles` / členy v němčině a španělštině, `Transgressives` / přechodníky v češtině, `Nouns` / podstatná jména, `Adjectives` / přídavná jména, `Pronouns` / zájmena), přepínání základních tvarů, průběžné významy lemmat, stručné gramatické nápovědy (`m.`, `f.`, `m.pl.`, `formal` aj.), rozbalitelný kontext kapitoly (`Show context`), přísné filtrování abecedy, automatické přizpůsobení velikosti písmen (včetně opravy zapnutého Caps Locku) a jednoklávesové zkratky pro diakritiku.
- **Vestavěná záložka Study**: Přepínání mezi režimy **Quiz** a **Study** v horní liště bez ztráty rozpracované otázky — s přehlednými tabulkami časování, trpného rodu, skloňování, předložek, zájmen a hláskových změn pro všechny čtyři jazyky.
- **Švýcarské typografické rozhraní**: Asymetrická mřížka, světlý i tmavý režim, stručné štítky `Archaic` / `Dated` u starších textů a živé ovládání os variabilního písma **Allo** (`wght`, `ROND`, `opsz`, `Kerning`).
- **38 vestavěných volně dostupných korpusů (polština, němčina, čeština a španělština)**:
  - **Polština (11)**: *Bible (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **Němčina (10)**: *Bible (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Čeština (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
  - **Španělština (10)**: *Bible (Reina-Valera 1909)*, *Veinte mil leguas de viaje submarino* (Verne), *La vuelta al mundo en ochenta días* (Verne), *El sabueso de los Baskerville* (Doyle), *La isla del tesoro* (Stevenson), *Las aventuras de Tom Sawyer* (Twain), *Don Quijote de la Mancha* (Cervantes), *Cuentos de amor, de locura y de muerte* (Quiroga), *Lazarillo de Tormes*, *Niebla* (Unamuno).
- **Import vlastních knih**: Import libovolných knih ve formátu `.txt` nebo `.epub` v polštině, němčině, češtině nebo španělštině pomocí `scripts/build_book_corpus.py`.
- **Offline PWA**: Instalovatelná v desktopových i mobilních prohlížečích s postupným načítáním jednotlivých knih a kapitol.
