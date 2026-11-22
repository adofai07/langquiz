import type { LanguageCode } from '../types/quiz';

export type GrammarCategory = 'verbs' | 'nouns' | 'adj-pron' | 'rules';

export const GRAMMAR_CATEGORIES: { id: 'all' | GrammarCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verbs', label: 'Verbs' },
  { id: 'nouns', label: 'Nouns & Cases' },
  { id: 'adj-pron', label: 'Adjectives & Pronouns' },
  { id: 'rules', label: 'Rules & Patterns' },
];

export interface GrammarTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface GrammarSection {
  num: string;
  id: string;
  category: GrammarCategory;
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
    subtitle: 'Polski · Verbs, 7 Cases, Gender, Pronouns & Sound Alternations',
    sections: [
      {
        num: '01',
        id: 'present',
        category: 'verbs',
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
          {
            caption: 'How to Recognize Each Class from the Infinitive',
            headers: ['Class', 'Infinitive Signals', 'Examples'],
            rows: [
              ['**-am / -asz**', 'Default for most **-ać** verbs & derived impf. **-ać / -iać**; plus **mieć**, **dać** (3pl dadzą)', 'czyt**ać**, pyt**ać**, zn**ać**, słuch**ać**, odpowiad**ać**, otwier**ać**, mi**eć** (mam)'],
              ['**-em / -esz**', 'Small closed set of **-eć** verbs + **jeść** (3pl jedzą)', 'umi**eć**, rozumi**eć**, wiedzi**eć** (3pl wiedzą), śmi**eć**, je**ść**'],
              ['**-ę / -esz**', '**-ować/-ywać/-iwać** (→ **-uj-**), most **-awać** (→ **-aj-**), **-nąć/-ąć/-ść/-źć/-c**, root **-ać** w/ softening, monosyllabic **-ić/-yć**', 'prac**ować** (pracuję), daw**ać** (daję), wzi**ąć** (wezmę), pis**ać** (piszę), br**ać** (biorę), p**ić** (piję), ż**yć** (żyję)'],
              ['**-ę / -isz / -ysz**', 'Most **-ić** & **-yć** verbs; perception/state **-eć**; 3 short **-ać** verbs (**spać, stać, bać się**)', 'mów**ić**, rob**ić**, ucz**yć**, widzi**eć** (widzę/widzisz), słysz**eć**, myśl**eć**, sp**ać** (śpię/śpisz)'],
            ],
          },
        ],
        notes: [
          'Verbs in -ować / -ywać / -iwać replace that suffix with -uj- before -ę/-esz: pracować → prac**uję**, prac**ujesz**, prac**ują**.',
          'Stem consonant softening is regular in -ę/-esz verbs: k→cz (płakać → płaczę), g→ż (móc → możesz), t→c, d→dz, r→rz, s→sz.',
          'In **-ić / -eć** verbs (-ę/-isz), dental stems soften in **1sg & 3pl** (while 2sg/3sg/1pl/2pl keep the soft i-stem): **si→sz** (prosić → pro**sz**ę/pro**sz**ą, musieć → mu**sz**ę), **zi→ż** (wozić → wo**ż**ę), **ci→c** (płacić → pła**c**ę), **dzi→dz** (widzieć → wi**dz**ę, chodzić → cho**dz**ę), **ści→szcz** (puścić → pu**szcz**ę).',
        ],
      },
      {
        num: '02',
        id: 'past',
        category: 'verbs',
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
              ['ty (2sg)', 'chcia**łeś** (m.sg.)', 'chcia**łaś** (f.sg.)', 'chcia**łoś** (n.sg.)'],
              ['on / ona / ono (3sg)', 'chcia**ł**', 'chcia**ła**', 'chcia**ło**'],
              ['my (1pl)', 'chcie**liśmy** (m.pl.)', 'chcia**łyśmy** (non-m.pl.)', '—'],
              ['wy (2pl)', 'chcie**liście** (m.pl.)', 'chcia**łyście** (non-m.pl.)', '—'],
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
        category: 'verbs',
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
        category: 'verbs',
        title: 'Passive Voice, Impersonal -no/-to & Participles',
        nativeTitle: 'Strona bierna · Forma bezosobowa · Imiesłowy',
        summary:
          'Polish expresses English passive ("was written / was done") in three ways: zostać + passive participle (completed event), być + passive participle (state / ongoing), or the invariable impersonal past in -no / -to (włączono, napisano, otwarto).',
        tables: [
          {
            caption: 'Passive & Impersonal Constructions',
            headers: ['Construction', 'When Used', 'Examples'],
            rows: [
              ['**zostać** + passive part. (perf.)', 'Completed passive action ("was / will be done")', 'Dom **został zbudowany**. List **zostanie napisany**.'],
              ['**być** + passive part. (impf. / state)', 'Ongoing passive action or resulting state ("is / was …")', 'Drzwi **są zamknięte**. Lud **był zepsuty**. Dom **był budowany**.'],
              ['Impersonal past **-no / -to**', 'Action by unspecified agent — translates as English passive ("was recorded / done"), **invariable** (no gender/number!)', 'Nie **włączono** tej liczby ("was not recorded"). **Napisano** list. **Otwarto** bramę.'],
              ['Reflexive **się** + 3sg / 3pl', 'General / habitual passive ("is spoken / is done")', 'Tu **mówi się** po polsku. Drzwi **otwierają się**.'],
            ],
          },
          {
            caption: 'Forming Passive Participles (-ny / -ony / -ty) & Impersonal (-no / -to)',
            headers: ['Infinitive Pattern', 'Passive Participle (m. / f. / n. / m.pl. / non-m.pl.)', 'Impersonal Past', 'Examples'],
            rows: [
              ['Most **-ać** & **-ować**', '**-any / -ana / -ane / -ani / -ane**', '**-ano**', 'napisać → napis**any** / napis**ano** · zbudować → zbudow**any** / zbudow**ano**'],
              ['Most **-ić / -yć** & **-eć**', '**-ony / -ona / -one / -eni / -one** (often softens stem)', '**-ono**', 'włączyć → włącz**ony** / włącz**ono** · postawić → postawi**ony** · zrobić → zrobi**ony** / zrobi**ono**'],
              ['**-ąć / -nąć / -uć**, short **-ić/-yć**, **-r-** stems', '**-ty / -ta / -te / -ci / -te**', '**-to**', 'wziąć → wzię**ty** / wzię**to** · zamknąć → zamknię**ty** · zepsuć → zepsu**ty** · otworzyć → otwar**ty** / otwar**to** · zabić → zabi**ty** / zabi**to**'],
            ],
          },
          {
            caption: 'All Four Polish Participle Types',
            headers: ['Type', 'Formation', 'Examples', 'Meaning'],
            rows: [
              ['Active adjectival (impf.)', '3pl pres. + -cy / -ca / -ce', 'mówią**cy**, widzą**ca**, idą**ce**', 'speaking, seeing, going'],
              ['Passive adjectival', 'past stem + -ny / -ony / -ty (declines like adj.)', 'napisa**ny**, zrobio**na**, otwar**te**', 'written, done, opened'],
              ['Contemporary adverbial (impf.)', '3pl pres. + -c (indeclinable)', 'mówi**ąc**, id**ąc**, patrz**ąc**', 'while speaking / going'],
              ['Anterior adverbial (perf.)', 'past stem + -wszy / -łszy (indeclinable)', 'zrobi**wszy**, wyszed**łszy**, rzek**łszy**', 'having done / gone out'],
            ],
          },
        ],
        notes: [
          'The passive agent is introduced by **przez** + Accusative: napisany **przez** autora ("written by the author").',
          'In **-ić** passive participles, stem consonants often soften: t→c (zapłacić → zapła**c**ony), d→dz (zbudzić → zbudz**o**ny), st→szcz (opuścić → opu**szcz**ony), s→sz (zaprosić → zapro**sz**ony), z→ż (wozić → wo**ż**ony).',
          'Unlike passive participles (which agree with a Nominative subject), impersonal **-no / -to** verbs have NO subject and keep the direct object in Accusative (or Genitive when negated: nie włączono **tej liczby**).',
        ],
      },
      {
        num: '05',
        id: 'irregulars',
        category: 'verbs',
        title: 'Essential Irregular Verbs',
        nativeTitle: 'Czasowniki nieregularne',
        summary: 'High-frequency irregular verb stems appearing constantly in Polish literature and the Bible.',
        tables: [
          {
            caption: 'Key Polish Irregular Paradigms',
            headers: ['Infinitive', 'Present (1sg / 3sg / 3pl)', 'Past (m. / f. / m.pl.)', 'Imperative (sg.)'],
            rows: [
              ['być (to be)', 'jest**em** / jes**t** / s**ą**', 'by**łem** / by**łam** / by**li**', 'bąd**ź**'],
              ['mieć (to have)', 'ma**m** / ma / ma**ją**', 'mia**łem** / mia**łam** / mie**li**', 'mie**j**'],
              ['powiedzieć (to say, perf.)', 'powie**m** / powi**e** / powiedz**ą**', 'powiedzia**łem** / -dzia**łam** / -dzie**li**', 'powied**z**'],
              ['wiedzieć (to know)', 'wie**m** / wie / wiedz**ą**', 'wiedzia**łem** / wiedzia**łam** / wiedzie**li**', 'wied**z**'],
              ['chcieć (to want)', 'chc**ę** / chc**e** / chc**ą**', 'chcia**łem** / chcia**łam** / chcie**li**', 'chcie**j**'],
              ['musieć (must)', 'musz**ę** / mus**i** / musz**ą**', 'musia**łem** / musia**łam** / musie**li**', '—'],
              ['iść (to go)', 'id**ę** / idz**ie** / id**ą**', 'szed**łem** / sz**łam** / sz**li**', 'id**ź**'],
              ['pójść / przyjść / wejść', 'pójd**ę** / przyjd**ę** / wejd**ę**', 'poszed**ł**·posz**ła** / przyszed**ł** / wszed**ł**·wesz**ła**', 'pójd**ź** / przyjd**ź** / wejd**ź**'],
              ['móc (to be able)', 'mog**ę** / moż**e** / mog**ą**', 'móg**ł**·mog**łem** / mog**łam** / mog**li**', '—'],
              ['zostać / stać się / wstać', 'zostan**ę** / stan**ę** / wstan**ę**', 'zosta**łem** / sta**ło** się / wsta**łem**', 'zosta**ń** / sta**ń** / wsta**ń**'],
              ['zacząć (to begin)', 'zaczn**ę** / zaczni**e** / zaczn**ą**', 'zaczą**łem** / zaczę**łam** / zaczę**li**', 'zaczn**ij**'],
              ['wziąć (to take)', 'wezm**ę** / weźm**ie** / wezm**ą**', 'wzią**łem** / wzię**łam** / wzię**li**', 'we**ź**'],
              ['umrzeć (to die)', 'umr**ę** / umrz**e** / umr**ą**', '**umarł**·umar**łem** / umar**ła** / umar**li**', 'umrz**yj**'],
              ['jeść (to eat)', 'je**m** / je / jedz**ą**', 'jad**łem** / jad**łam** / jed**li**', 'jed**z**'],
              ['dać (to give)', 'da**m** / da / dadz**ą**', 'da**łem** / da**łam** / da**li**', 'da**j**'],
              ['brać (to take)', 'bior**ę** / bierz**e** / bior**ą**', 'bra**łem** / bra**łam** / bra**li**', 'bierz**Ø**'],
              ['zabić / pić / żyć', 'zabij**ę** / pij**ę** / żyj**ę**', 'zabi**ł** / pi**ł** / ży**ł**', 'zab**ij** / p**ij** / ży**j**'],
            ],
          },
        ],
      },
      {
        num: '06',
        id: 'cases',
        category: 'nouns',
        title: 'Noun Gender & 7 Cases',
        nativeTitle: 'Rodzaje i przypadki rzeczowników',
        summary:
          'Noun gender is usually readable from the Nominative singular ending. Masculine animate singular Accusative = Genitive (-a); inanimate Accusative = Nominative.',
        tables: [
          {
            caption: 'Identifying Noun Gender',
            headers: ['Gender', 'Typical Endings', 'Examples', 'Key Exceptions'],
            rows: [
              ['Masculine (m.)', 'Consonant', 'dom, brat, dzień, wąż', '-a male humans: mężczyzn**a**, poet**a**, sędzi**a** (decline like fem. in sg., masc. in pl.)'],
              ['Feminine (f.)', '**-a**, **-i**', 'kobiet**a**, gwiazd**a**, pan**i**', 'Soft/abstract consonants: noc, rzecz, kość, miłość, krew, myśl'],
              ['Neuter (n.)', '**-o**, **-e**, **-ę**, **-um**', 'miejsc**e**, słow**o**, imi**ę**, muze**um**', '-ę nouns extend stem: imię → imi**enia**, zwierzę → zwierz**ęcia**; -um invariable in sg., pl. muze**a**'],
            ],
          },
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
          'Negated direct objects switch from Accusative to Genitive: widzę dom (Acc) → nie widzę dom**u** (Gen); znam kobietę → nie znam kobiet**y**.',
          'Masc. inanimate Genitive: concrete countable objects & body parts usually take **-a** (fotel**a**, nos**a**, klucz**a**); substances, abstracts & loanwords usually take **-u** (czas**u**, ląd**u**, dom**u**, wiatr**u**).',
        ],
      },
      {
        num: '07',
        id: 'prepositions',
        category: 'nouns',
        title: 'Preposition → Case Map',
        nativeTitle: 'Przyimki i przypadki',
        summary:
          'Polish prepositions strictly govern specific cases. Several spatial prepositions take Accusative for motion toward and Locative or Instrumental for static position.',
        tables: [
          {
            caption: 'Prepositions by Governed Case',
            headers: ['Case', 'Core Prepositions', 'Examples'],
            rows: [
              ['Genitive (Dopełniacz)', 'do, od, z ("from"), bez, dla, u, koło, obok, spod, znad, sprzed, podczas, według', 'do dom**u**, bez wod**y**, od brat**a**, z ląd**u**'],
              ['Dative (Celownik)', 'ku, dzięki, przeciw / przeciwko, wbrew', 'ku morz**u**, dzięki tob**ie**, przeciwko wrog**owi**'],
              ['Accusative (Biernik)', 'przez, po ("to fetch"), na/w (motion), nad/pod/przed/za/między (motion)', 'przez morz**e**, na ląd**Ø**, pod wod**ę**'],
              ['Instrumental (Narzędnik)', 'z ("with"), nad, pod, przed, za, między (static location)', 'z pan**em**, pod wod**ą**, przed dom**em**, między ludź**mi**'],
              ['Locative (Miejscownik)', 'w, na, o, po ("after/along"), przy', 'w dom**u**, na morz**u**, o rzecz**y**, po śniadani**u**, przy okni**e**'],
            ],
          },
        ],
        notes: [
          'Single-consonant prepositions add -e before tricky consonant clusters: **we** mnie, **we** wtorek, **ze** sobą, **ze** strachu, **beze** mnie, **nade** mną.',
        ],
      },
      {
        num: '08',
        id: 'adjectives',
        category: 'adj-pron',
        title: 'Adjectives, Comparatives & Adverbs',
        nativeTitle: 'Przymiotniki · Stopniowanie · Przysłówki',
        summary:
          'Adjectives agree in gender, number, and case with their noun. After k/g, y shifts to i (wielki, drogi).',
        tables: [
          {
            caption: 'Adjective Declension (nowy — new)',
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
            caption: 'Comparatives, Superlatives & Adverbs',
            headers: ['Positive', 'Comparative (-szy / -ejszy)', 'Superlative (naj-)', 'Adverb (-o / -e)'],
            rows: [
              ['nowy (new)', 'now**szy**', '**naj**now**szy**', 'now**o**'],
              ['silny (strong)', 'silni**ejszy**', '**naj**silni**ejszy**', 'silni**e**'],
              ['dobry (good)', '**lepszy**', '**najlepszy**', '**dobrze** (lepiej)'],
              ['zły (bad)', '**gorszy**', '**najgorszy**', '**źle** (gorzej)'],
              ['duży / wielki (big)', '**większy**', '**największy**', '**dużo** (więcej)'],
              ['mały (small)', '**mniejszy**', '**najmniejszy**', '**mało** (mniej)'],
            ],
          },
        ],
        notes: [
          'Masculine-personal plural Nom softens stem consonants: dobr**y** → dob**rzy**, wiel**ki** → wiel**cy**, dro**gi** → dro**dzy**, młod**y** → mło**dzi**, bogat**y** → boga**ci**, cał**y** → ca**li**.',
        ],
      },
      {
        num: '09',
        id: 'pronouns',
        category: 'adj-pron',
        title: 'Personal, Reflexive, Possessive & Demonstrative Pronouns',
        nativeTitle: 'Zaimki',
        summary:
          'Short clitic pronouns (mi, ci, go, mu) appear mid-sentence; stressed forms (mnie, tobie, jego, jemu) appear at sentence start or after prepositions.',
        tables: [
          {
            caption: 'Personal & Reflexive Pronouns',
            headers: ['Nom', 'Gen / Acc', 'Dat', 'Inst', 'Loc'],
            rows: [
              ['ja (I)', '**mnie** / **mię**', '**mi** / **mnie**', '**mną**', '**mnie**'],
              ['ty (you sg.)', '**cię** / **ciebie**', '**ci** / **tobie**', '**tobą**', '**tobie**'],
              ['on / ono (he/it)', '**go** / **jego** / **niego**', '**mu** / **jemu** / **niemu**', '**nim**', '**nim**'],
              ['ona (she)', '**jej** / **niej** (Acc **ją**/**nią**)', '**jej** / **niej**', '**nią**', '**niej**'],
              ['my (we)', '**nas**', '**nam**', '**nami**', '**nas**'],
              ['wy (you pl.)', '**was**', '**wam**', '**wami**', '**was**'],
              ['oni / one (they)', '**ich** / **nich** (Acc non-m. **je**/**nie**)', '**im** / **nim**', '**nimi**', '**nich**'],
              ['(reflexive self)', '**się** / **siebie**', '**sobie**', '**sobą**', '**sobie**'],
            ],
          },
          {
            caption: 'Demonstratives (ten) & Possessives (mój / swój)',
            headers: ['Case', 'm. / n. sg. (ten / mój)', 'f. sg. (ta / moja)', 'pl. (ci/te / moi/moje)'],
            rows: [
              ['Nom', 'ten / to · mój / moj**e**', 't**a** · moj**a**', 'c**i** / t**e** · mo**i** / moj**e**'],
              ['Gen', 't**ego** · moj**ego** (mego)', 't**ej** · moj**ej** (mej)', 't**ych** · mo**ich** (mych)'],
              ['Dat', 't**emu** · moj**emu** (memu)', 't**ej** · moj**ej** (mej)', 't**ym** · mo**im** (mym)'],
              ['Acc', '= Gen/Nom · to / moj**e**', 't**ę** (tą) · moj**ą** (mą)', '= Gen (m.p.) / Nom'],
              ['Inst / Loc', 't**ym** · mo**im** (mym)', 't**ą** (I) / t**ej** (L) · moj**ą** / moj**ej**', 't**ymi** (I) / t**ych** (L) · mo**imi** / mo**ich**'],
            ],
          },
          {
            caption: 'Interrogatives (kto / co) & Key Quantifiers (wszystek / który / każdy / sam / żaden)',
            headers: ['Case', 'kto (who)', 'co (what)', 'wszystek (all / everything)', 'który / jaki / każdy / sam / żaden'],
            rows: [
              ['Nom', '**kto**', '**co**', 'wszystk**o** (n.) · wszysc**y** (m.pl.) / wszystk**ie**', 'Decline like regular adjectives (-y/-a/-e; m.pl. któr**zy**, ja**cy**, sa**mi**, żad**ni**)'],
              ['Gen', '**kogo**', '**czego**', 'wszystk**iego** (sg.) / wszystk**ich** (pl.)', 'któr**ego** / któr**ej** / któr**ych**'],
              ['Dat', '**komu**', '**czemu**', 'wszystk**iemu** (sg.) / wszystk**im** (pl.)', 'któr**emu** / któr**ej** / któr**ym**'],
              ['Acc', '**kogo**', '**co**', 'wszystk**o** · wszystk**ich** (m.pl.) / wszystk**ie**', '= Gen/Nom · któr**ą** (f.sg.)'],
              ['Inst', '**kim**', '**czym**', 'wszystk**im** (sg.) / wszystk**imi** (pl.)', 'któr**ym** / któr**ą** / któr**ymi**'],
              ['Loc', '**kim**', '**czym**', 'wszystk**im** (sg.) / wszystk**ich** (pl.)', 'któr**ym** / któr**ej** / któr**ych**'],
            ],
          },
        ],
        notes: [
          'Use reflexive **swój / swoja / swoje** ("one\'s own") whenever the possessor is the subject of the sentence, for ANY person: wziąłem **swój** kapelusz ("I took my hat").',
          'Short contracted forms of **mój / twój / swój** are very common in literature and the Bible: moj**ego** → **mego**, twoj**ego** → **twego**, swoj**ego** → **swego** (also **mej/twej/swej**, **mym/twym/swym**, **mych/twych/swych**).',
          'After prepositions, 3rd-person pronouns add initial n-: do **niego**, z **nią**, dla **nich**, na **nie**.',
        ],
      },
      {
        num: '10',
        id: 'alternations',
        category: 'rules',
        title: 'Sound & Spelling Alternations',
        nativeTitle: 'Oboczności głoskowe',
        summary:
          'Many "surprising" Polish noun and verb stems follow predictable vowel and consonant alternations when an ending is added or dropped.',
        tables: [
          {
            caption: 'Common Vowel & Consonant Shifts',
            headers: ['Alternation', 'Trigger', 'Examples'],
            rows: [
              ['**ó ↔ o**', 'Closed vs. open syllable', 'st**ó**ł → st**o**łu · pok**ó**j → pok**o**ju · B**ó**g → B**o**ga · r**ó**b → r**o**bić'],
              ['**ą ↔ ę**', 'Closed vs. open syllable', 'w**ą**ż → w**ę**ża · m**ą**ż → m**ę**ża · d**ą**b → d**ę**bu · ręk**a** → r**ą**k (Gen pl)'],
              ['Fleeting **e** (e ↔ Ø)', 'Disappears when vowel ending added', 'pi**e**s → psa · dzi**e**ń → dnia · s**e**n → snu · ojc**ie**c → ojca · okn**o** → oki**e**n'],
              ['**k→c, g→dz, ch→sz**', 'Before -e (Dat/Loc fem. sg.)', 'rę**k**a → rę**c**e · dro**g**a → dro**dz**e · mu**ch**a → mu**sz**e'],
              ['**t→ci, d→dzi, r→rz, ł→l**', 'Before -e (Loc sg.)', 'świa**t** → świe**ci**e · wo**d**a → wo**dzi**e · góra → gó**rz**e · stó**ł** → sto**l**e'],
            ],
          },
        ],
      },
      {
        num: '11',
        id: 'numbers',
        category: 'rules',
        title: 'Numbers & Case Agreement',
        nativeTitle: 'Liczebniki',
        summary:
          'Polish numbers above 4 trigger Genitive plural on the following noun and take a 3rd-person singular neuter verb!',
        tables: [
          {
            caption: 'Quantity Agreement Rules',
            headers: ['Number', 'Noun Case', 'Verb Agreement', 'Examples'],
            rows: [
              ['1 (jeden / jedna / jedno)', 'Nom sg.', '3sg (agrees)', 'jeden dzień, jedna noc, jedno słowo'],
              ['2, 3, 4 (and 22–24, 32–34…)', 'Nom pl.', '3pl (agrees)', 'dw**a** dni (m./n.), dwi**e** noce (f.), trzy statki'],
              ['5–21 (and 25–31…)', 'Gen pl.', '3sg **neuter**!', 'pięć dni, dziesięć mil, sto osób **było**'],
              ['m.pl. groups (2–4 men)', 'Gen pl. (or Nom pl.)', '3sg neuter (or 3pl)', 'dw**óch** ludzi przyszło / dw**aj** ludzie przyszli'],
            ],
          },
        ],
      },
    ],
  },

  de: {
    language: 'de',
    title: 'German Inflection Reference',
    subtitle: 'Deutsch · Verbs, 4 Cases, Gender, Adjectives, Pronouns & Word Order',
    sections: [
      {
        num: '01',
        id: 'present',
        category: 'verbs',
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
          {
            caption: 'How to Recognize Verb Patterns from the Infinitive',
            headers: ['Pattern', 'Infinitive Signals', 'Examples'],
            rows: [
              ['Weak (regular **-te / ge-…-t**)', 'Default for most verbs, ALL **-ieren** verbs, **-eln / -ern** verbs', 'mach**en**, sag**en**, frag**en**, stud**ieren**, hand**eln**, wand**ern**'],
              ['Strong (**a→ä**, **e→i/ie**)', 'Core Germanic root verbs — stem **a/au** shifts to **ä/äu**, stem **e** shifts to **i/ie** in du/er', 'f**a**hren (fährt), l**au**fen (läuft), spr**e**chen (spricht), s**e**hen (sieht), g**e**ben (gibt)'],
              ['Buffer **-e-** (**-est / -et**)', 'Stem ends in **-t, -d, -chn, -fn, -tm**', 'arbei**t**en (arbeitest), fin**d**en (findet), öff**n**en (öffnet)'],
              ['Sibilant **-t** (drop s in du)', 'Stem ends in **-s, -ß, -x, -z**', 'hei**ß**en (du heißt), sit**z**en (du sitzt), le**s**en (du liest), la**ss**en (du lässt)'],
              ['Modals & **wissen**', 'Closed set of 7 verbs — vowel change in sg., **zero** ending in ich/er', '**können, müssen, wollen, sollen, dürfen, mögen, wissen** (ich/er kann, weiß)'],
              ['Separable vs. Inseparable', 'Insep: **be-, emp-, ent-, er-, ge-, miss-, ver-, zer-** (no ge-); Sep: **ab-, an-, auf-, aus-, ein-, mit-, vor-, zu-**', '**ver**stehen (verstanden) vs. **auf**machen (macht auf / aufgemacht)'],
            ],
          },
          {
            caption: 'Modal Verbs & wissen (Present · Präteritum · Konjunktiv II)',
            headers: ['Infinitive', 'Present (ich / du / er / wir)', 'Präteritum (no umlaut!)', 'Konjunktiv II (umlaut returns)'],
            rows: [
              ['können (can)', '**kann** / kann**st** / **kann** / können', '**konnte**', '**könnte**'],
              ['müssen (must)', '**muss** / muss**t** / **muss** / müssen', '**musste** (mußte)', '**müsste** (müßte)'],
              ['wollen (want)', '**will** / will**st** / **will** / wollen', '**wollte**', '**wollte**'],
              ['sollen (should)', '**soll** / soll**st** / **soll** / sollen', '**sollte**', '**sollte**'],
              ['dürfen (may)', '**darf** / darf**st** / **darf** / dürfen', '**durfte**', '**dürfte**'],
              ['mögen (like)', '**mag** / mag**st** / **mag** / mögen', '**mochte**', '**möchte** ("would like")'],
              ['wissen (know)', '**weiß** / weiß**t** / **weiß** / wissen', '**wusste** (wußte)', '**wüsste** (wüßte)'],
            ],
          },
        ],
        notes: [
          'Stems ending in -t, -d, -chn, -fn insert -e- before -st/-t: arbeit**est**, arbeit**et**, find**est**, find**et**.',
          'Stems ending in s, ß, x, z drop the s of -st: heiß**t**, sitz**t**, läss**t** (pre-1996: läß**t**).',
        ],
      },
      {
        num: '02',
        id: 'past',
        category: 'verbs',
        title: 'Simple Past & Subjunctive (Konjunktiv I & II)',
        nativeTitle: 'Präteritum · Konjunktiv I & II',
        summary:
          'Präteritum is the primary narrative past tense in novels and the Bible; Konjunktiv I marks reported speech ("he said that he was…"), and Konjunktiv II expresses hypotheticals ("would / were"). In ALL three, 1sg (ich) and 3sg (er/sie/es) are identical.',
        tables: [
          {
            caption: 'Weak (-te), Strong (Ablaut), Mixed & Konjunktiv II',
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
          {
            caption: 'Konjunktiv I (Reported / Indirect Speech — Frequent in Literature)',
            headers: ['Person', 'Regular (stem + -e/-est/-e/-en/-et/-en)', 'sein (irregular)', 'Modals (infinitive stem + -e)'],
            rows: [
              ['ich / er / sie / es', 'hab**e**, geh**e**, komm**e**, wiss**e**', '**sei**', 'könn**e**, müss**e**, woll**e**, soll**e**, mög**e**'],
              ['du', 'hab**est**, geh**est**', '**sei(e)st**', 'könn**est**, woll**est**'],
              ['wir / sie / Sie', 'hab**en**, geh**en** (often replaced by Konj. II)', '**seien**', 'könn**en**, woll**en**'],
              ['ihr', 'hab**et**, geh**et**', '**seiet**', 'könn**et**, woll**et**'],
            ],
          },
        ],
      },
      {
        num: '03',
        id: 'participles',
        category: 'verbs',
        title: 'Passive Voice, Partizip II & Imperative',
        nativeTitle: 'Passiv · Partizip II · Imperativ',
        summary:
          'German forms the Process Passive with werden + Partizip II ("is being / was done") and the State Passive with sein + Partizip II ("is done / is open").',
        tables: [
          {
            caption: 'Process Passive (werden) vs. State Passive (sein)',
            headers: ['Tense', 'Process Passive (Vorgangspassiv)', 'State Passive (Zustandspassiv)'],
            rows: [
              ['Present', 'Das Tor **wird** geöffn**et** ("is being opened")', 'Das Tor **ist** geöffn**et** ("is open")'],
              ['Präteritum (Past)', 'Das Tor **wurde** geöffn**et** ("was opened")', 'Das Tor **war** geöffn**et** ("was open")'],
              ['Perfect', 'Das Tor **ist** geöffn**et worden** (NOT geworden!)', 'Das Tor **ist** geöffn**et gewesen**'],
              ['Future / Modal', '**wird** geöffn**et werden** · **muss** geöffn**et werden**', '**wird** geöffn**et sein**'],
              ['Konjunktiv II', '**würde** geöffn**et** ("would be opened")', '**wäre** geöffn**et** ("would be open")'],
            ],
          },
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
        notes: [
          'Passive agent: use **von** + Dative for a person/force (**vom** König erbaut) and **durch** + Accusative for a means/instrument (**durch** Feuer zerstört).',
          'Present Participle (**Partizip I**) adds **-d** to the infinitive (sprechend, lächelnd, setzend — "speaking / smiling") and takes adjective endings before a noun (das schlafend**e** Kind).',
          'German also frequently avoids passive using impersonal **man** + 3sg active: **Man** sagt ("it is said").',
        ],
      },
      {
        num: '04',
        id: 'irregulars',
        category: 'verbs',
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
              ['stehen (to stand)', 'steh**t**', '**stand**', 'gestand**en**', '**stände** / stünde'],
              ['lassen (to let / leave)', 'l**ä**ss**t**', '**ließ**', 'gelass**en**', '**ließe**'],
              ['bleiben (to stay)', 'bleib**t**', '**blieb**', 'geblieb**en**', '**bliebe**'],
              ['scheinen (to seem / shine)', 'schein**t**', '**schien**', 'geschien**en**', '**schiene**'],
              ['denken (to think)', 'denk**t**', '**dachte**', 'gedach**t**', '**dächte**'],
              ['beginnen (to begin)', 'beginn**t**', '**begann**', 'begonn**en**', '**begänne**'],
              ['finden (to find)', 'find**et**', '**fand**', 'gefund**en**', '**fände**'],
              ['liegen (to lie)', 'lieg**t**', '**lag**', 'geleg**en**', '**läge**'],
              ['sitzen (to sit)', 'sitz**t**', '**saß**', 'gesess**en**', '**säße**'],
              ['halten (to hold)', 'h**ä**l**t**', '**hielt**', 'gehalt**en**', '**hielte**'],
              ['fallen / laufen / rufen', 'f**ä**ll**t** / l**ä**uf**t** / ruf**t**', '**fiel** / **lief** / **rief**', 'gefall**en** / gelauf**en** / geruf**en**', 'fiele / liefe / riefe'],
              ['ziehen / brechen', 'zieh**t** / br**i**ch**t**', '**zog** / **brach**', 'gezog**en** / gebroch**en**', 'zöge / bräche'],
            ],
          },
        ],
      },
      {
        num: '05',
        id: 'articles',
        category: 'nouns',
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
      },
      {
        num: '06',
        id: 'noun-gender-plurals',
        category: 'nouns',
        title: 'Noun Gender Signals, Plurals & n-Nouns',
        nativeTitle: 'Genus · Plural · n-Deklination',
        summary:
          'Certain noun endings predict der / die / das with near-100% reliability. Nouns also add -(e)s in masc./neut. Genitive sg. and -n in Dative pl.',
        tables: [
          {
            caption: 'Reliable Noun Gender Suffixes',
            headers: ['Gender', 'Reliable Endings / Groups', 'Examples'],
            rows: [
              ['Masculine (**der**)', '-er (agents), -ig, -ling, -ismus, -or; days, months, seasons, weather', 'Lehr**er**, Kön**ig**, Frühl**ing**, Real**ismus**, Mot**or**, Montag, Regen'],
              ['Feminine (**die**)', '-ung, -heit, -keit, -schaft, -ion, -tät, -ik, -ei, -in (female); most -e nouns', 'Hoffn**ung**, Frei**heit**, Möglich**keit**, Freund**schaft**, Nat**ion**, Mus**ik**'],
              ['Neuter (**das**)', '-chen, -lein, -ment, -um, -tum; Ge- collectives; infinitive nouns', 'Mäd**chen**, Büch**lein**, Instru**ment**, Muse**um**, **Ge**birge, das Les**en**'],
            ],
          },
          {
            caption: 'Five German Plural Patterns & Noun Case Endings',
            headers: ['Pattern', 'Typical Group', 'Examples'],
            rows: [
              ['**-(e)n**', 'Almost all feminine nouns & weak masc. nouns', 'Frau → Frau**en**, Tür → Tür**en**, Mensch → Mensch**en**'],
              ['**-e** (often + umlaut)', 'Most monosyllabic masculine & neuter nouns', 'Tag → Tag**e**, Baum → B**ä**um**e**, Schiff → Schiff**e**'],
              ['**-er** (+ umlaut)', 'Many monosyllabic neuter & some masc. nouns', 'Kind → Kind**er**, Haus → H**ä**us**er**, Mann → M**ä**nn**er**'],
              ['**-Ø** (often + umlaut)', 'Masc./neut. nouns in -er, -el, -en, -chen, -lein', 'Vater → V**ä**ter, Fenster → Fenster, Mädchen → Mädchen'],
              ['**-s**', 'Loanwords, vowels, abbreviations', 'Auto → Auto**s**, Hotel → Hotel**s**'],
            ],
          },
        ],
        notes: [
          'Weak masculine n-nouns (der Mensch, Herr, Fürst, Name, Glaube, Gedanke, Junge) add **-(e)n** in Acc/Dat/Gen sg. and ALL plural forms (den Mensch**en**, dem Herr**n**, des Nam**ens**).',
          'Dative plural adds **-n** whenever the plural doesn\'t already end in -n or -s: mit den Kinder**n**, in den Häuser**n**, vor den Tage**n**.',
        ],
      },
      {
        num: '07',
        id: 'prepositions',
        category: 'nouns',
        title: 'Prepositions by Case & Contractions',
        nativeTitle: 'Präpositionen',
        summary:
          'German prepositions strictly govern Accusative, Dative, Genitive, or Two-Way (Accusative for motion, Dative for static location).',
        tables: [
          {
            caption: 'Preposition → Case Table',
            headers: ['Case', 'Prepositions', 'Examples'],
            rows: [
              ['Accusative', 'durch, für, gegen, ohne, um, bis, entlang', 'durch **den** Wald, für **mich**, ohne **einen** Laut'],
              ['Dative', 'aus, außer, bei, mit, nach, seit, von, zu, gegenüber', 'aus **dem** Haus, mit **dir**, von **seinem** Vater, zu **den** Schiffen'],
              ['Two-Way (Acc = wohin? / Dat = wo?)', 'an, auf, hinter, in, neben, über, unter, vor, zwischen', 'in **das** Meer (into) vs. in **dem** Meer (in); auf **den** Tisch vs. auf **dem** Tisch'],
              ['Genitive', 'während, wegen, trotz, statt (anstatt), innerhalb, außerhalb', 'während **des** Tages, trotz **der** Gefahr, wegen **des** Sturmes'],
            ],
          },
        ],
        notes: [
          'Standard contractions: in dem = **im**, in das = **ins**, an dem = **am**, an das = **ans**, bei dem = **beim**, von dem = **vom**, zu dem = **zum**, zu der = **zur**.',
        ],
      },
      {
        num: '08',
        id: 'adjectives',
        category: 'adj-pron',
        title: 'Adjective Declension & Comparatives',
        nativeTitle: 'Adjektivdeklination · Steigerung',
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
          {
            caption: 'Comparatives & Superlatives',
            headers: ['Positive', 'Comparative (-er)', 'Superlative (am …-sten / der …-ste)'],
            rows: [
              ['klein (small)', 'klein**er**', 'am klein**sten** / der klein**ste**'],
              ['alt / groß / lang (umlaut)', '**ä**lt**er** / gr**ö**ß**er** / l**ä**ng**er**', 'am **ä**lt**esten** / gr**ö**ß**ten** / l**ä**ng**sten**'],
              ['gut (good)', '**besser**', 'am **besten**'],
              ['viel (much)', '**mehr**', 'am **meisten**'],
              ['hoch / nah', '**höher** / **näher**', 'am **höchsten** / am **nächsten**'],
            ],
          },
        ],
      },
      {
        num: '09',
        id: 'pronouns',
        category: 'adj-pron',
        title: 'Personal, Reflexive, Possessive & Relative Pronouns',
        nativeTitle: 'Pronomen',
        summary:
          'Personal pronouns distinguish Accusative vs. Dative; relative pronouns look like definite articles EXCEPT in Genitive and Dative plural.',
        tables: [
          {
            caption: 'Personal & Reflexive Pronouns',
            headers: ['Nom', 'Acc', 'Dat', 'Reflexive (Acc / Dat)', 'Possessive'],
            rows: [
              ['ich (I)', '**mich**', '**mir**', 'mich / mir', 'mein-'],
              ['du (you sg.)', '**dich**', '**dir**', 'dich / dir', 'dein-'],
              ['er / es (he / it)', '**ihn** / **es**', '**ihm**', '**sich**', 'sein-'],
              ['sie (she)', '**sie**', '**ihr**', '**sich**', 'ihr-'],
              ['wir (we)', '**uns**', '**uns**', 'uns', 'unser-'],
              ['ihr (you pl.)', '**euch**', '**euch**', 'euch', 'euer-'],
              ['sie / Sie (they / formal)', '**sie** / **Sie**', '**ihnen** / **Ihnen**', '**sich**', 'ihr- / Ihr-'],
            ],
          },
          {
            caption: 'Relative Pronouns (who / which / whose)',
            headers: ['Case', 'Masc.', 'Fem.', 'Neut.', 'Plural'],
            rows: [
              ['Nom', 'der', 'die', 'das', 'die'],
              ['Acc', 'den', 'die', 'das', 'die'],
              ['Dat', 'dem', 'der', 'dem', '**denen**'],
              ['Gen ("whose")', '**dessen**', '**deren**', '**dessen**', '**deren**'],
            ],
          },
          {
            caption: 'der-Words (dieser / jeder / welcher / jener / mancher / solcher / all-) & wer / was',
            headers: ['Case', 'dieser-Pattern (m. / f. / n. / pl.)', 'wer (who)', 'was (what)'],
            rows: [
              ['Nom', 'dies**er** / dies**e** / dies**es** / dies**e**', '**wer**', '**was**'],
              ['Acc', 'dies**en** / dies**e** / dies**es** / dies**e**', '**wen**', '**was**'],
              ['Dat', 'dies**em** / dies**er** / dies**em** / dies**en**', '**wem**', '— (wo- + prep.)'],
              ['Gen', 'dies**es** / dies**er** / dies**es** / dies**er**', '**wessen**', '**wessen**'],
            ],
          },
        ],
        notes: [
          '**jeder, welcher, jener, mancher, solcher, all-** take the exact same endings as **dieser** (all**es**, all**e**, all**en**, all**er**, all**em**).',
        ],
      },
      {
        num: '10',
        id: 'word-order',
        category: 'rules',
        title: 'Word Order & Clause Structure',
        nativeTitle: 'Satzbau · V2 · Satzklammer',
        summary:
          'German main clauses always place the conjugated verb in Position 2 (V2), while subordinate clauses send the conjugated verb to the very end.',
        tables: [
          {
            caption: 'Core Clause Patterns',
            headers: ['Clause Type', 'Verb Position', 'Example'],
            rows: [
              ['Main statement (V2)', 'Finite verb in **Pos. 2**; infinitive/participle/prefix at **End**', 'Heute **habe** ich das Buch **gelesen**.'],
              ['Yes/No question & Imperative', 'Finite verb in **Pos. 1**', '**Kommst** du mit? · **Gib** mir das Buch!'],
              ['Coordinating (und, aber, oder, denn, sondern)', 'Pos. 0 — normal **V2** order after', 'Er blieb, **denn** es **war** spät.'],
              ['Subordinating (weil, dass, wenn, ob, als, obwohl, damit)', 'Finite verb at **very end**', 'Er blieb, **weil** es spät **war**.'],
            ],
          },
        ],
        notes: [
          'Adverbial order follows **TeKaMoLo**: Temporal (wann?) → Kausal (warum?) → Modal (wie?) → Lokal (wo/wohin?).',
        ],
      },
      {
        num: '11',
        id: 'historical-de',
        category: 'rules',
        title: 'Pre-1996 Spelling & Historical Forms',
        nativeTitle: 'Ältere Rechtschreibung',
        summary:
          'Public-domain German classics and Schlachter 1951 preserve pre-1996 orthography and traditional literary case forms.',
        tables: [
          {
            caption: 'Historical ↔ Modern German Quick Decoder',
            headers: ['Historical Text Form', 'Modern Equivalent', 'Notes'],
            rows: [
              ['da**ß**, mu**ß**, mu**ß**te, wu**ß**te, lä**ß**t, i**ß**t', 'da**ss**, mu**ss**, mu**ss**te, wu**ss**te, lä**ss**t, i**ss**t', 'Pre-1996 ß after short vowel (accepted in Lenient mode)'],
              ['**Th**ür, **Th**eil, **Th**al, **Th**ier, L**oo**s', '**T**ür, **T**eil, **T**al, **T**ier, L**o**s', 'Pre-1901 spelling in 19th-c. Verne/Carroll/Defoe'],
              ['**ward** (3sg past of werden)', '**wurde**', 'Archaic poetic/biblical Präteritum'],
              ['dem Weib**e**, am Tag**e**, im Haus**e**, im Land**e**', 'dem Weib, am Tag, im Haus, im Land', 'Traditional literary Dative singular -e'],
            ],
          },
        ],
      },
    ],
  },

  cs: {
    language: 'cs',
    title: 'Czech Inflection Reference',
    subtitle: 'Čeština · Verbs, Hard & Soft 7-Case Paradigms, Prepositions & Sound Shifts',
    sections: [
      {
        num: '01',
        id: 'present',
        category: 'verbs',
        title: 'Present & Perfective Future',
        nativeTitle: 'Přítomný čas',
        summary:
          'Czech verbs fall into 5 present conjugation classes. Perfective verbs use these present endings to express future tense (udělám = "I will do").',
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
          {
            caption: 'How to Recognize the 5 Classes from the Infinitive',
            headers: ['Class', 'Infinitive Signals', 'Examples'],
            rows: [
              ['**-ám / -áš** (V)', 'Most regular **-at** verbs + **mít** (mám), **dát** (dám)', 'děl**at**, vol**at**, ček**at**, hled**at**, zn**át**, odpovíd**at**'],
              ['**-ím / -íš** (IV)', 'Almost all **-it** & **-ět / -et** verbs; plus **spát** (spím), **stát** (stojím), **bát se** (bojím se)', 'pros**it**, mluv**it**, vid**ět**, slyš**et**, um**ět** (3pl umějí), trp**ět** (3pl trpí/trpějí)'],
              ['**-uji / -uješ** (IIIb)', 'ALL **-ovat** verbs (replace -ovat with **-uj-**)', 'kup**ovat** (kupuji), prac**ovat** (pracuji), děk**ovat** (děkuji), cest**ovat**'],
              ['**-u / -eš** (I & II)', 'All **-nout**, consonant + **-t/-st/-zt/-ct/-ci**, root **-at** with stem shift', 'tisk**nout** (tisknu), né**st** (nesu), jí**t** (jdu), mo**ci** (mohu), br**át** (beru)'],
              ['**-i / -eš** (IIIa)', 'Monosyllabic **-ít/-ýt/-át/-out**; softened root **-at**', 'p**ít** (piji), ž**ít** (žiji), hr**át** (hraji), ps**át** (píši/píšu), maz**at** (maži), ukáz**at** (ukáži)'],
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
        category: 'verbs',
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
              ['ty (2sg)', 'mě**l** jsi (m.sg.)', 'mě**la** jsi (f.sg.)', '—'],
              ['on / ona / ono (3sg)', 'mě**l**', 'mě**la**', 'mě**lo**'],
              ['my (1pl)', 'mě**li** jsme (m.pl.)', 'mě**ly** jsme (non-m.pl.)', '—'],
              ['vy — plural (2pl)', 'mě**li** jste (m.pl.)', 'mě**ly** jste (non-m.pl.)', '—'],
              ['Vy — formal sg. (vykání)', 'mě**l** jste (formal m.)', 'mě**la** jste (formal f.)', '—'],
              ['oni / ony / ona (3pl)', 'mě**li** (m.pl.)', 'mě**ly** (non-m.pl.)', 'mě**la** (n.pl.)'],
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
        category: 'verbs',
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
        category: 'verbs',
        title: 'Passive Voice, Participles & Transgressives',
        nativeTitle: 'Trpný rod · Příčestí · Přechodníky',
        summary:
          'Czech forms the passive with být + short passive participle (-n / -t) or with reflexive se + 3rd person (especially for impersonal passive like "mluvilo se").',
        tables: [
          {
            caption: 'Passive Voice Constructions',
            headers: ['Type', 'Formation', 'Examples'],
            rows: [
              ['Periphrastic Passive (**být** + part.)', 'je / byl / bude + **-n / -na / -no / -ni / -ny** (or **-t/-ta/-to**)', 'Dopis **je napsán**. Kniha **byla napsána**. Města **byla zničena**.'],
              ['Reflexive Passive (**se** + 3sg / 3pl)', '**se** + active 3rd-person verb (neuter sg. when subjectless)', 'Tady **se mluví** česky. O tom **se mluvilo** ("it was spoken of").'],
              ['Passive Participle patterns', '**-at → -án**, **-it/-et → -en/-ěn**, **-nout/-ít/-ýt → -t**', 'uděl**án**, připra**ven**, nalez**en**, zabi**t**, zapomen**ut**, otevř**en**'],
            ],
          },
          {
            caption: 'Transgressives (Přechodníky) & Passive Participles',
            headers: ['Form', 'Masc. sg.', 'Fem. / Neut. sg.', 'Plural'],
            rows: [
              ['Present transgr. (hard)', 'nes**a** / js**a**', 'nes**ouc** / js**ouc**', 'nes**ouce** / js**ouce**'],
              ['Present transgr. (soft)', 'zkoušej**e** / vid**ě**', 'zkoušej**íc** / vid**íc**', 'zkoušej**íce** / vid**íce**'],
              ['Past transgr. (vowel stem)', 'uděla**v** / zanecha**v**', 'uděla**vši** / zanecha**vši**', 'uděla**vše** / zanecha**vše**'],
              ['Past transgr. (cons. stem)', 'řek**Ø** / přines**Ø**', 'řek**ši** / přines**ši**', 'řek**še** / přines**še**'],
              ['Passive participle (short pred.)', 'napsá**n** / připrave**n**', 'napsá**na** (f.) / **-no** (n.)', 'napsá**ni** (m.pl.) / **-ny** / **-na** (n.pl.)'],
            ],
          },
        ],
        notes: [
          'The passive agent takes the **Instrumental** case with NO preposition: dopis napsaný **otcem** ("a letter written by the father").',
          'Active adjectival participles ("doing / going") are built from **3pl present + -cí** (**-ající, -ící, -ějící, -ující, -oucí**) and decline like soft adjective **jarní**: studovat → studuj**ící**, pohybovat → pohybuj**ícím**, odjíždět → odjížděj**ící**, žít → žij**ícího**.',
          'Before a noun, passive participles take long adjective endings: napsa**ný** dopis ("a written letter"), otevře**né** dveře ("an open door").',
        ],
      },
      {
        num: '05',
        id: 'irregulars',
        category: 'verbs',
        title: 'Essential Irregular Verbs',
        nativeTitle: 'Nepravidelná slovesa',
        summary: 'Core irregular Czech verbs in Present, Past, and Imperative.',
        tables: [
          {
            caption: 'Key Czech Irregular Paradigms',
            headers: ['Infinitive', 'Present (1sg / 3sg / 3pl)', 'Past (m. / f. / m.pl.)', 'Imperative (sg.)'],
            rows: [
              ['být (to be)', 'js**em** / j**e** (neg. **není**) / js**ou**', 'by**l** / by**la** / by**li**', 'bu**ď**'],
              ['mít (to have)', 'm**ám** / m**á** / m**ají**', 'mě**l** / mě**la** / mě**li**', 'mě**j**'],
              ['jít / přijít / najít', 'jd**u** / přijd**u** / najd**u**', 'še**l**·š**la** / přiše**l** / naše**l**', 'jd**i** / poj**ď** / přij**ď**'],
              ['chtít (to want)', 'chc**i** / chc**e** / cht**ějí**', 'chtě**l** / chtě**la** / chtě**li**', 'chtě**j**'],
              ['moci (to be able)', 'moh**u** / můž**e** / moh**ou**', 'moh**l** / moh**la** / moh**li**', '—'],
              ['muset / vidět', 'mus**ím**·mus**í** / vid**ím**·vid**í**', 'mus**el** / vid**ěl**', 'vi**ď**'],
              ['vědět (to know)', 'v**ím** / v**í** / věd**í**', 'vědě**l** / vědě**la** / vědě**li**', 'vě**z**'],
              ['říci (to say)', 'řekn**u** / řekn**e** / řekn**ou**', 'řek**l** / řek**la** / řek**li**', 'řekn**i**'],
              ['stát (stand / become)', 'stoj**ím** (stand) / stan**u** se (become)', 'st**ál** / sta**lo** se', 'st**ůj** / sta**ň** se'],
              ['vzít / začít / dostat', 'vezm**u** / začn**u** / dostan**u**', 'vza**l** / zača**l** / dosta**l**', 'vezm**i** (vem) / začn**i**'],
              ['jíst / spát / psát', 'j**ím** / sp**ím** / píš**u** (píši)', 'jed**l** / spa**l** / psa**l**', 'je**z** / sp**i** / pi**š**'],
              ['dát (to give)', 'd**ám** / d**á** / d**ají**', 'da**l** / da**la** / da**li**', 'de**j**'],
            ],
          },
        ],
      },
      {
        num: '06',
        id: 'cases-hard',
        category: 'nouns',
        title: 'Hard Noun Declensions — 7 Cases',
        nativeTitle: 'Tvrdé vzory (pán · hrad · žena · město)',
        summary:
          'Hard stems end in a hard/neutral consonant (h, ch, k, r, d, t, n, b, f, l, m, p, s, v, z) or -a / -o.',
        tables: [
          {
            caption: 'Hard Paradigm Endings (Singular / Plural)',
            headers: ['Case', 'Masc. anim (pán)', 'Masc. inan (hrad)', 'Fem. (žena)', 'Neut. (město)'],
            rows: [
              ['1. Nom', 'pán / pán**i** (-ové)', 'hrad / hrad**y**', 'žen**a** / žen**y**', 'měst**o** / měst**a**'],
              ['2. Gen', 'pán**a** / pán**ů**', 'hrad**u** (-a) / hrad**ů**', 'žen**y** / žen**Ø**', 'měst**a** / měst**Ø**'],
              ['3. Dat', 'pán**ovi** (-u) / pán**ům**', 'hrad**u** / hrad**ům**', 'žen**ě** / žen**ám**', 'měst**u** / měst**ům**'],
              ['4. Acc', 'pán**a** / pán**y**', 'hrad / hrad**y**', 'žen**u** / žen**y**', 'měst**o** / měst**a**'],
              ['5. Voc', 'pan**e** / pán**i**', 'hrad**e** / hrad**y**', 'žen**o** / žen**y**', 'měst**o** / měst**a**'],
              ['6. Loc', 'pán**ovi** (-u) / pán**ech**', 'hrad**u** (-ě) / hrad**ech**', 'žen**ě** / žen**ách**', 'měst**ě** (-u) / měst**ech**'],
              ['7. Inst', 'pán**em** / pán**y**', 'hrad**em** / hrad**y**', 'žen**ou** / žen**ami**', 'měst**em** / měst**y**'],
            ],
          },
        ],
      },
      {
        num: '07',
        id: 'cases-soft',
        category: 'nouns',
        title: 'Soft Noun Declensions — 7 Cases',
        nativeTitle: 'Měkké vzory (muž · stroj · růže · píseň · kost · moře · stavení)',
        summary:
          'Soft stems end in soft consonants (ž, š, č, ř, c, j, ď, ť, ň) or -e / -í. Notice how Gen/Dat/Loc/Acc frequently merge to -i or -e.',
        tables: [
          {
            caption: 'Soft Masculine & Feminine Paradigms (Singular / Plural)',
            headers: ['Case', 'Masc. anim (muž)', 'Masc. inan (stroj)', 'Fem. -e (růže)', 'Fem. cons. (píseň / kost)'],
            rows: [
              ['1. Nom', 'muž / muž**i** (-ové)', 'stroj / stroj**e**', 'růž**e** / růž**e**', 'píseň / písn**ě** · kost**i**'],
              ['2. Gen', 'muž**e** / muž**ů**', 'stroj**e** / stroj**ů**', 'růž**e** / růž**í**', 'písn**ě** / písn**í** · kost**i** / kost**í**'],
              ['3. Dat', 'muž**i** (-ovi) / muž**ům**', 'stroj**i** / stroj**ům**', 'růž**i** / růž**ím**', 'písn**i** / písn**ím** · kost**i** / kost**em**'],
              ['4. Acc', 'muž**e** / muž**e**', 'stroj / stroj**e**', 'růž**i** / růž**e**', 'píseň / písn**ě** · kost / kost**i**'],
              ['5. Voc', 'muž**i** / muž**i**', 'stroj**i** / stroj**e**', 'růž**e** / růž**e**', 'písn**i** / písn**ě** · kost**i**'],
              ['6. Loc', 'muž**i** (-ovi) / muž**ích**', 'stroj**i** / stroj**ích**', 'růž**i** / růž**ích**', 'písn**i** / písn**ích** · kost**i** / kost**ech**'],
              ['7. Inst', 'muž**em** / muž**i**', 'stroj**em** / stroj**i**', 'růž**í** / růž**emi**', 'písn**í** / písn**ěmi** · kost**í** / kost**mi**'],
            ],
          },
          {
            caption: 'Soft Neuter Paradigms (moře · kuře · stavení)',
            headers: ['Case', 'moře (sea)', 'kuře (chick/young)', 'stavení (building -í)'],
            rows: [
              ['Nom / Acc', 'moř**e** / moř**e**', 'kuř**e** / kuř**ata**', 'staven**í** / staven**í**'],
              ['Gen', 'moř**e** / moř**í**', 'kuř**ete** / kuř**at**', 'staven**í** / staven**í**'],
              ['Dat', 'moř**i** / moř**ím**', 'kuř**eti** / kuř**atům**', 'staven**í** / staven**ím**'],
              ['Loc', 'moř**i** / moř**ích**', 'kuř**eti** / kuř**atech**', 'staven**í** / staven**ích**'],
              ['Inst', 'moř**em** / moř**i**', 'kuř**etem** / kuř**aty**', 'staven**ím** / staven**ími**'],
            ],
          },
        ],
      },
      {
        num: '08',
        id: 'prepositions',
        category: 'nouns',
        title: 'Preposition → Case Map & Vocalization',
        nativeTitle: 'Předložky a pády',
        summary:
          'Czech prepositions govern fixed cases, and single-letter prepositions (v, s, z, k) add -e (ve, se, ze, ke) before similar consonants or clusters.',
        tables: [
          {
            caption: 'Core Czech Prepositions by Case',
            headers: ['Case', 'Prepositions', 'Examples'],
            rows: [
              ['2. Genitive', 'do, od, z/ze ("from"), bez, u, kolem, blízko, kromě, během, podle, místo', 'do měst**a**, bez vod**y**, ze strach**u**, u dom**u**'],
              ['3. Dative', 'k/ke, proti, kvůli, díky, naproti, vůči', 'ke dveř**ím**, proti větr**u**, díky tob**ě**'],
              ['4. Accusative', 'pro, přes, skrz, mimo; na/v/o/po/nad/pod/před/za/mezi (motion)', 'pro přítel**e**, přes moř**e**, na ostrov**Ø**, pod vod**u**'],
              ['6. Locative', 'v/ve, na, o, po, při (static / topic / time)', 'v dom**ě**, ve měst**ě**, na moř**i**, o pravd**ě**, po oběd**ě**'],
              ['7. Instrumental', 's/se ("with"), nad, pod, před, za, mezi (static location)', 'se mn**ou**, pod noh**ama**, před dom**em**, mezi lid**mi**'],
            ],
          },
        ],
      },
      {
        num: '09',
        id: 'adjectives',
        category: 'adj-pron',
        title: 'Hard, Soft & Possessive Adjectives + Comparatives',
        nativeTitle: 'Přídavná jména · Stupňování',
        summary:
          'Hard adjectives end in -ý/-á/-é; soft adjectives end in -í in all three singular nominatives; possessive adjectives (-ův / -in) come from singular personal nouns.',
        tables: [
          {
            caption: 'Hard (mladý) & Soft (jarní) Adjectives',
            headers: ['Case', 'Hard m. / n. / f. sg.', 'Hard pl. (m.anim / other)', 'Soft sg. (m./n. / f.)', 'Soft pl.'],
            rows: [
              ['Nom', 'mlad**ý** / **-é** / **-á**', 'mlad**í** / **-é** (n. **-á**)', 'jarn**í** / jarn**í**', 'jarn**í**'],
              ['Gen', 'mlad**ého** / **-é**', 'mlad**ých**', 'jarn**ího** / jarn**í**', 'jarn**ích**'],
              ['Dat', 'mlad**ému** / **-é**', 'mlad**ým**', 'jarn**ímu** / jarn**í**', 'jarn**ím**'],
              ['Acc', '= G/N / **-é** / **-ou**', 'mlad**é** (n. **-á**)', '= G/N / jarn**í**', 'jarn**í**'],
              ['Loc', 'mlad**ém** / **-é**', 'mlad**ých**', 'jarn**ím** / jarn**í**', 'jarn**ích**'],
              ['Inst', 'mlad**ým** / **-ou**', 'mlad**ými**', 'jarn**ím** / jarn**í**', 'jarn**ími**'],
            ],
          },
          {
            caption: 'Comparatives & Superlatives',
            headers: ['Positive', 'Comparative (-ší / -ější)', 'Superlative (nej-)', 'Adverb (-e / -ě / -o)'],
            rows: [
              ['mladý (young)', 'mlad**ší**', '**nej**mlad**ší**', 'mlad**ě**'],
              ['rychlý (fast)', 'rychl**ejší**', '**nej**rychl**ejší**', 'rychl**e**'],
              ['dobrý (good)', '**lepší**', '**nejlepší**', '**dobře** (lépe)'],
              ['špatný / zlý (bad)', '**horší**', '**nejhorší**', '**špatně** (hůře)'],
              ['velký (big)', '**větší**', '**největší**', '**velmi** (více)'],
              ['malý (small)', '**menší**', '**nejmenší**', '**málo** (méně)'],
            ],
          },
        ],
        notes: [
          'Possessive adjectives: from masculine nouns add **-ův / -ova / -ovo** (otc**ův** dům "father\'s house"); from feminine nouns add **-in / -ina / -ino** (matč**ina** kniha "mother\'s book").',
        ],
      },
      {
        num: '10',
        id: 'pronouns',
        category: 'adj-pron',
        title: 'Personal, Reflexive, Possessive & Demonstrative Pronouns',
        nativeTitle: 'Zájmena',
        summary:
          'Like Polish, short clitic forms (mě, mi, tě, ti, ho, mu, se, si) sit in 2nd position; after prepositions, 3rd-person pronouns take initial n- (něho, ní, nim).',
        tables: [
          {
            caption: 'Personal & Reflexive Pronouns',
            headers: ['Nom', 'Gen / Acc', 'Dat', 'Loc / Inst'],
            rows: [
              ['já (I)', '**mě** / **mne**', '**mi** / **mně**', 'mně (L) / **mnou** (I)'],
              ['ty (you sg.)', '**tě** / **tebe**', '**ti** / **tobě**', 'tobě (L) / **tebou** (I)'],
              ['on / ono (he/it)', '**ho** / **jeho** / **něho**', '**mu** / **jemu** / **němu**', 'něm (L) / **jím**·**ním** (I)'],
              ['ona (she)', '**jí** / **ní** (Acc **ji**/**ni**)', '**jí** / **ní**', 'ní (L) / **jí**·**ní** (I)'],
              ['my (we)', '**nás**', '**nám**', 'nás (L) / **námi** (I)'],
              ['vy (you pl./formal)', '**vás**', '**vám**', 'vás (L) / **vámi** (I)'],
              ['oni / ony (they)', '**jich**/**nich** (Acc **je**/**ně**)', '**jim** / **nim**', 'nich (L) / **jimi**·**nimi** (I)'],
              ['(reflexive self)', '**se** / **sebe**', '**si** / **sobě**', 'sobě (L) / **sebou** (I)'],
            ],
          },
          {
            caption: 'Demonstrative (ten) & Possessive (můj / svůj)',
            headers: ['Case', 'm. / n. sg. (ten / můj)', 'f. sg. (ta / má)', 'pl. (ti/ty/ta · moji/mé)'],
            rows: [
              ['Nom', 'ten / to · můj / m**oje** (mé)', 't**a** · m**oje** (má)', 't**i** / t**y** / t**a** · m**oji** / m**é**'],
              ['Gen', 't**oho** · m**ého**', 't**é** · m**é**', 't**ěch** · m**ých**'],
              ['Dat', 't**omu** · m**ému**', 't**é** · m**é**', 't**ěm** · m**ým**'],
              ['Acc', '= G/N / to · m**ého**/můj', 't**u** · m**ou** (moji)', 't**y** / t**a** · m**é**'],
              ['Loc / Inst', 't**om** / t**ím** · m**ém** / m**ým**', 't**é** / t**ou** · m**é** / m**ou**', 't**ěch** / t**ěmi** · m**ých** / m**ými**'],
            ],
          },
          {
            caption: 'Interrogatives (kdo / co), všechen (all), náš / váš & tenhle / tento',
            headers: ['Case', 'kdo (who)', 'co (what)', 'všechen (all / everything)', 'náš / váš (our / your)'],
            rows: [
              ['Nom', '**kdo**', '**co**', 'všechn**o** (n.) · všichn**i** (m.pl.) / všechn**y**', 'náš / naš**e** (n./f.) · naš**i** / naš**e**'],
              ['Gen', '**koho**', '**čeho**', 'vš**eho** (sg.) / vš**ech** (pl.)', 'naš**eho** / naš**í** / naš**ich**'],
              ['Dat', '**komu**', '**čemu**', 'vš**emu** (sg.) / vš**em** (pl.)', 'naš**emu** / naš**í** / naš**im**'],
              ['Acc', '**koho**', '**co**', 'všechn**o** · vš**echny**', '= G/N / naš**i** (f.sg.) / naš**e**'],
              ['Loc / Inst', '**kom** / **kým**', '**čem** / **čím**', 'vš**em**·vš**ech** (L) / vš**ím**·vš**emi** (I)', 'naš**em**·naš**í** (L) / naš**ím**·naš**í**·naš**imi** (I)'],
            ],
          },
        ],
        notes: [
          '**tenhle** ("this") and **tento** ("this", formal) simply attach **-hle** or **-to** onto the declined forms of **ten**: **tohle, tahle, tihle, téhle, tomhle** · **toto, tato, tito, této, tomto, tímto**.',
          'Possessives **jeho** ("his") and **jejich** ("their") NEVER decline; **její** ("her") declines like soft adjective **jarní** (její**ho**, jej**ích**, jej**ím**).',
          'Reflexive **svůj / svá / své** means "one\'s own" for any subject (vzali jsme **své** věci "we took our things"). Literary Czech also uses relative **jenž / jež / již** alongside **který**.',
        ],
      },
      {
        num: '11',
        id: 'alternations',
        category: 'rules',
        title: 'Palatalization, Vowel Shifts & Archaic Czech',
        nativeTitle: 'Hláskové změny · Archaismy',
        summary:
          'Consistent consonant softening and vowel shifts explain most Czech stem changes across cases and conjugations.',
        tables: [
          {
            caption: 'Key Sound Alternations & Archaic Signals',
            headers: ['Pattern', 'Where It Appears', 'Examples'],
            rows: [
              ['**k→c, h→z, ch→š, r→ř**', 'Dat/Loc fem. sg. (-e), Nom m.anim. pl. (-i), Loc pl. (-ích)', 'ru**k**a → ru**c**e · no**h**a → no**z**e · střech**a** → stře**š**e · dobr**ý** → dob**ř**í'],
              ['**ů ↔ o**', 'Closed vs. open stem', 'd**ů**m → d**o**mu · st**ů**l → st**o**lu · k**ů**ň → k**o**ně · B**ů**h → B**o**ha'],
              ['Fleeting **e** (e ↔ Ø)', 'Dropped when vowel ending added', 'p**e**s → psa · d**e**n → dne · ot**e**c → otce · s**e**n → snu · okn**o** → ok**e**n'],
              ['Archaic **-ti**, **jest**, **-ť**', 'Bible kralická (1613) & 1903 literature', 'bý**ti** (být), jís**ti** (jíst), **jest** (je), bude**ť** (bude), **což** (co)'],
            ],
          },
        ],
      },
    ],
  },

  es: {
    language: 'es',
    title: 'Spanish Inflection Reference',
    subtitle: 'Español · Verbs, Gender, Pronouns, Ser/Estar, Por/Para & Accents',
    sections: [
      {
        num: '01',
        id: 'present',
        category: 'verbs',
        title: 'Present Indicative & Four "You" Forms',
        nativeTitle: 'Presente de indicativo',
        summary:
          'Drop -ar, -er, or -ir and attach the person ending. Formal usted uses 3sg endings and ustedes uses 3pl endings.',
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
          {
            caption: 'How to Recognize Verb Classes & Spelling Shifts from the Infinitive',
            headers: ['Infinitive Pattern', 'Conjugation Behavior', 'Examples'],
            rows: [
              ['**-ar** (Class 1)', '~85% of Spanish verbs — default **-a-** theme vowel (**-o, -as, -a, -amos, -áis, -an**)', 'habl**ar**, tom**ar**, mir**ar**, entr**ar**, llam**ar**'],
              ['**-er** (Class 2)', '**-e-** theme vowel (**-o, -es, -e, -emos, -éis, -en**)', 'com**er**, beb**er**, le**er**, aprend**er**, corr**er**'],
              ['**-ir** (Class 3)', 'Same as -er EXCEPT nosotros (**-imos**), vosotros (**-ís**), imp. (**-id**)', 'viv**ir**, escrib**ir**, abr**ir**, sub**ir**, sal**ir**'],
              ['**-car / -gar / -zar**', 'Before **e** (1sg pret. & pres. subj.): **c→qu, g→gu, z→c**', 'bus**car** (busqué), lle**gar** (llegué), empe**zar** (empecé)'],
              ['vowel + **-cer / -cir**', 'Add **-zc-** in 1sg pres. & pres. subj.', 'cono**cer** (conozco), pare**cer** (parezco), condu**cir** (conduzco)'],
              ['**-ger / -gir** · **-uir**', '**g→j** before o/a; **-uir** (not -guir) inserts **-y-** in boot & 3rd pret.', 'co**ger** (cojo), diri**gir** (dirijo) · constr**uir** (construyo, construyó), h**uir** (huyó)'],
              ['Stem-changers & **-go**', 'Boot vowel shifts (**e→ie, o→ue**; **e→i** ONLY in **-ir** verbs); core **-go** 1sg verbs', 'qu**e**rer (quiero), p**o**der (puedo), p**e**dir (pido) · ten**go**, ven**go**, pon**go**, sal**go**, ha**go**, di**go**'],
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
        category: 'verbs',
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
          {
            caption: 'Preterite 3rd-Person Stem Shifts ("Sandal" -ir Verbs & i → y)',
            headers: ['Pattern', 'Applies To (3sg & 3pl Pret., Impf. Subj., Gerund)', 'Examples'],
            rows: [
              ['**-ir** verbs with **e → i**', 'Only **3sg & 3pl** preterite (plus impf. subj. & gerund!)', 'sentir → s**i**ntió / s**i**ntieron · pedir → p**i**dió / p**i**dieron · seguir → s**i**guió / s**i**guieron'],
              ['**-ir** verbs with **o → u**', 'Only **3sg & 3pl** preterite (plus impf. subj. & gerund!)', 'morir → m**u**rió / m**u**rieron (muriera, muriendo) · dormir → d**u**rmió / d**u**rmieron'],
              ['Vowel + **-er / -ir**: **i → y**', 'Unstressed **i** between vowels becomes **y** in 3sg/3pl pret. (and accented **í** in tú/nosotros/vosotros!)', 'creer → cre**yó** / cre**yeron** (cre**íste**) · leer → le**yó** / le**yeron** · oír → o**yó** / o**yeron** · caer → ca**yó** / ca**yeron**'],
            ],
          },
        ],
        notes: [
          'Irregular preterite stems (tuv-, estuv-, pud-, pus-, sup-, hic-/hiz-, quis-, vin-, dij-, traj-) ALL share unaccented endings: **-e, -iste, -o, -imos, -isteis, -ieron** (or **-eron** after j: dijeron, trajeron).',
          'Only THREE verbs are irregular in the Imperfect: ser (**era, eras, era, éramos, erais, eran**), ir (**iba, ibas, iba, íbamos, ibais, iban**), ver (**veía, veías…**).',
        ],
      },
      {
        num: '03',
        id: 'future-subj',
        category: 'verbs',
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
        category: 'verbs',
        title: 'Passive Voice, Imperatives, Gerunds & Participles',
        nativeTitle: 'Voz pasiva · Imperativo · Gerundio · Participio',
        summary:
          'Spanish forms the event passive with ser + agreed participle (+ por), the result state with estar + agreed participle, and everyday passive with reflexive se.',
        tables: [
          {
            caption: 'Passive Voice Constructions',
            headers: ['Construction', 'When Used', 'Examples'],
            rows: [
              ['Event Passive (**ser** + part. + **por**)', 'Action performed by an agent (participle agrees in gender/number!)', 'La carta **fue escrita** por él. Los barcos **fueron destruidos**.'],
              ['Result / State Passive (**estar** + part.)', 'Resulting state after an action (participle agrees!)', 'La puerta **está abierta**. Las ventanas **estaban cerradas**.'],
              ['Passive **se** (Pasiva refleja)', 'Everyday / unspecified agent — verb agrees in number with noun!', '**Se habla** español (sg.). **Se venden** libros (pl.). **Se dice** que…'],
            ],
          },
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
          'With haber (he comido), past participles stay invariable (-o); with ser/estar or as adjectives, they agree in gender & number (estoy cansad**a**, puertas abiert**as**).',
        ],
      },
      {
        num: '05',
        id: 'irregulars',
        category: 'verbs',
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
              ['haber (aux.)', '**he** / **ha** (hay) · pl. hemos/han', 'hub**e** / hub**o** / hub**ieron** (impf. hab**ía**)', 'hay**a** (impf. hubie**ra**)', 'habid**o**'],
              ['ir (to go)', 'vo**y** / v**a**', '**fui** / **fue** / **fueron**', 'vay**a**', 'id**o**'],
              ['tener (to have)', 'teng**o** / tien**e**', 'tuv**e** / tuv**o** / tuv**ieron**', 'teng**a**', 'tenid**o**'],
              ['hacer (to do)', 'hag**o** / hac**e**', 'hic**e** / hiz**o** / hic**ieron**', 'hag**a**', 'hech**o**'],
              ['decir (to say)', 'dig**o** / dic**e**', 'dij**e** / dij**o** / dij**eron**', 'dig**a**', 'dich**o**'],
              ['poder (can)', 'pued**o** / pued**e**', 'pud**e** / pud**o** / pud**ieron**', 'pued**a**', 'podid**o**'],
              ['querer (to want)', 'quier**o** / quier**e**', 'quis**e** / quis**o** / quis**ieron**', 'quier**a**', 'querid**o**'],
              ['saber (to know)', '**sé** / sab**e**', 'sup**e** / sup**o** / sup**ieron**', 'sep**a**', 'sabid**o**'],
              ['poner / salir', 'pong**o**·pon**e** / salg**o**·sal**e**', 'pus**e**·pus**o** / sal**í**·sali**ó**', 'pong**a** / salg**a**', 'pues**to** / salid**o**'],
              ['venir (to come)', 'veng**o** / vien**e**', 'vin**e** / vin**o** / vin**ieron**', 'veng**a**', 'venid**o**'],
              ['ver / dar', 've**o**·v**e** / do**y**·d**a**', 'v**i**·vi**o** / d**i**·di**o**', 've**a** / d**é**', 'vist**o** / dad**o**'],
              ['oír / caer / traer', 'oig**o** / caig**o** / traig**o**', 'o**yó** / ca**yó** / traj**o**·traj**eron**', 'oig**a** / caig**a** / traig**a**', 'oíd**o** / caíd**o** / traíd**o**'],
              ['morir / dormir', 'muer**o**·muer**e** / duerm**o**', 'm**u**ri**ó**·m**u**rier**on** / d**u**rmi**ó**', 'muer**a** (muramos) / duerm**a**', 'muer**to** / dormid**o**'],
              ['-ducir (conducir)', 'conduzc**o** / conduc**e**', 'conduj**e** / conduj**o** / conduj**eron**', 'conduzc**a**', 'conducid**o**'],
            ],
          },
        ],
      },
      {
        num: '06',
        id: 'articles-nouns',
        category: 'nouns',
        title: 'Articles, Noun Gender & Plurals',
        nativeTitle: 'Artículos · Género · Plural',
        summary:
          'Every Spanish noun is masculine or feminine. Articles agree in gender and number, with one phonetic exception for feminine nouns starting with stressed a-/ha-.',
        tables: [
          {
            caption: 'Articles & Gender Signals',
            headers: ['Gender', 'Articles (def. / indef.)', 'Typical Endings', 'High-Frequency Exceptions'],
            rows: [
              ['Masculine', '**el / los** · **un / unos**', '-o, -or, -aje, -án, Greek **-ma**', 'el dí**a**, el map**a**, el problem**a**, el sistem**a**, el tem**a**, el idiom**a**'],
              ['Feminine', '**la / las** · **una / unas**', '-a, **-ción, -sión, -dad, -tad, -tud, -umbre**', 'la man**o**, la noch**e**, la luz, la flor, la vez, la verdad'],
              ['Neuter (abstract)', '**lo** (+ masc. sg. adj.)', 'Abstract concepts only', '**lo** bueno ("what is good"), **lo** imposible'],
            ],
          },
          {
            caption: 'Plural Formation',
            headers: ['Singular Ending', 'Plural Rule', 'Examples'],
            rows: [
              ['Unstressed vowel (-a, -e, -i, -o, -u)', 'Add **-s**', 'casa → casa**s**, hombre → hombre**s**, pie → pie**s**'],
              ['Consonant or -y', 'Add **-es**', 'mar → mar**es**, rey → rey**es**, ciudad → ciudad**es**'],
              ['Ends in **-z**', 'Change **z → c** + **-es**', 'luz → lu**ces**, vez → ve**ces**, paz → pa**ces**, pez → pe**ces**'],
              ['Unstressed -s / -x (2+ syllables)', 'Invariable (article changes)', 'el lunes → **los** lunes, la crisis → **las** crisis'],
            ],
          },
        ],
        notes: [
          'Two mandatory contractions: a + el = **al**; de + el = **del**.',
          'Feminine singular nouns beginning with stressed **a- / ha-** take **el / un** to avoid vowel clash, while staying feminine with adjectives and in the plural: **el** agua frí**a** → **las** aguas frí**as** (also el alma, el águila, el hacha, el hambre).',
        ],
      },
      {
        num: '07',
        id: 'adjectives',
        category: 'adj-pron',
        title: 'Adjectives, Apocopation & Comparatives',
        nativeTitle: 'Adjetivos · Apócope · Comparativos',
        summary:
          'Adjectives usually follow the noun and agree in gender/number. Several common adjectives shorten (apocopate) when placed BEFORE a singular noun.',
        tables: [
          {
            caption: 'Adjective Agreement & Shortened Pre-Noun Forms',
            headers: ['Full Form', 'Short Form (before noun)', 'Condition', 'Example'],
            rows: [
              ['bueno / malo', '**buen** / **mal**', 'Before masc. sg. noun', 'un **buen** amigo · un **mal** día'],
              ['primero / tercero', '**primer** / **tercer**', 'Before masc. sg. noun', 'el **primer** paso · el **tercer** capítulo'],
              ['alguno / ninguno', '**algún** / **ningún**', 'Before masc. sg. noun', '**algún** día · **ningún** hombre'],
              ['uno / ciento', '**un** / **cien**', 'un (m.sg.) / cien (before any noun)', '**un** barco · **cien** leguas'],
              ['grande', '**gran**', 'Before ANY sg. noun (m. or f.)', 'un **gran** hombre · una **gran** isla'],
            ],
          },
          {
            caption: 'Comparatives & Superlatives',
            headers: ['Positive', 'Comparative', 'Superlative / Absolute (-ísimo)'],
            rows: [
              ['alto (tall)', '**más** alto **que** / **menos** alto **que**', 'el más alto · alt**ísimo** ("very tall")'],
              ['equality', '**tan** + adj. + **como**', '**tanto/a/os/as** + noun + **como**'],
              ['bueno / malo', '**mejor** / **peor**', 'el **mejor** / el **peor**'],
              ['grande / pequeño (age/rank)', '**mayor** / **menor**', 'el **mayor** / el **menor**'],
            ],
          },
        ],
      },
      {
        num: '08',
        id: 'pronouns',
        category: 'adj-pron',
        title: 'Personal, Object, Possessive & Relative Pronouns',
        nativeTitle: 'Pronombres',
        summary:
          'Object pronouns precede conjugated verbs (me lo dio) and attach to infinitives, gerunds, and affirmative commands (dámelo). Indirect le/les changes to se before lo/la/los/las.',
        tables: [
          {
            caption: 'Personal, Direct/Indirect Object & Reflexive Pronouns',
            headers: ['Subject', 'Direct Obj.', 'Indirect Obj.', 'Reflexive', 'After Prep.'],
            rows: [
              ['yo', '**me**', '**me**', '**me**', '**mí** (conmigo)'],
              ['tú', '**te**', '**te**', '**te**', '**ti** (contigo)'],
              ['él / ella / usted', '**lo** / **la**', '**le** (**se**)', '**se**', 'él / ella / usted (sí)'],
              ['nosotros / nosotras', '**nos**', '**nos**', '**nos**', 'nosotros / nosotras'],
              ['vosotros / vosotras', '**os**', '**os**', '**os**', 'vosotros / vosotras'],
              ['ellos / ellas / ustedes', '**los** / **las**', '**les** (**se**)', '**se**', 'ellos / ellas / ustedes'],
            ],
          },
          {
            caption: 'Possessives, Demonstratives & Relatives',
            headers: ['Type', 'Forms', 'Usage / Notes'],
            rows: [
              ['Short possessives (before noun)', '**mi(s), tu(s), su(s), nuestro/a(s), vuestro/a(s)**', 'Agree with the POSSESSED thing: **sus** libros, **nuestra** casa'],
              ['Stressed possessives (after noun)', '**mío/a, tuyo/a, suyo/a, nuestro/a, vuestro/a**', 'un amigo **mío**, el libro es **suyo**'],
              ['Demonstratives (near / mid / far)', '**este/a/os/as** · **ese/a/os/as** · **aquel/aquella/os/as**', 'Neuters (invariable): **esto, eso, aquello**'],
              ['Relatives', '**que** (general) · **quien(es)** (people) · **el/la cual** · **cuyo/a(s)** ("whose")', '**cuyo** agrees with the following noun: el hombre **cuya** casa vimos'],
            ],
          },
        ],
        notes: [
          'Double-object rule: Indirect ALWAYS comes before Direct (**me lo**, **te la**, **nos los**). Whenever **le** or **les** precedes **lo/la/los/las**, replace le/les with **se**: *le lo di* → **se lo** di ("I gave it to him/her").',
          'Neuter **ello** refers to an entire idea/clause after prepositions (por **ello**, a pesar de **ello**). Traditional Spanish literature also writes an accent on demonstrative pronouns (**éste, ése, aquél**) to distinguish them from determiners.',
        ],
      },
      {
        num: '09',
        id: 'ser-estar',
        category: 'rules',
        title: 'Ser vs. Estar',
        nativeTitle: 'Ser y Estar',
        summary:
          'Both mean "to be", but ser identifies inherent traits, origin, time, and passive voice, while estar expresses location, states, and progressive actions.',
        tables: [
          {
            caption: 'Ser vs. Estar Decision Guide',
            headers: ['Use **ser** (essence / identity)', 'Use **estar** (location / condition)'],
            rows: [
              ['Identity, profession, material: **Es** capitán. **Es** de hierro.', 'Physical location (people & places): El barco **está** en el mar.'],
              ['Inherent qualities: El mar **es** profundo.', 'Temporary states / emotions / results: **Estoy** cansado. La puerta **está** abierta.'],
              ['Time, date & event location: **Son** las cinco. La fiesta **es** aquí.', 'Progressive actions (+ gerund): **Estamos** navegando.'],
              ['Passive action (+ past part.): El barco **fue** construido en 1866.', 'Meaning shift: **es** listo (clever) vs. **está** listo (ready); **es** vivo (sharp) vs. **está** vivo (alive).'],
            ],
          },
        ],
      },
      {
        num: '10',
        id: 'por-para',
        category: 'rules',
        title: 'Por vs. Para',
        nativeTitle: 'Por y Para',
        summary:
          'Both frequently translate as "for", but por looks backward to cause/means/movement-through, while para looks forward to goal/recipient/deadline.',
        tables: [
          {
            caption: 'Por vs. Para Contrast',
            headers: ['Use **por** (cause · through · exchange)', 'Use **para** (goal · recipient · deadline)'],
            rows: [
              ['Cause / reason ("because of"): **por** miedo, gracias **por** todo', 'Purpose / goal ("in order to"): **para** ver, **para** escapar'],
              ['Movement through / along: **por** el mar, **por** la calle', 'Destination ("toward"): salimos **para** Europa'],
              ['Duration / part of day: **por** tres días, **por** la mañana', 'Deadline ("by"): **para** mañana'],
              ['Exchange / price / passive agent: **por** diez francos; escrito **por** Verne', 'Recipient / opinion: un regalo **para** ti; **para** mí es cierto'],
            ],
          },
        ],
      },
      {
        num: '11',
        id: 'accents',
        category: 'rules',
        title: 'Stress, Accent Marks & Diacritical Pairs',
        nativeTitle: 'Acentuación y tilde diacrítica',
        summary:
          'Spanish spelling predicts stress with 100% consistency—an acute accent (á é í ó ú) is written whenever a word breaks the two default rules, breaks a diphthong, or distinguishes homonyms.',
        tables: [
          {
            caption: 'Three Stress Rules',
            headers: ['Word Ending', 'Default Stress', 'Needs Accent When…', 'Examples'],
            rows: [
              ['Vowel, **-n**, or **-s**', '2nd-to-last syllable (llana)', 'Stressed on LAST syllable (aguda)', 'habl**ó**, tambi**é**n, capit**á**n, habl**á**is'],
              ['Any other consonant', 'LAST syllable (aguda)', 'Stressed on 2nd-to-last syllable', '**á**rbol, dif**í**cil, c**á**rcel, l**á**piz'],
              ['3rd-to-last+ (esdrújula)', 'Never default', 'ALWAYS carries an accent!', 'm**ú**sica, oc**é**ano, pr**ó**ximo, habl**á**bamos'],
            ],
          },
          {
            caption: 'Essential Tilde Pairs (Diacritical Accents)',
            headers: ['With Accent', 'Without Accent'],
            rows: [
              ['**tú** (you) · **él** (he) · **mí** (me)', '**tu** (your) · **el** (the) · **mi** (my)'],
              ['**sí** (yes / oneself) · **sé** (I know / be!) · **dé** (give, subj.)', '**si** (if) · **se** (reflexive) · **de** (of / from)'],
              ['**más** (more) · **aún** (still)', '**mas** (but, literary) · **aun** (even)'],
              ['**qué, quién, cuál, dónde, cuándo, cómo, cuánto** (questions / exclamations)', '**que, quien, cual, donde, cuando, como, cuanto** (relatives / conjunctions)'],
            ],
          },
        ],
        notes: [
          'Golden Age Spanish (Don Quijote, Lazarillo) includes classical forms like **agora** (ahora), **mesmo** (mismo), **ansí** (así), **trujo** (trajo), **vido** (vio), **deste/déste** (de este), and **vuestra merced** (usted).',
        ],
      },
    ],
  },
};
