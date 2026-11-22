# VERBA — Cuestionario minimalista suizo de flexión

[English](README.md) | [Polski](README.pl.md) | [Deutsch](README.de.md) | [Čeština](README.cs.md) | **Español**

Aplicación web progresiva (PWA) multiplataforma para practicar conjugación verbal y declinación en contexto, diseñada en Estilo Tipográfico Internacional suizo y compuesta con la fuente variable **[Allo](https://allo.joshpuckett.me/)**.

## Inicio rápido

```bash
git clone https://github.com/adofai07/langquiz.git && cd langquiz && npm install && npm run dev
```

## Características

- **Cuestionario de flexión enfocado**: Ejercicios de completar huecos para conjugación y declinación con filtros gramaticales propios de cada idioma (`Verbs` / verbos, `Participles` / participios, `Gerunds` / gerundios en español, `Articles` / artículos en alemán y español, `Transgressives` / transgresivos en checo, `Nouns` / sustantivos, `Adjectives` / adjetivos, `Pronouns` / pronombres), opción de incluir formas base, significados de lemas en línea, pistas gramaticales concisas (`m.`, `f.`, `m.pl.`, `formal`, etc.), contexto desplegable del capítulo (`Show context`), filtrado estricto de alfabeto, ajuste automático de mayúsculas y minúsculas (incluso con Bloq Mayús activado) y atajos de una sola tecla para signos diacríticos.
- **Pestaña Study integrada**: Alterna entre **Quiz** y **Study** desde la barra superior sin perder la pregunta actual — con tablas completas de conjugación, voz pasiva, declinación, preposiciones, pronombres y reglas ortográficas para los cuatro idiomas.
- **Interfaz tipográfica suiza**: Retícula asimétrica, modo claro y oscuro, etiquetas compactas `Archaic` / `Dated` para textos históricos y controles en vivo de los ejes variables de **Allo** (`wght`, `ROND`, `opsz`, `Kerning`).
- **38 corpus integrados de dominio público (polaco, alemán, checo y español)**:
  - **Polaco (11)**: *Bible (UBG)*, *20 000 mil podmorskiej żeglugi* (Verne), *W osiemdziesiąt dni dookoła świata* (Verne), *Pies Baskerville'ów* (Doyle), *Studium w szkarłacie* (Doyle), *Wyspa skarbów* (Stevenson), *Trzej muszkieterowie* (Dumas), *Przygody Tomka Sawyera* (Twain), *Alicja w Krainie Czarów* (Carroll), *Robinson Crusoe* (Defoe), *Król Maciuś Pierwszy* (Korczak).
  - **Alemán (10)**: *Bible (Schlachter 1951)*, *Zwanzigtausend Meilen unter'm Meer* (Verne), *Reise um die Erde in 80 Tagen* (Verne), *Späte Rache* (Doyle), *Die Schatzinsel* (Stevenson), *Die Abenteuer Tom Sawyers* (Twain), *Alice im Wunderland* (Carroll), *Robinson Crusoe* (Defoe), *Die Verwandlung* (Kafka), *Siddhartha* (Hesse).
  - **Checo (7)**: *Bible (Kralická)*, *Pes baskervillský* (Doyle), *Dva roky prázdnin* (Verne), *Robinson Crusoe* (Defoe), *Kniha džunglí* (Kipling), *Povídky z jedné kapsy* (Čapek), *Válka s mloky* (Čapek).
  - **Español (10)**: *Biblia (Reina-Valera 1909)*, *Veinte mil leguas de viaje submarino* (Verne), *La vuelta al mundo en ochenta días* (Verne), *El sabueso de los Baskerville* (Doyle), *La isla del tesoro* (Stevenson), *Las aventuras de Tom Sawyer* (Twain), *Don Quijote de la Mancha* (Cervantes), *Cuentos de amor, de locura y de muerte* (Quiroga), *Lazarillo de Tormes*, *Niebla* (Unamuno).
- **Importador de libros propios**: Importa cualquier libro `.txt` o `.epub` en polaco, alemán, checo o español mediante `scripts/build_book_corpus.py`.
- **PWA sin conexión**: Instalable en navegadores de escritorio y móviles con carga diferida por libro y capítulo.
