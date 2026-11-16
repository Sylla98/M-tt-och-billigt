# Design: Mätt & Billigt

Den här filen beskriver appens beslutade färgpalett och startsidans (`/`) genomförda design. Planeringssidan, recepten, Byt rätt, inköpslistan, sparad plan, feedback, sidfoten, integritetssidan och statistikpanelen behåller sin layout, sina former och sin typografi, men använder samma palett.

Appen heter **Mätt & Billigt** överallt. Designunderlaget använde ett övergivet arbetsnamn, och det ska inte användas.

## Färgpalett: oliv och smörgult

**Beslut:** Paletten är oliv, smörgult och varm gräddvit enligt designunderlaget "3 · Oliv & smörgult". Den gäller i hela appen och ersätter den tidigare terrakottapaletten, som inte längre gäller. Färgerna är plana, utan texturer eller skuggor från underlaget. Oliv, smörgult och fördelsradens gräddvit är mätta i underlagets stora färgfält. Övriga toner är härledda för text, kanter och tillstånd.

### Var färgerna finns
- Alla färger är gemensamma variabler, `--color-*`, i `:root` i `src/app/globals.css`. Värdena är RGB-kanaler.
- Tailwind-färgerna i `tailwind.config.js` pekar på variablerna med samma roller (`bg-primary`, `text-ink-light/70` osv.).
- Startsidans CSS-modul använder samma variabler: `rgb(var(--color-primary))`.
- Lägg inte till egna hexkoder i komponenter. Behövs en ny nyans ska den in som en roll här.
- Enda undantaget är grytfigurens SVG (`public/landing/gryta.svg`). En bildfil kan inte läsa CSS-variabler, så den har fyllningen `#FDF7E3` (samma som `on-primary`) inskriven.

### Roller

| Roll (variabel / Tailwind) | Hex | Används till |
|---|---|---|
| `--color-page` / `page` | `#FBF5EA` | Sidbakgrund (varm gräddvit) |
| `--color-surface` / `surface` | `#FFFCF5` | Kort, fält, paneler, receptvy, Byt rätt, statistikpanel |
| `--color-surface-alt` / `surface-alt` | `#F6E8CA` | Varm gräddvit yta: startsidans fördelsrad, platshållare för receptbild |
| `--color-ink` / `ink` | `#2A2C1C` | Text, och text på smörgult |
| `--color-ink-muted` / `ink-light` | `#595B42` | Sekundär text och metadata |
| `--color-primary` / `primary` | `#4F5229` | Oliv: primära knappar, valda och avbockade tillstånd, progress, länkhover, fokusring, startsidans bakgrund, "kr kvar" och billigare byte |
| `--color-primary-hover` / `primary-hover` | `#3F4220` | Hover på primära knappar |
| `--color-primary-soft` / `primary-soft` | `#E9EAD3` | Tonad oliv: "kr kvar", taggar, platshållare |
| `--color-on-primary` / `on-primary` | `#FDF7E3` | Gräddvit text och ikoner på oliv, inklusive startsidans rubrik, grytfigur och båge |
| `--color-accent` / `accent` | `#F4D264` | Smörgult: startsidans huvudknapp, knappen "Lämna feedback" i resultatet |
| `--color-accent-hover` / `accent-hover` | `#F7DC85` | Hover på smörgult |
| `--color-accent-soft` / `accent-soft` | `#FAECC0` | Tonat smörgult (platshållare för receptbild) |
| `--color-line` / `line` | `#E6DFC9` | Kantlinjer och avdelare |
| `--color-line-strong` / `line-strong` | `#D3CAAA` | Tydligare kantlinjer (feedbackknapp, statistikpanel) |
| `--color-danger` / `danger` | `#A8432B` | Fel och "över budget" |
| `--color-danger-soft` / `danger-soft` | `#F6E1D6` | Tonad yta för "över budget" |

### Betydelser som inte bara bärs av färg
- **Budget:** står i text, "… kr kvar" (oliv på tonad oliv) eller "… kr över budget" (rost på tonad rost).
- **Byt rätt:** kostnadsskillnaden har tecken och text, "−27 kr för hela planen" och "+32 kr för hela planen". Billigare visas i oliv och dyrare i textfärg.
- **Avbockade varor:** har bock, genomstrykning och dämpad text, inte bara färg.
- **Felmeddelanden:** skrivs ut i text, till exempel "Matplanen kunde inte skapas".

### Kontrast (WCAG)
| Par | Kontrast |
|---|---|
| Gräddvit på oliv | 7,6:1 (hover 9,7:1) |
| Text på smörgult | 9,7:1 |
| Smörgul knapp mot oliv bakgrund | 5,5:1 |
| Text på sida | 13,1:1 |
| Sekundär text på sida / yta | 6,5:1 / 6,8:1 |
| Oliv på sida | 7,5:1 |
| "kr kvar" | 6,7:1 |
| "över budget" | 4,8:1 |
| Startsidans fördelsrad | 11,7:1 |

- Sekundär text med 70 % opacitet (`text-ink-light/70`, till exempel sidfot och metadata på receptkort) har 3,3:1. Med den tidigare paletten var det 2,9:1.
- Knappen "Generera matplan" visas med 80 % opacitet medan planen skapas, så att texten "Skapar din matplan…" går att läsa (4,6:1).
- Fokusringen är oliv på ljusa ytor och gräddvit på oliv.

## Startsidan

### Filer
- `src/app/page.js`: struktur och innehåll.
- `src/app/landing.module.css`: startsidestilar. Det är en CSS-modul, så klassnamnen gäller bara startsidan. Färgerna kommer från de gemensamma variablerna.
- `public/landing/gryta.svg`: grytfiguren.
- Matbild: `public/recipe-images/kottbullar-potatis-graddsas.jpg`, den befintliga receptbilden för "Köttbullar med potatis och gräddsås". Den visas som stämningsbild och är ingen kopia. Byts receptbilden ändras även startsidan, så kontrollera då beskärningen i bågen.

### Färger på startsidan
| Användning | Roll | Färg |
|---|---|---|
| Huvudbakgrund (sidhuvud och hero) | `primary` | `#4F5229` |
| Text, grytfigur, dekorativ båge | `on-primary` | `#FDF7E3` |
| Huvudknapp | `accent`, hover `accent-hover` | `#F4D264`, hover `#F7DC85` |
| Text på huvudknappen | `ink` | `#2A2C1C` |
| Nedre informationsrad | `surface-alt`, text och ikoner `ink` | `#F6E8CA` och `#2A2C1C` |

### Typografi
Bara de befintliga typsnitten från Fontshare används:
- **Boska** (`font-display`): varumärket "Mätt & Billigt" (halvfet, tight spärrning, som tidigare) och rubriken (fet).
- **Satoshi**: övrig text.

Rubriken har tre rader: "Veckans mat." / "Smartare" / "planerad." Undantaget är mycket låga mobilskärmar medan statistikpanelen visas (se Layout). Raderna är block i `<h1>`, så skärmläsare läser "Veckans mat. Smartare planerad."

Storlekar för varumärke och rubrik:

| Läge | Varumärke | Rubrik |
|---|---|---|
| Mobil | 1,625rem (1,375rem under 360 px) | 2,25rem (2rem under 360 px) |
| md | 2,25rem | 3,25rem |
| lg | 2,625rem | 4rem |
| xl | 2,625rem | 4,5rem |
| Från 1024 px, fönster högst 860 px högt | – | 3,5rem |

### Layout
**Desktop (från 768 px):**
- Sidhuvud med varumärket till vänster och feedbackknappen till höger.
- Två kolumner:
  - Vänster: rubrik, introduktion, huvudknapp med "Gratis · Ingen inloggning", och grytfiguren. Figuren står bredvid knappen från 1024 px och under knappen vid 768–1023 px. Knapptexten radbryts aldrig.
  - Höger: matbild med välvd överkant och en tunn dekorativ båge runt bildens vänstra och övre kant.
- Bilden når ned till informationsraden. Dess höjd följer fönstrets höjd (28–40rem), så att sidan med sidfot ryms i ett vanligt fönster.
- Informationsraden har tre fördelar med linjeikoner, åtskilda av tunna lodräta linjer. Den fyller ut till sidfoten. Vid 768–1023 px är texten något mindre och får radbrytas i stället för att ge sidledsöverflöd.
- Innehållet är högst 75rem brett och har 2rem sidmarginal.

**Mobil:**
- Kompakt sidhuvud.
- Därefter centrerat: rubrik, introduktion, huvudknapp (högst 17,5rem bred), "Gratis · Ingen inloggning", grytfiguren och matbilden.
- Bågen går över bildens övre högra del.
- Fördelarna ligger som tre enkla rader, ikon och text, i ett centrerat block utan kort.
- Höger del av sidhuvudet hålls fri för feedbackknappen, och varumärket radbryts aldrig.

**Statistikpanelen:**
- Den visas med samma innehåll och likvärdiga val som förut.
- På låga mobilskärmar blir avstånden tätare och rubriken mindre medan första valet visas (`html[data-consent='open']`), så att huvudknappen syns ovanför panelen:
  - Högst 700 px höga skärmar, till exempel 320×640: tätare avstånd.
  - Högst 600 px höga skärmar, till exempel 320×568: rubriken ligger dessutom på två rader, "Veckans mat." / "Smartare planerad."
- Vanliga mobiler och desktop har samma layout med och utan panel.

### Grytfiguren och bilden
- Grytfiguren är en ren SVG med gräddvit fyllning och transparent bakgrund. Den är spårad från det godkända underlaget och har lock, handtag, slutna ögon, leende och ånga.
- Den är dekorativ (`aria-hidden`, tom `alt`) och har ingen animation.
- En kort gräddvit linje under figuren fungerar som bordskant.
- Matbilden och ikonerna är också dekorativa. Texten bär innehållet.

### Feedbackknappen på startsidan
- Det är samma komponent och länk som i resten av appen (`FeedbackFab.js`, `https://forms.gle/GEG39fV4MtKDkPbs5`): fast längst upp, synlig vid scroll och dold medan ett textfält har fokus på pekskärm.
- På startsidan har den oliv bakgrund, gräddvit text och en tunn gräddvit kant. Den ligger i sidhuvudets högra kant i stället för centrerat.
- Olivfyllningen gör knappen tydlig även när den hamnar över den ljusa informationsraden.
- Fokusringen är gräddvit med en mörk yttre ring, så den syns mot båda bakgrunderna.

### Fokus och tryckytor
- I olivsektionen är fokusringen gräddvit i stället för appens olivfärgade.
- Huvudknappen är minst 48 px hög på mobil och 60 px på desktop.
- Feedbackknappen har en osynlig tryckyta på cirka 44 px på mobil, som i resten av appen.

### Avgränsning och sådant som inte ändras
- **Startsidans stilar:** de ligger i CSS-modulen eller i Tailwind-klasser i `page.js`.
- **Händelser och lagring:** huvudknappen är den enda ingången till `/planera` och skickar fortfarande bara `landing_cta_clicked`, efter ja till statistik. Lagringsnycklar, sparade planer och statistikval påverkas inte.
- **Sidfot:** sidfoten med "Integritet" och "Ändra val för statistik" är oförändrad.

### Avvikelser från designunderlaget
- Underlaget visar sidan som ett kort med rundade hörn. Sidan går i stället kant till kant, med den befintliga sidfoten under.
- Underlagets bildgenererade texturer, skuggor och ljusspel är inte återskapade.
- Matbilden är en befintlig receptbild (köttbullar med kokt potatis och gräddsås), inte underlagets konceptbild med potatismos och gurka.
