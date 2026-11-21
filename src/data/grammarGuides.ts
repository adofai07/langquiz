import type { LanguageCode } from '../types/quiz';

export interface GrammarTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface GrammarSection {
  num: string;
  id: string;
  title: string;
  nativeTitle?: string;
  summary: string;
  tables: GrammarTable[];
  notes?: string[];
}

export interface LanguageGrammarGuide {
  language: LanguageCode;
  title: string;
  subtitle: string;
  sections: GrammarSection[];
}

export const GRAMMAR_GUIDES: Record<LanguageCode, LanguageGrammarGuide> = {
  pl: {
    language: 'pl',
    title: 'Polish Inflection Reference',
    subtitle: 'Polski · Conjugation, Gender, Aspect & 7 Cases',
    sections: [
      {
        num: '01',
        id: 'present',
        title: 'Present & Simple Future',
        nativeTitle: 'Czas teraźniejszy',
        summary:
          'Imperfective verbs use these endings for the present tense; perfective verbs use the exact same endings for the simple future (e.g. zrobić → zrobię "I will do").',
        tables: [
          {
            caption: 'Four Present Conjugation Classes',
            headers: ['Person', '-am / -asz (czytać)', '-em / -esz (umieć)', '-ę / -esz (pisać)', '-ę / -isz / -ysz (mówić)'],
            rows: [
              ['ja (1sg)', 'czyta**m**', 'umie**m**', 'pisz**ę**', 'mówi**ę**'],
              ['ty (2sg)', 'czyta**sz**', 'umie**sz**', 'pisz**esz**', 'mów**isz** / słysz**ysz**'],
              ['on/ona/ono (3sg)', 'czyta**Ø**', 'umie**Ø**', 'pisz**e**', 'mów**i** / słysz**y**'],
              ['my (1pl)', 'czyta**my**', 'umie**my**', 'pisz**emy**', 'mów**imy** / słysz**ymy**'],
              ['wy (2pl)', 'czyta**cie**', 'umie**cie**', 'pisz**ecie**', 'mów**icie** / słysz**ycie**'],
              ['oni/one (3pl)', 'czyta**ją**', 'umie**ją**', 'pisz**ą**', 'mówi**ą** / słysz**ą**'],
            ],
          },
        ],
        notes: [
          'Verbs in -ować / -ywać / -iwać replace that suffix with -uj- before -ę/-esz: pracować → prac**uję**, prac**ujesz**, prac**ują**.',
          'Stem consonant softening is regular in -ę/-esz verbs: k→cz (płakać → płaczę), g→ż (móc → możesz), t→c, d→dz, r→rz, s→sz.',
        ],
      },
      {
        num: '02',
        id: 'past',
        title: 'Past Tense (Gender & Number)',
        nativeTitle: 'Czas przeszły',
        summary:
          'Drop -ć from the infinitive, add -ł- (or -l- in masculine-personal plural), then the gender vowel + personal ending. Every person distinguishes grammatical gender.',
        tables: [
          {
            caption: 'Past Endings (Example: chcieć — to want)',
            headers: ['Person', 'Masculine / m.pl.', 'Feminine / non-m.pl.', 'Neuter'],
            rows: [
              ['ja (1sg)', 'chcia**łem** (m.)', 'chcia**łam** (f.)', 'chcia**łom** (n.)'],
              ['ty (2sg)', 'chcia**łeś** (sg. m.)', 'chcia**łaś** (sg. f.)', 'chcia**łoś** (sg. n.)'],
              ['on / ona / ono (3sg)', 'chcia**ł**', 'chcia**ła**', 'chcia**ło**'],
              ['my (1pl)', 'chcie**liśmy** (m.pl.)', 'chcia**łyśmy** (non-m.pl.)', '—'],
              ['wy (2pl)', 'chcie**liście** (pl. m.)', 'chcia**łyście** (pl. non-m.)', '—'],
              ['oni / one (3pl)', 'chcie**li** (m.pl.)', 'chcia**ły** (non-m.pl.)', '—'],
            ],
          },
        ],
        notes: [
          'Infinitives in -eć shift e → a everywhere EXCEPT masculine-personal plural: chcieć → chci**ał**em / chci**ał**am, but chci**el**iśmy / chci**el**i (also mieć → miał/mieli, widzieć → widział/widzieli).',
          'Infinitives in -ąć shift ą → ę outside masc. sg.: wziąć → wzi**ąłem** (m.), wzi**ęłam** (f.), wzi**ęli** (m.pl.), wzi**ęły** (non-m.pl.).',
          'Masculine-personal plural (m.pl. / virile) is used for any group containing at least one male person; all other groups (women, animals, objects) take non-m.pl. (-ły).',
          'Mobile clitics (-em, -eś, -śmy, -ście) can detach onto an earlier word: gdy**bym** chciał, aby**ś** zrobiła, że**śmy** poszli.',
        ],
      },
      {
        num: '03',
        id: 'future-mood',
        title: 'Compound Future, Conditional & Imperative',
        nativeTitle: 'Przyszły · Przypuszczający · Rozkazujący',
        summary:
          'Imperfective future combines będę with either the infinitive or 3rd-person past participle; conditional inserts -by- before the personal ending.',
        tables: [
          {
            caption: 'Future of być & Conditional Endings (mówić)',
            headers: ['Person', 'Future aux (być)', 'Conditional m. / m.pl.', 'Conditional f. / non-m.pl.'],
            rows: [
              ['ja (1sg)', 'będ**ę**', 'mówił**bym**', 'mówiła**bym**'],
              ['ty (2sg)', 'będzi**esz**', 'mówił**byś**', 'mówiła**byś**'],
              ['on / ona / ono (3sg)', 'będzi**e**', 'mówił**by** / mówiło**by** (n.)', 'mówiła**by**'],
              ['my (1pl)', 'będzi**emy**', 'mówili**byśmy**', 'mówiły**byśmy**'],
              ['wy (2pl)', 'będzi**ecie**', 'mówili**byście**', 'mówiły**byście**'],
              ['oni / one (3pl)', 'będ**ą**', 'mówili**by**', 'mówiły**by**'],
            ],
          },
          {
            caption: 'Imperative Mood (Commands)',
            headers: ['Pattern', 'ty (sg.)', 'my (let us)', 'wy (pl.)'],
            rows: [
              ['-am/-asz (czytać)', 'czyta**j**', 'czyta**jmy**', 'czyta**jcie**'],
              ['-ę/-esz (pisać / iść)', 'pisz**Ø** / idź**Ø**', 'pisz**my** / idź**my**', 'pisz**cie** / idź**cie**'],
              ['-ę/-isz (mówić / zrobić)', 'mów**Ø** / zrób**Ø**', 'mów**my** / zrób**my**', 'mów**cie** / zrób**cie**'],
              ['Cluster + -ij (wziąć / spać)', 'weź**Ø** / śp**ij**', 'weź**my** / śp**ijmy**', 'weź**cie** / śp**ijcie**'],
            ],
          },
        ],
        notes: [
          'Vowel raising o → ó often appears in closed imperative syllables: robić → r**ó**b, mówić → m**ó**w, pomóc → pom**ó**ż.',
          'Formal commands use niech + 3sg/3pl present: Niech pan wejdzie ("Please come in").',
        ],
      },
      {
        num: '04',
        id: 'participles',
        title: 'Participles',
        nativeTitle: 'Imiesłowy',
        summary:
          'Adjectival participles decline for gender, number, and case like adjectives; adverbial participles (-ąc, -wszy, -łszy) are indeclinable.',
        tables: [
          {
            caption: 'Polish Participle Types',
            headers: ['Type', 'Formation', 'Examples', 'Meaning'],
            rows: [
              ['Active adjectival (impf.)', '3pl pres. + -cy / -ca / -ce', 'mówią**cy**, widzą**ca**, idą**ce**', 'speaking, seeing, going'],
              ['Passive adjectival', 'past stem + -ny / -ony / -ty', 'napisa**ny**, zrobio**na**, otwar**te**', 'written, done, opened'],
              ['Contemporary adverbial (impf.)', '3pl pres. + -c', 'mówi**ąc**, id**ąc**, patrz**ąc**', 'while speaking / going'],
              ['Anterior adverbial (perf.)', 'past stem + -wszy / -łszy', 'zrobi**wszy**, wyszed**łszy**, rzek**łszy**', 'having done / gone out'],
            ],
          },
        ],
      },
      {
        num: '05',
        id: 'cases',
        title: 'Nouns — 7 Cases',
        nativeTitle: 'Przypadki rzeczowników',
        summary:
          'Polish nouns decline across 7 cases. Masculine animate singular Accusative = Genitive (-a); masculine inanimate Accusative = Nominative.',
        tables: [
          {
            caption: 'Core Singular & Plural Noun Endings',
            headers: ['Case', 'Masc. sg.', 'Fem. sg. (-a)', 'Neut. sg. (-o/-e)', 'Plural (all)'],
            rows: [
              ['Nom (kto? co?)', '-Ø', '**-a** / -i', '**-o** / **-e** / -ę', '**-y/-i** (m.p. **-i/-owie**) / **-a** (n.)'],
              ['Gen (kogo? czego?)', '**-a** / **-u**', '**-y** / **-i**', '**-a**', '**-ów** / **-y/-i** / **-Ø**'],
              ['Dat (komu? czemu?)', '**-owi** / **-u**', '**-e** / **-i/-y**', '**-u**', '**-om**'],
              ['Acc (kogo? co?)', '= Gen (anim) / Nom (inan)', '**-ę**', '= Nom', '= Gen (m.p.) / Nom'],
              ['Inst (z kim? czym?)', '**-em** / **-iem**', '**-ą**', '**-em** / **-iem**', '**-ami** / **-mi**'],
              ['Loc (o kim? czym?)', '**-e** / **-u**', '**-e** / **-i/-y**', '**-e** / **-u**', '**-ach**'],
              ['Voc (direct address)', '**-e** / **-u**', '**-o** / **-u** / **-i**', '= Nom', '= Nom'],
            ],
          },
        ],
        notes: [
          'Key prepositions: Genitive (do, od, z "from", bez, dla, u, koło, podczas); Dative (ku, dzięki, przeciwko); Accusative (przez, na/w motion); Instrumental (z "with", przed, nad, pod, między); Locative (w, na, o, po, przy).',
        ],
      },
      {
        num: '06',
        id: 'adj-pron',
        title: 'Adjectives & Pronouns',
        nativeTitle: 'Przymiotniki · Zaimki',
        summary:
          'Adjectives agree in gender, number, and case with their noun. After k/g, y becomes i (wielki, drogi).',
        tables: [
          {
            caption: 'Adjective Endings (nowy — new)',
            headers: ['Case', 'Masc. sg.', 'Neut. sg.', 'Fem. sg.', 'm.pl. (virile)', 'non-m.pl.'],
            rows: [
              ['Nom', 'now**y**', 'now**e**', 'now**a**', 'now**i**', 'now**e**'],
              ['Gen', 'now**ego**', 'now**ego**', 'now**ej**', 'now**ych**', 'now**ych**'],
              ['Dat', 'now**emu**', 'now**emu**', 'now**ej**', 'now**ym**', 'now**ym**'],
              ['Acc', '= Gen / Nom', 'now**e**', 'now**ą**', 'now**ych**', 'now**e**'],
              ['Inst', 'now**ym**', 'now**ym**', 'now**ą**', 'now**ymi**', 'now**ymi**'],
              ['Loc', 'now**ym**', 'now**ym**', 'now**ej**', 'now**ych**', 'now**ych**'],
            ],
          },
          {
            caption: 'Personal Pronouns (Nom / Gen-Acc / Dat / Inst)',
            headers: ['Nom', 'Gen / Acc', 'Dat', 'Inst', 'Loc'],
            rows: [
              ['ja (I)', '**mnie** / **mię**', '**mi** / **mnie**', '**mną**', '**mnie**'],
              ['ty (you sg.)', '**cię** / **ciebie**', '**ci** / **tobie**', '**tobą**', '**tobie**'],
              ['on / ono (he/it)', '**go** / **jego** / **niego**', '**mu** / **jemu** / **niemu**', '**nim**', '**nim**'],
              ['ona (she)', '**jej** / **niej** (Acc **ją**/**nią**)', '**jej** / **niej**', '**nią**', '**niej**'],
              ['my (we)', '**nas**', '**nam**', '**nami**', '**nas**'],
              ['wy (you pl.)', '**was**', '**wam**', '**wami**', '**was**'],
              ['oni / one (they)', '**ich** / **nich** (Acc non-m. **je**/**nie**)', '**im** / **nim**', '**nimi**', '**nich**'],
            ],
          },
        ],
        notes: [
          'After prepositions, 3rd-person pronouns add initial n-: do **niego**, z **nią**, dla **nich**, na **nie**.',
        ],
      },
      {
        num: '07',
        id: 'irregulars',
        title: 'Essential Irregular Verbs',
        nativeTitle: 'Czasowniki nieregularne',
        summary: 'High-frequency irregular stems appearing constantly in Polish literature and the Bible.',
        tables: [
          {
            caption: 'Key Polish Irregular Paradigms',
            headers: ['Infinitive', 'Present (1sg / 3sg / 3pl)', 'Past (m. / f. / m.pl.)', 'Imperative (sg.)'],
            rows: [
              ['być (to be)', 'jest**em** / jes**t** / s**ą**', 'by**łem** / by**łam** / by**li**', 'bąd**ź**'],
              ['mieć (to have)', 'ma**m** / ma / ma**ją**', 'mia**łem** / mia**łam** / mie**li**', 'mie**j**'],
              ['iść (to go)', 'id**ę** / idz**ie** / id**ą**', 'szed**łem** / sz**łam** / sz**li**', 'id**ź**'],
              ['pójść (to go, perf.)', 'pójd**ę** / pójd**zie** / pójd**ą**', 'poszed**łem** / posz**łam** / posz**li**', 'pójd**ź**'],
              ['móc (to be able)', 'mog**ę** / moż**e** / mog**ą**', 'mog**łem** / mog**łam** / mog**li**', '—'],
              ['wiedzieć (to know)', 'wie**m** / wie / wiedz**ą**', 'wiedzia**łem** / wiedzia**łam** / wiedzie**li**', 'wied**z**'],
              ['jeść (to eat)', 'je**m** / je / jedz**ą**', 'jad**łem** / jad**łam** / jed**li**', 'jed**z**'],
              ['wziąć (to take)', 'wezm**ę** / weźm**ie** / wezm**ą**', 'wzią**łem** / wzię**łam** / wzię**li**', 'we**ź**'],
              ['dać (to give)', 'da**m** / da / dadz**ą**', 'da**łem** / da**łam** / da**li**', 'da**j**'],
              ['brać (to take)', 'bior**ę** / bierz**e** / bior**ą**', 'bra**łem** / bra**łam** / bra**li**', 'bierz**Ø**'],
            ],
          },
        ],
      },
    ],
  },

  de: {
    language: 'de',
    title: 'German Inflection Reference',
    subtitle: 'Deutsch · Verbs, Cases, Articles & Adjective Endings',
    sections: [
      {
        num: '01',
        id: 'present',
        title: 'Present Tense & Modals',
        nativeTitle: 'Präsens',
        summary:
          'Add -e, -st, -t, -en, -t, -en to the verb stem. Strong verbs frequently shift the stem vowel in 2sg (du) and 3sg (er/sie/es).',
        tables: [
          {
            caption: 'Regular, Stem-Changing & Modal Present Forms',
            headers: ['Person', 'Regular (machen)', 'a→ä (fahren)', 'e→i (sprechen)', 'Modal (können)'],
            rows: [
              ['ich (1sg)', 'mach**e**', 'fahr**e**', 'sprech**e**', 'kann**Ø**'],
              ['du (2sg)', 'mach**st**', 'f**ä**hr**st**', 'spr**i**ch**st**', 'kann**st**'],
              ['er/sie/es (3sg)', 'mach**t**', 'f**ä**hr**t**', 'spr**i**ch**t**', 'kann**Ø**'],
              ['wir (1pl)', 'mach**en**', 'fahr**en**', 'sprech**en**', 'könn**en**'],
              ['ihr (2pl)', 'mach**t**', 'fahr**t**', 'sprech**t**', 'könn**t**'],
              ['sie / Sie (3pl/formal)', 'mach**en**', 'fahr**en**', 'sprech**en**', 'könn**en**'],
            ],
          },
        ],
        notes: [
          'Stems ending in -t, -d, -chn, -fn insert -e- before -st/-t: arbeit**est**, arbeit**et**, find**est**, find**et**.',
          'Stems ending in s, ß, x, z drop the s of -st: heiß**t**, sitz**t**, läss**t** (pre-1996: läß**t**).',
          'Pre-1996 German texts write ß after short vowels: muß / mußte, wußte, läßt, ißt.',
        ],
      },
      {
        num: '02',
        id: 'past',
        title: 'Simple Past & Subjunctive II',
        nativeTitle: 'Präteritum · Konjunktiv II',
        summary:
          'Präteritum is the primary narrative past tense in novels and the Bible. Note that 1sg (ich) and 3sg (er/sie/es) are ALWAYS identical in Präteritum and Konjunktiv II.',
        tables: [
          {
            caption: 'Weak (-te), Strong (Ablaut) & Konjunktiv II',
            headers: ['Person', 'Weak (sagen)', 'Strong (sprechen)', 'Mixed (bringen)', 'Konj. II (sein / kommen)'],
            rows: [
              ['ich (1sg)', 'sag**te**', 'sprach**Ø**', 'brach**te**', 'wär**e** / käm**e**'],
              ['du (2sg)', 'sag**test**', 'sprach**st**', 'brach**test**', 'wär**est** / käm**est**'],
              ['er/sie/es (3sg)', 'sag**te**', 'sprach**Ø**', 'brach**te**', 'wär**e** / käm**e**'],
              ['wir (1pl)', 'sag**ten**', 'sprach**en**', 'brach**ten**', 'wär**en** / käm**en**'],
              ['ihr (2pl)', 'sag**tet**', 'sprach**t**', 'brach**tet**', 'wär**et** / käm**et**'],
              ['sie / Sie (3pl)', 'sag**ten**', 'sprach**en**', 'brach**ten**', 'wär**en** / käm**en**'],
            ],
          },
        ],
        notes: [
          'Konjunktiv I (reported speech in literature) attaches -e, -est, -e, -en, -et, -en to the present stem: er **sei**, er **habe**, er **gehe**, er **komme**.',
        ],
      },
      {
        num: '03',
        id: 'participles',
        title: 'Past Participles & Imperative',
        nativeTitle: 'Partizip II · Imperativ',
        summary:
          'Past participles form the Perfect (hat gemacht / ist gegangen) and Passive (wird gemacht). Imperatives distinguish du (sg.), ihr (pl.), and Sie (formal).',
        tables: [
          {
            caption: 'Partizip II Formation',
            headers: ['Verb Type', 'Pattern', 'Examples'],
            rows: [
              ['Weak (regular)', '**ge-** + stem + **-t**', '**ge**mach**t**, **ge**sag**t**, **ge**antwort**et**'],
              ['Strong (irregular)', '**ge-** + ablaut stem + **-en**', '**ge**sproch**en**, **ge**gang**en**, **ge**tan'],
              ['Mixed', '**ge-** + changed stem + **-t**', '**ge**brach**t**, **ge**dach**t**, **ge**wuss**t**'],
              ['Inseparable (be-, er-, ver-, ent-, zer-)', 'NO ge- + stem + **-t / -en**', 'verstand**en**, erzähl**t**, bekomm**en**'],
              ['Separable prefix (auf-, an-, mit-)', 'prefix + **-ge-** + stem + **-t / -en**', 'auf**ge**mach**t**, an**ge**komm**en**'],
              ['Verbs ending in -ieren', 'NO ge- + stem + **-t**', 'studier**t**, passier**t**'],
            ],
          },
          {
            caption: 'Imperative Forms',
            headers: ['Form', 'Regular (kommen)', 'e→i (sprechen)', 'sein (to be)'],
            rows: [
              ['du (sg.)', 'Komm**(e)**!', 'Spr**i**ch!', '**Sei**!'],
              ['ihr (pl.)', 'Komm**t**!', 'Sprech**t**!', '**Seid**!'],
              ['Sie (formal)', 'Komm**en** Sie!', 'Sprech**en** Sie!', '**Seien** Sie!'],
            ],
          },
        ],
      },
      {
        num: '04',
        id: 'articles',
        title: 'Articles & 4 Cases',
        nativeTitle: 'Artikel · Kasus',
        summary:
          'German articles carry gender, number, and case. Memorize the famous RESE / NESE / MRMN / SRSR definite ending pattern.',
        tables: [
          {
            caption: 'Definite (der) & Indefinite (ein / kein) Articles',
            headers: ['Case', 'Masc. (der)', 'Fem. (die)', 'Neut. (das)', 'Plural (die)'],
            rows: [
              ['Nominative (subject)', '**der** / ein', '**die** / ein**e**', '**das** / ein', '**die** / kein**e**'],
              ['Accusative (direct obj.)', '**den** / ein**en**', '**die** / ein**e**', '**das** / ein', '**die** / kein**e**'],
              ['Dative (indirect obj.)', '**dem** / ein**em**', '**der** / ein**er**', '**dem** / ein**em**', '**den** (+n) / kein**en**'],
              ['Genitive (possession)', '**des** (+s) / ein**es**', '**der** / ein**er**', '**des** (+s) / ein**es**', '**der** / kein**er**'],
            ],
          },
        ],
        notes: [
          'Always Accusative: durch, für, gegen, ohne, um. Always Dative: aus, außer, bei, mit, nach, seit, von, zu. Always Genitive: während, wegen, trotz, statt.',
          'Two-way prepositions (an, auf, hinter, in, neben, über, unter, vor, zwischen): Accusative = motion toward (wohin?); Dative = static location (wo?).',
        ],
      },
      {
        num: '05',
        id: 'adjectives',
        title: 'Adjective Declension',
        nativeTitle: 'Adjektivdeklination',
        summary:
          'When the article already shows gender/case strongly (der/die/das), adjectives take weak endings (-e / -en). With no article, adjectives take strong article-like endings.',
        tables: [
          {
            caption: 'Weak Endings (after der / dieser / jeder)',
            headers: ['Case', 'Masc.', 'Fem.', 'Neut.', 'Plural'],
            rows: [
              ['Nom', 'gut**e**', 'gut**e**', 'gut**e**', 'gut**en**'],
              ['Acc', 'gut**en**', 'gut**e**', 'gut**e**', 'gut**en**'],
              ['Dat', 'gut**en**', 'gut**en**', 'gut**en**', 'gut**en**'],
              ['Gen', 'gut**en**', 'gut**en**', 'gut**en**', 'gut**en**'],
            ],
          },
          {
            caption: 'Mixed (after ein / kein / mein) & Strong (no article)',
            headers: ['Case', 'Masc. (ein / Ø)', 'Fem. (eine / Ø)', 'Neut. (ein / Ø)', 'Plural (keine / Ø)'],
            rows: [
              ['Nom', 'gut**er** / gut**er**', 'gut**e** / gut**e**', 'gut**es** / gut**es**', 'gut**en** / gut**e**'],
              ['Acc', 'gut**en** / gut**en**', 'gut**e** / gut**e**', 'gut**es** / gut**es**', 'gut**en** / gut**e**'],
              ['Dat', 'gut**en** / gut**em**', 'gut**en** / gut**er**', 'gut**en** / gut**em**', 'gut**en** / gut**en**'],
              ['Gen', 'gut**en** / gut**en**', 'gut**en** / gut**er**', 'gut**en** / gut**en**', 'gut**en** / gut**er**'],
            ],
          },
        ],
      },
      {
        num: '06',
        id: 'nouns-pronouns',
        title: 'Nouns & Personal Pronouns',
        nativeTitle: 'Nomen · Personalpronomen',
        summary:
          'Masculine & neuter nouns add -(e)s in Genitive singular; all plurals not ending in -n/-s add -n in Dative plural.',
        tables: [
          {
            caption: 'Personal Pronouns',
            headers: ['Nom', 'Acc', 'Dat', 'Possessive stem'],
            rows: [
              ['ich (I)', '**mich**', '**mir**', 'mein-'],
              ['du (you sg.)', '**dich**', '**dir**', 'dein-'],
              ['er / es (he / it)', '**ihn** / **es**', '**ihm**', 'sein-'],
              ['sie (she)', '**sie**', '**ihr**', 'ihr-'],
              ['wir (we)', '**uns**', '**uns**', 'unser-'],
              ['ihr (you pl.)', '**euch**', '**euch**', 'euer-'],
              ['sie / Sie (they / formal)', '**sie** / **Sie**', '**ihnen** / **Ihnen**', 'ihr- / Ihr-'],
            ],
          },
        ],
        notes: [
          'Weak masculine n-nouns (der Mensch, Herr, Fürst, Name, Glaube) add -(e)n in Acc/Dat/Gen sg. and all plural cases.',
          'Older literary German frequently keeps the optional Dative singular -e: dem Weib**e**, am Tag**e**, im Haus**e**, im Land**e**.',
        ],
      },
      {
        num: '07',
        id: 'irregulars',
        title: 'Essential Strong & Irregular Verbs',
        nativeTitle: 'Starke Verben',
        summary: 'Core principal parts (3sg Present · Präteritum · Partizip II · Konjunktiv II).',
        tables: [
          {
            caption: 'High-Frequency German Principal Parts',
            headers: ['Infinitive', '3sg Present', 'Präteritum', 'Partizip II', 'Konj. II'],
            rows: [
              ['sein (to be)', 'is**t**', '**war**', 'gewes**en**', '**wäre**'],
              ['haben (to have)', 'ha**t**', '**hatte**', 'gehab**t**', '**hätte**'],
              ['werden (to become)', 'wir**d**', '**wurde** (arch. ward)', 'geword**en**', '**würde**'],
              ['gehen (to go)', 'geh**t**', '**ging**', 'gegang**en**', '**ginge**'],
              ['kommen (to come)', 'komm**t**', '**kam**', 'gekomm**en**', '**käme**'],
              ['sprechen (to speak)', 'spr**i**ch**t**', '**sprach**', 'gesproch**en**', '**spräche**'],
              ['sehen (to see)', 's**ie**h**t**', '**sah**', 'geseh**en**', '**sähe**'],
              ['geben (to give)', 'g**i**b**t**', '**gab**', 'gegeb**en**', '**gäbe**'],
              ['nehmen (to take)', 'n**imm**t', '**nahm**', 'genomm**en**', '**nähme**'],
              ['wissen (to know)', '**weiß**', '**wusste** (wußte)', 'gewuss**t**', '**wüsste**'],
              ['tun (to do)', 'tu**t**', '**tat**', 'get**an**', '**täte**'],
              ['stehen (to stand)', 'steh**t**', '**stand**', 'gestand**en**', '**stände**'],
            ],
          },
        ],
      },
    ],
  },

  cs: {
    language: 'cs',
    title: 'Czech Inflection Reference',
    subtitle: 'Čeština · Verb Classes, Past & Vykání, Transgressives & 7 Cases',
    sections: [
      {
        num: '01',
        id: 'present',
        title: 'Present & Perfective Future',
        nativeTitle: 'Přítomný čas',
        summary:
          'Czech verbs fall into 5 present conjugation classes. Like Polish, perfective verbs use these present endings to express future tense (udělám = "I will do").',
        tables: [
          {
            caption: 'Five Czech Verb Conjugation Classes',
            headers: ['Person', '-ám (dělat)', '-ím (prosit)', '-uji (kupovat)', '-u/-eš (nést)', '-i/-eš (mazat)'],
            rows: [
              ['já (1sg)', 'děl**ám**', 'pros**ím**', 'kup**uji** (-uju)', 'nes**u**', 'maž**i** (-u)'],
              ['ty (2sg)', 'děl**áš**', 'pros**íš**', 'kup**uješ**', 'nes**eš**', 'maž**eš**'],
              ['on/ona/ono (3sg)', 'děl**á**', 'pros**í**', 'kup**uje**', 'nes**e**', 'maž**e**'],
              ['my (1pl)', 'děl**áme**', 'pros**íme**', 'kup**ujeme**', 'nes**eme**', 'maž**eme**'],
              ['vy (2pl/formal)', 'děl**áte**', 'pros**íte**', 'kup**ujete**', 'nes**ete**', 'maž**ete**'],
              ['oni/ony/ona (3pl)', 'děl**ají**', 'pros**í** (trp**ějí**)', 'kup**ují** (-ujou)', 'nes**ou**', 'maž**í** (-ou)'],
            ],
          },
        ],
        notes: [
          'Negation attaches ne- directly to the front of the verb: **ne**dělám, **ne**mám, **ne**chci (exception: je → **není**).',
        ],
      },
      {
        num: '02',
        id: 'past',
        title: 'Past Tense & Formal Vykání',
        nativeTitle: 'Minulý čas',
        summary:
          'Formed with the gendered l-participle plus the auxiliary být in 1st and 2nd person (no auxiliary in 3rd person). The auxiliary sits in 2nd position in the clause.',
        tables: [
          {
            caption: 'Past Tense (Example: mít — to have)',
            headers: ['Person', 'Masc. / m.pl.', 'Fem. / non-m.pl.', 'Neuter'],
            rows: [
              ['já (1sg)', 'mě**l** jsem (m.)', 'mě**la** jsem (f.)', '—'],
              ['ty (2sg)', 'mě**l** jsi (sg. m.)', 'mě**la** jsi (sg. f.)', '—'],
              ['on / ona / ono (3sg)', 'mě**l**', 'mě**la**', 'mě**lo**'],
              ['my (1pl)', 'mě**li** jsme (m.pl.)', 'mě**ly** jsme (non-m.pl.)', '—'],
              ['vy — plural (2pl)', 'mě**li** jste (pl. m.)', 'mě**ly** jste (pl. non-m.)', '—'],
              ['Vy — formal sg. (vykání)', 'mě**l** jste (formal m.)', 'mě**la** jste (formal f.)', '—'],
              ['oni / ony / ona (3pl)', 'mě**li** (m.anim.)', 'mě**ly** (f. / m.inan.)', 'mě**la** (n.pl.)'],
            ],
          },
        ],
        notes: [
          'Watch formal vykání closely: addressing ONE person politely uses a SINGULAR l-participle with PLURAL auxiliary jste (Vidě**l** jste = formal m., Vidě**la** jste = formal f.).',
          'In 2sg reflexive past, jsi merges with se/si: díval **ses** (= díval jsi se), vzal **sis** (= vzal jsi si).',
        ],
      },
      {
        num: '03',
        id: 'cond-imp',
        title: 'Conditional, Future & Imperative',
        nativeTitle: 'Podmiňovací · Budoucí · Rozkazovací',
        summary:
          'Conditional replaces jsem/jsi/jsme/jste with bych/bys/by/bychom/byste/by (and adds by in 3rd person!).',
        tables: [
          {
            caption: 'Conditional & Imperfective Future Auxiliaries',
            headers: ['Person', 'Conditional aux', 'Example (chtít)', 'Future aux (být)'],
            rows: [
              ['já (1sg)', '**bych**', 'chtěl / chtěla **bych**', 'bud**u**'],
              ['ty (2sg)', '**bys**', 'chtěl / chtěla **bys**', 'bud**eš**'],
              ['on / ona / ono (3sg)', '**by**', 'chtěl / chtěla / chtělo **by**', 'bud**e**'],
              ['my (1pl)', '**bychom**', 'chtěli / chtěly **bychom**', 'bud**eme**'],
              ['vy (2pl / formal)', '**byste**', 'chtěli / chtěl **byste**', 'bud**ete**'],
              ['oni / ony (3pl)', '**by**', 'chtěli / chtěly **by**', 'bud**ou**'],
            ],
          },
          {
            caption: 'Imperative (ty / my / vy)',
            headers: ['Verb', 'ty (sg.)', 'my (let us)', 'vy (pl. / formal)'],
            rows: [
              ['dělat (to do)', 'děle**j**', 'děle**jme**', 'děle**jte**'],
              ['prosit (to ask)', 'pros**Ø**', 'pros**me**', 'pros**te**'],
              ['jít (to go)', 'jd**i**', 'jd**ěme**', 'jd**ěte**'],
              ['být (to be)', 'buď**Ø**', 'buď**me**', 'buď**te**'],
            ],
          },
        ],
      },
      {
        num: '04',
        id: 'participles',
        title: 'Passive Participles & Transgressives',
        nativeTitle: 'Příčestí · Přechodníky',
        summary:
          'Transgressives ("while doing" / "having done") agree in gender and number with the sentence subject and appear frequently in Czech classics and Bible kralická.',
        tables: [
          {
            caption: 'Transgressives (Přechodníky) & Passive Participles',
            headers: ['Form', 'Masc. sg.', 'Fem. / Neut. sg.', 'Plural'],
            rows: [
              ['Present transgr. (hard)', 'nes**a** / js**a**', 'nes**ouc** / js**ouc**', 'nes**ouce** / js**ouce**'],
              ['Present transgr. (soft)', 'zkoušej**e** / vid**ě**', 'zkoušej**íc** / vid**íc**', 'zkoušej**íce** / vid**íce**'],
              ['Past transgr. (vowel stem)', 'uděla**v** / zanecha**v**', 'uděla**vši** / zanecha**vši**', 'uděla**vše** / zanecha**vše**'],
              ['Past transgr. (cons. stem)', 'řek**Ø** / přines**Ø**', 'řek**ši** / přines**ši**', 'řek**še** / přines**še**'],
              ['Passive participle', 'napsá**n** / připrave**n**', 'napsá**na** / **-no**', 'napsá**ni** (m.) / **-ny**'],
            ],
          },
        ],
        notes: [
          'Archaic Czech texts (Bible kralická, 1903 Doyle) also use -ti infinitives (bý**ti**, jís**ti**), **jest** ("is"), and emphatic **-ť** (bude**ť**, jest**ť**).',
        ],
      },
      {
        num: '05',
        id: 'cases',
        title: 'Nouns — 7 Cases',
        nativeTitle: 'Pády podstatných jmen',
        summary:
          'Czech shares the same 7-case system as Polish, distinguishing hard vs. soft stems and animate vs. inanimate masculine nouns.',
        tables: [
          {
            caption: 'Hard Paradigm Endings (pán · hrad · žena · město)',
            headers: ['Case', 'Masc. anim (pán)', 'Masc. inan (hrad)', 'Fem. (žena)', 'Neut. (město)'],
            rows: [
              ['Nom sg / pl', 'pán / pán**i** (-ové)', 'hrad / hrad**y**', 'žen**a** / žen**y**', 'měst**o** / měst**a**'],
              ['Gen sg / pl', 'pán**a** / pán**ů**', 'hrad**u** / hrad**ů**', 'žen**y** / žen**Ø**', 'měst**a** / měst**Ø**'],
              ['Dat sg / pl', 'pán**ovi** (-u) / pán**ům**', 'hrad**u** / hrad**ům**', 'žen**ě** / žen**ám**', 'měst**u** / měst**ům**'],
              ['Acc sg / pl', 'pán**a** / pán**y**', 'hrad / hrad**y**', 'žen**u** / žen**y**', 'měst**o** / měst**a**'],
              ['Voc sg / pl', 'pan**e** / pán**i**', 'hrad**e** / hrad**y**', 'žen**o** / žen**y**', 'měst**o** / měst**a**'],
              ['Loc sg / pl', 'pán**ovi** (-u) / pán**ech**', 'hrad**u** (-ě) / hrad**ech**', 'žen**ě** / žen**ách**', 'měst**ě** (-u) / měst**ech**'],
              ['Inst sg / pl', 'pán**em** / pán**y**', 'hrad**em** / hrad**y**', 'žen**ou** / žen**ami**', 'měst**em** / měst**y**'],
            ],
          },
        ],
      },
      {
        num: '06',
        id: 'adj-pron',
        title: 'Adjectives & Personal Pronouns',
        nativeTitle: 'Přídavná jména · Zájmena',
        summary: 'Hard adjectives end in -ý/-á/-é; soft adjectives end in -í in all three singular nominatives.',
        tables: [
          {
            caption: 'Hard Adjectives (mladý — young)',
            headers: ['Case', 'Masc. sg.', 'Neut. sg.', 'Fem. sg.', 'Plural (m.anim / other)'],
            rows: [
              ['Nom', 'mlad**ý**', 'mlad**é**', 'mlad**á**', 'mlad**í** / mlad**é** (n. **-á**)'],
              ['Gen', 'mlad**ého**', 'mlad**ého**', 'mlad**é**', 'mlad**ých**'],
              ['Dat', 'mlad**ému**', 'mlad**ému**', 'mlad**é**', 'mlad**ým**'],
              ['Acc', '= Gen / Nom', 'mlad**é**', 'mlad**ou**', 'mlad**é** (n. **-á**)'],
              ['Loc', 'mlad**ém**', 'mlad**ém**', 'mlad**é**', 'mlad**ých**'],
              ['Inst', 'mlad**ým**', 'mlad**ým**', 'mlad**ou**', 'mlad**ými**'],
            ],
          },
          {
            caption: 'Personal Pronouns (Nom / Gen-Acc / Dat / Inst)',
            headers: ['Nom', 'Gen / Acc', 'Dat', 'Inst'],
            rows: [
              ['já (I)', '**mě** / **mne**', '**mi** / **mně**', '**mnou**'],
              ['ty (you sg.)', '**tě** / **tebe**', '**ti** / **tobě**', '**tebou**'],
              ['on / ono (he/it)', '**ho** / **jeho** / **něho**', '**mu** / **jemu** / **němu**', '**jím** / **ním**'],
              ['ona (she)', '**jí** / **ní** (Acc **ji**/**ni**)', '**jí** / **ní**', '**jí** / **ní**'],
              ['my (we)', '**nás**', '**nám**', '**námi**'],
              ['vy (you pl./formal)', '**vás**', '**vám**', '**vámi**'],
              ['oni / ony (they)', '**jich**/**nich** (Acc **je**/**ně**)', '**jim** / **nim**', '**jimi** / **nimi**'],
            ],
          },
        ],
      },
      {
        num: '07',
        id: 'irregulars',
        title: 'Essential Irregular Verbs',
        nativeTitle: 'Nepravidelná slovesa',
        summary: 'Core irregular Czech verbs in Present, Past, and Imperative.',
        tables: [
          {
            caption: 'Key Czech Irregular Paradigms',
            headers: ['Infinitive', 'Present (1sg / 3sg / 3pl)', 'Past (m. / f. / m.pl.)', 'Imperative (sg.)'],
            rows: [
              ['být (to be)', 'js**em** / j**e** (jest) / js**ou**', 'by**l** / by**la** / by**li**', 'bu**ď**'],
              ['mít (to have)', 'm**ám** / m**á** / m**ají**', 'mě**l** / mě**la** / mě**li**', 'mě**j**'],
              ['jít (to go)', 'jd**u** / jd**e** / jd**ou**', 'še**l** / š**la** / š**li**', 'jd**i**'],
              ['chtít (to want)', 'chc**i** / chc**e** / cht**ějí**', 'chtě**l** / chtě**la** / chtě**li**', 'chtě**j**'],
              ['moci (to be able)', 'moh**u** / můž**e** / moh**ou**', 'moh**l** / moh**la** / moh**li**', '—'],
              ['vědět (to know)', 'v**ím** / v**í** / věd**í**', 'vědě**l** / vědě**la** / vědě**li**', 'vě**z**'],
              ['říci (to say)', 'řekn**u** / řekn**e** / řekn**ou**', 'řek**l** / řek**la** / řek**li**', 'řekn**i**'],
              ['jíst (to eat)', 'j**ím** / j**í** / jed**í**', 'jed**l** / jed**la** / jed**li**', 'je**z**'],
              ['dát (to give)', 'd**ám** / d**á** / d**ají**', 'da**l** / da**la** / da**li**', 'de**j**'],
            ],
          },
        ],
      },
    ],
  },

  es: {
    language: 'es',
    title: 'Spanish Inflection Reference',
    subtitle: 'Español · Tenses, Moods, Imperatives, Gerunds & Agreement',
    sections: [
      {
        num: '01',
        id: 'present',
        title: 'Present Indicative & Four "You" Forms',
        nativeTitle: 'Presente de indicativo',
        summary:
          'Drop -ar, -er, or -ir and attach the person ending. Remember that formal usted uses 3sg endings and ustedes uses 3pl endings.',
        tables: [
          {
            caption: 'Regular Present Indicative (-ar / -er / -ir)',
            headers: ['Subject', 'Cue', '-ar (hablar)', '-er (comer)', '-ir (vivir)'],
            rows: [
              ['yo (1sg)', '—', 'habl**o**', 'com**o**', 'viv**o**'],
              ['tú (2sg informal)', 'sg.', 'habl**as**', 'com**es**', 'viv**es**'],
              ['él / ella / usted', 'formal (ud.)', 'habl**a**', 'com**e**', 'viv**e**'],
              ['nosotros/as (1pl)', '—', 'habl**amos**', 'com**emos**', 'viv**imos**'],
              ['vosotros/as (2pl inf.)', 'pl.', 'habl**áis**', 'com**éis**', 'viv**ís**'],
              ['ellos / ellas / ustedes', 'formal pl.', 'habl**an**', 'com**en**', 'viv**en**'],
            ],
          },
        ],
        notes: [
          'Stem-changing ("boot") verbs shift inside all forms EXCEPT nosotros/vosotros: e→ie (querer → quiero/quiere), o→ue (poder → puedo/puede), e→i (pedir → pido/pide).',
        ],
      },
      {
        num: '02',
        id: 'past',
        title: 'Preterite vs. Imperfect',
        nativeTitle: 'Pretérito indefinido · Imperfecto',
        summary:
          'Preterite expresses completed past events; Imperfect expresses ongoing states, background descriptions, or habitual actions.',
        tables: [
          {
            caption: 'Regular Preterite & Imperfect Endings',
            headers: ['Subject', 'Pret. -ar (hablar)', 'Pret. -er/-ir (comer)', 'Imperf. -ar', 'Imperf. -er/-ir'],
            rows: [
              ['yo', 'habl**é**', 'com**í**', 'habl**aba**', 'com**ía**'],
              ['tú', 'habl**aste**', 'com**iste**', 'habl**abas**', 'com**ías**'],
              ['él / ella / ud.', 'habl**ó**', 'com**ió**', 'habl**aba**', 'com**ía**'],
              ['nosotros/as', 'habl**amos**', 'com**imos**', 'habl**ábamos**', 'com**íamos**'],
              ['vosotros/as', 'habl**asteis**', 'com**isteis**', 'habl**abais**', 'com**íais**'],
              ['ellos / uds.', 'habl**aron**', 'com**ieron**', 'habl**aban**', 'com**ían**'],
            ],
          },
        ],
        notes: [
          'Irregular preterite stems (tuv-, estuv-, pud-, pus-, sup-, hic-/hiz-, quis-, vin-, dij-, traj-) ALL share the exact same unaccented endings: **-e, -iste, -o, -imos, -isteis, -ieron** (or **-eron** after j: dijeron, trajeron).',
          'Only THREE verbs are irregular in the Imperfect: ser (**era, eras, era, éramos, erais, eran**), ir (**iba, ibas, iba, íbamos, ibais, iban**), ver (**veía, veías…**).',
        ],
      },
      {
        num: '03',
        id: 'future-subj',
        title: 'Future, Conditional & Subjunctive',
        nativeTitle: 'Futuro · Condicional · Subjuntivo',
        summary:
          'Future and Conditional attach directly to the FULL infinitive. Present Subjunctive swaps theme vowels (-ar → e, -er/-ir → a).',
        tables: [
          {
            caption: 'Future, Conditional & Present / Imperfect Subjunctive',
            headers: ['Subject', 'Future (inf.+)', 'Conditional (inf.+)', 'Pres. Subj. (-ar / -er)', 'Imperf. Subj. (3pl pret. stem)'],
            rows: [
              ['yo', '**-é**', '**-ía**', 'habl**e** / com**a**', 'habla**ra** / hablas**e**'],
              ['tú', '**-ás**', '**-ías**', 'habl**es** / com**as**', 'habla**ras** / hablas**es**'],
              ['él / ella / ud.', '**-á**', '**-ía**', 'habl**e** / com**a**', 'habla**ra** / hablas**e**'],
              ['nosotros/as', '**-emos**', '**-íamos**', 'habl**emos** / com**amos**', 'habl**áramos** / habl**ásemos**'],
              ['vosotros/as', '**-éis**', '**-íais**', 'habl**éis** / com**áis**', 'habla**rais** / hablas**eis**'],
              ['ellos / uds.', '**-án**', '**-ían**', 'habl**en** / com**an**', 'habla**ran** / hablas**en**'],
            ],
          },
        ],
        notes: [
          'Irregular Future/Conditional stems: tendr-, vendr-, pondr-, saldr-, podr-, sabr-, habr-, har-, dir-, querr-.',
          'Imperfect Subjunctive has two interchangeable forms (-ra and -se), built by dropping -ron from the 3pl preterite (tuvieron → tuvie**ra** / tuvie**se**).',
          'Classical texts (Reina-Valera 1909, Don Quijote) also use the Future Subjunctive in **-re** (hubie**re**, fue**re**, vinie**re**).',
        ],
      },
      {
        num: '04',
        id: 'imp-ger-part',
        title: 'Imperatives, Gerunds & Participles',
        nativeTitle: 'Imperativo · Gerundio · Participio',
        summary:
          'Negative commands and formal commands ALWAYS use the Present Subjunctive; vosotros affirmative commands simply replace the infinitive -r with -d.',
        tables: [
          {
            caption: 'Imperative Forms',
            headers: ['Addressee', 'Affirmative (-ar / -er / -ir)', 'Negative (no + Subj.)'],
            rows: [
              ['tú (sg.)', 'habl**a** / com**e** / viv**e**', 'no habl**es** / no com**as** / no viv**as**'],
              ['usted (formal)', 'habl**e** / com**a** / viv**a**', 'no habl**e** / no com**a** / no viv**a**'],
              ['vosotros (pl.)', 'habla**d** / come**d** / vivi**d**', 'no habl**éis** / no com**áis** / no viv**áis**'],
              ['ustedes (formal pl.)', 'habl**en** / com**an** / viv**an**', 'no habl**en** / no com**an** / no viv**an**'],
            ],
          },
          {
            caption: 'Gerunds & Past Participles',
            headers: ['Form', '-ar', '-er / -ir', 'Key Irregulars'],
            rows: [
              ['Gerund (GER)', 'habl**ando**', 'com**iendo**, viv**iendo**', 'ley**endo**, y**endo**, dic**iendo**, durm**iendo**, pud**iendo**'],
              ['Participle (P)', 'habl**ado**', 'com**ido**, viv**ido**', 'abier**to**, dich**o**, escri**to**, hech**o**, muer**to**, pues**to**, rot**o**, vis**to**, vuel**to**'],
            ],
          },
        ],
        notes: [
          'The 8 irregular affirmative tú commands: **ven** (venir), **di** (decir), **sal** (salir), **haz** (hacer), **ten** (tener), **ve** (ir), **pon** (poner), **sé** (ser).',
          'Used with haber (he comido), past participles stay invariable (-o); used with ser/estar or as adjectives, they agree in gender & number (estoy cansad**a**, puertas abiert**as**).',
        ],
      },
      {
        num: '05',
        id: 'art-noun-pron',
        title: 'Articles, Agreement & Pronouns',
        nativeTitle: 'Artículos · Concordancia · Pronombres',
        summary: 'Nouns, articles, and adjectives agree in masculine/feminine gender and singular/plural number.',
        tables: [
          {
            caption: 'Articles & Gender/Number Agreement',
            headers: ['Category', 'Masc. sg.', 'Fem. sg.', 'Masc. pl.', 'Fem. pl.'],
            rows: [
              ['Definite article', '**el** (neut. **lo**)', '**la**', '**los**', '**las**'],
              ['Indefinite article', '**un**', '**una**', '**unos**', '**unas**'],
              ['Adjectives (-o/-a)', 'buen**o** (buen)', 'buen**a**', 'buen**os**', 'buen**as**'],
              ['Demonstratives', 'est**e** / es**e** / aqu**el**', 'est**a** / es**a** / aquell**a**', 'est**os** / es**os** / aquell**os**', 'est**as** / es**as** / aquell**as**'],
            ],
          },
          {
            caption: 'Personal & Object Pronouns',
            headers: ['Subject', 'Direct Obj.', 'Indirect Obj.', 'Reflexive', 'After Prep.'],
            rows: [
              ['yo', '**me**', '**me**', '**me**', '**mí** (conmigo)'],
              ['tú', '**te**', '**te**', '**te**', '**ti** (contigo)'],
              ['él / ella / usted', '**lo** / **la**', '**le** (se)', '**se**', 'él / ella / usted'],
              ['nosotros / nosotras', '**nos**', '**nos**', '**nos**', 'nosotros / nosotras'],
              ['vosotros / vosotras', '**os**', '**os**', '**os**', 'vosotros / vosotras'],
              ['ellos / ellas / ustedes', '**los** / **las**', '**les** (se)', '**se**', 'ellos / ellas / ustedes'],
            ],
          },
        ],
        notes: [
          'Two mandatory contractions: a + el = **al**; de + el = **del**.',
          'Nouns/adjectives ending in -z change z → c before -es: luz → lu**ces**, feliz → feli**ces**.',
        ],
      },
      {
        num: '06',
        id: 'irregulars',
        title: 'Essential Irregular Verbs',
        nativeTitle: 'Verbos irregulares',
        summary: 'Core Spanish irregular verbs across Present, Preterite, Present Subjunctive, and Participle.',
        tables: [
          {
            caption: 'Key Spanish Irregular Paradigms',
            headers: ['Infinitive', 'Present (1sg / 3sg)', 'Preterite (1sg / 3sg / 3pl)', 'Pres. Subj.', 'Participle'],
            rows: [
              ['ser (to be)', 'so**y** / **es**', '**fui** / **fue** / **fueron**', 'se**a**', 'sid**o**'],
              ['estar (to be)', 'esto**y** / est**á**', 'estuv**e** / estuv**o** / estuv**ieron**', 'est**é**', 'estad**o**'],
              ['haber (aux.)', '**he** / **ha** (hay)', 'hub**e** / hub**o** / hub**ieron**', 'hay**a**', 'habid**o**'],
              ['ir (to go)', 'vo**y** / v**a**', '**fui** / **fue** / **fueron**', 'vay**a**', 'id**o**'],
              ['tener (to have)', 'teng**o** / tien**e**', 'tuv**e** / tuv**o** / tuv**ieron**', 'teng**a**', 'tenid**o**'],
              ['hacer (to do)', 'hag**o** / hac**e**', 'hic**e** / hiz**o** / hic**ieron**', 'hag**a**', 'hech**o**'],
              ['decir (to say)', 'dig**o** / dic**e**', 'dij**e** / dij**o** / dij**eron**', 'dig**a**', 'dich**o**'],
              ['poder (can)', 'pued**o** / pued**e**', 'pud**e** / pud**o** / pud**ieron**', 'pued**a**', 'podid**o**'],
              ['querer (to want)', 'quier**o** / quier**e**', 'quis**e** / quis**o** / quis**ieron**', 'quier**a**', 'querid**o**'],
              ['saber (to know)', '**sé** / sab**e**', 'sup**e** / sup**o** / sup**ieron**', 'sep**a**', 'sabid**o**'],
              ['venir (to come)', 'veng**o** / vien**e**', 'vin**e** / vin**o** / vin**ieron**', 'veng**a**', 'venid**o**'],
              ['ver (to see)', 've**o** / v**e**', 'v**i** / vi**o** / vi**eron**', 've**a**', 'vist**o**'],
              ['dar (to give)', 'do**y** / d**a**', 'd**i** / di**o** / di**eron**', 'd**é**', 'dad**o**'],
            ],
          },
        ],
      },
    ],
  },
};
