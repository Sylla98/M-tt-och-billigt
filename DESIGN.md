# Design: Mätt & Billigt

Den här filen beskriver den genomförda designen för startsidan (`/`). Planeringssidan, recepten, inköpslistan och integritetssidan har sin tidigare design och beskrivs inte här.

Appen heter **Mätt & Billigt** överallt. Designunderlaget använde ett övergivet arbetsnamn, och det ska inte användas.

## Startsidan

### Filer
- `src/app/page.js`: struktur och innehåll.
- `src/app/landing.module.css`: färger och startsidestilar. Det är en CSS-modul, så klassnamnen gäller bara startsidan.
- `public/landing/gryta.svg`: grytfiguren.
- Matbild: `public/recipe-images/kottbullar-potatis-graddsas.jpg`, den befintliga receptbilden för "Köttbullar med potatis och gräddsås". Den visas som stämningsbild och är ingen kopia. Byts receptbilden ändras även startsidan, så kontrollera då beskärningen i bågen.

### Färger
Färgerna är plana, utan texturer eller skuggor. De är definierade som variabler på `.landing` i `landing.module.css`.

| Användning | Färg |
|---|---|
| Huvudbakgrund (sidhuvud och hero) | `#93412F` |
| Text, grytfigur, dekorativ båge | `#FFF3DC` |
| Huvudknapp | `#F4CF78`, hover `#F7DA93` |
| Text på huvudknappen | `#44291F` |
| Nedre informationsrad | bakgrund `#FFF3DC`, text och ikoner `#793528` |

Kontrastförhållanden (WCAG):
- Gräddvit text på terrakotta: 6,3:1.
- Knapptext: 8,9:1.
- Informationsraden: 8,1:1.
- "Gratis · Ingen inloggning" (90 % opacitet): 5,4:1.

### Typografi
Bara de befintliga typsnitten från Fontshare används:
- **Boska** (`font-display`): varumärket "Mätt & Billigt" (halvfet, tight spärrning, som tidigare) och rubriken (fet).
- **Satoshi**: övrig text.

Rubriken har alltid tre rader: "Veckans mat." / "Smartare" / "planerad." Raderna är block i `<h1>`, så skärmläsare läser "Veckans mat. Smartare planerad."

Storlekar för varumärke och rubrik:

| Läge | Varumärke | Rubrik |
|---|---|---|
| Mobil | 1,625rem (1,375rem under 360 px) | 2,25rem (2rem under 360 px) |
| md | 2,25rem | 3,25rem |
| lg | 2,625rem | 4rem |
| xl | 2,625rem | 4,5rem |
| Desktopfönster högst 860 px högt | – | 3,5rem |

### Layout
**Desktop (från 768 px):**
- Sidhuvud med varumärket till vänster och feedbackknappen till höger.
- Två kolumner:
  - Vänster: rubrik, introduktion, huvudknapp med "Gratis · Ingen inloggning", och grytfiguren bredvid knappen.
  - Höger: matbild med välvd överkant och en tunn dekorativ båge runt bildens vänstra och övre kant.
- Bilden når ned till informationsraden. Dess höjd följer fönstrets höjd (28–40rem), så att sidan med sidfot ryms i ett vanligt fönster.
- Informationsraden har tre fördelar med linjeikoner, åtskilda av tunna lodräta linjer. Den fyller ut till sidfoten.
- Innehållet är högst 75rem brett och har 2rem sidmarginal.

**Mobil:**
- Kompakt sidhuvud.
- Därefter centrerat: rubrik, introduktion, huvudknapp (högst 17,5rem bred), "Gratis · Ingen inloggning", grytfiguren och matbilden.
- Bågen går över bildens övre högra del.
- Fördelarna ligger som tre enkla rader, ikon och text, i ett centrerat block utan kort.
- Höger del av sidhuvudet hålls fri för feedbackknappen, och varumärket radbryts aldrig.

**Statistikpanelen:**
- Den visas med samma innehåll och likvärdiga val som förut.
- På låga mobilskärmar (högst 700 px höga) blir avstånden tätare och rubriken mindre medan första valet visas (`html[data-consent='open']`), så att huvudknappen syns ovanför panelen.
- Vanliga mobiler och desktop har samma layout med och utan panel.

### Grytfiguren och bilden
- Grytfiguren är en ren SVG med gräddvit fyllning och transparent bakgrund. Den är spårad från det godkända underlaget och har lock, handtag, slutna ögon, leende och ånga.
- Den är dekorativ (`aria-hidden`, tom `alt`) och har ingen animation.
- En kort gräddvit linje under figuren fungerar som bordskant.
- Matbilden och ikonerna är också dekorativa. Texten bär innehållet.

### Feedbackknappen på startsidan
- Det är samma komponent och länk som i resten av appen (`FeedbackFab.js`, `https://forms.gle/GEG39fV4MtKDkPbs5`): fast längst upp, synlig vid scroll och dold medan ett textfält har fokus på pekskärm.
- På startsidan har den terrakotta bakgrund, gräddvit text och en tunn gräddvit kant. Den ligger i sidhuvudets högra kant i stället för centrerat.
- Terrakottan gör knappen tydlig även när den hamnar över den ljusa informationsraden.
- Fokusringen är gräddvit med en mörk yttre ring, så den syns mot båda bakgrunderna.

### Fokus och tryckytor
- I terrakottasektionen är fokusringen gräddvit i stället för appens gröna.
- Huvudknappen är minst 48 px hög på mobil och 60 px på desktop.
- Feedbackknappen har en osynlig tryckyta på cirka 44 px på mobil, som i resten av appen.

### Avgränsning och sådant som inte ändras
- **Startsidans stilar:** de nya ligger i CSS-modulen eller i Tailwind-klasser i `page.js`. `globals.css` har bara förlorat de gamla startsidevariablerna (`--land-*`).
- **Händelser och lagring:** huvudknappen är den enda ingången till `/planera` och skickar fortfarande bara `landing_cta_clicked`, efter ja till statistik. Lagringsnycklar, sparade planer och statistikval påverkas inte.
- **Sidfot:** sidfoten med "Integritet" och "Ändra val för statistik" är oförändrad.

### Avvikelser från designunderlaget
- Underlaget visar sidan som ett kort med rundade hörn. Sidan går i stället kant till kant, med den befintliga sidfoten under.
- Underlagets bildgenererade texturer, skuggor och ljusspel är inte återskapade.
- Matbilden är en befintlig receptbild (köttbullar med kokt potatis och gräddsås), inte underlagets konceptbild med potatismos och gurka.
