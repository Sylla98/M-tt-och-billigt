# Receptbilder

## Hur bildsystemet fungerar

Varje recept i `src/data/recipes.js` har ett eget `image`-fält som pekar på
en specifik bildfil, t.ex.:

```js
image: '/recipe-images/klassisk-kottfarssas.jpg'
```

`RecipeCard.js` visar bilden med en tydlig, konsekvent fallback-kedja så att
en trasig bildikon **aldrig** kan visas:

1. **Receptets egen bild** (`recipe.image`) – prioriteras alltid först.
2. Om filen saknas eller inte går att ladda: en **kategoribild** väljs
   automatiskt utifrån receptets namn/ingredienser (`getRecipeImage.js`,
   oförändrad – t.ex. `pasta.jpg`, `chicken.jpg`, `fish.jpg`).
3. Om även kategoribilden saknas: en neutral platshållare med receptets
   namn i text, ingen gradient, ingen trasig bildikon.

**Appen fungerar redan idag utan att någon av bildfilerna nedan finns** –
den faller då tillbaka på steg 2/3 ovan. Bilderna nedan är alltså en ren
visuell förbättring, ingen förutsättning för att appen ska fungera.

## Del 1: De 40 receptspecifika bilderna (prioritet 1)

Lägg filerna direkt i den här mappen (`public/recipe-images/`) med **exakt**
dessa filnamn (små bokstäver, bindestreck, inga å/ä/ö):

| ✅ | Receptnamn | Filnamn |
|---|---|---|
| ☐ | Röd linsgryta med kokosmjölk | `rod-linsgryta-kokos.jpg` |
| ☐ | Krämig tomatpasta | `kramig-tomatpasta.jpg` |
| ☐ | Kikärtscurry | `kikartscurry.jpg` |
| ☐ | Stekt ris med ägg och grönsaker | `stekt-ris-agg.jpg` |
| ☐ | Halloumigryta med couscous | `halloumigryta-couscous.jpg` |
| ☐ | Klassiska pannkakor | `pannkakor-klassiska.jpg` |
| ☐ | Snabb kycklingcurry | `snabb-kycklingcurry.jpg` |
| ☐ | Krämig kycklingpasta | `kramig-kycklingpasta.jpg` |
| ☐ | Kycklinggryta med paprika | `kycklinggryta-paprika.jpg` |
| ☐ | Klassisk köttfärssås | `klassisk-kottfarssas.jpg` |
| ☐ | Tacogryta med köttfärs | `tacogryta-kottfars.jpg` |
| ☐ | Ugnsbakad lax med potatis | `ugnsbakad-lax-potatis.jpg` |
| ☐ | Vegetarisk lasagne med spenat | `vegetarisk-lasagne-spenat.jpg` |
| ☐ | Linsbolognese | `linsbolognese.jpg` |
| ☐ | Krämig kikärtspasta | `kramig-kikartspasta.jpg` |
| ☐ | Krämig broccolipasta med citron och parmesan | `kramig-broccolipasta-citron-parmesan.jpg` |
| ☐ | Vegetarisk stroganoff | `vegetarisk-stroganoff.jpg` |
| ☐ | Ugnsrostade grönsaker med fetaost | `ugnsrostade-gronsaker-fetaost.jpg` |
| ☐ | Kycklingwok med nudlar | `kycklingwok-nudlar.jpg` |
| ☐ | Kycklingstroganoff med ris | `kycklingstroganoff-ris.jpg` |
| ☐ | Honungs- och senapskyckling med rostad potatis | `honungs-senapskyckling-rostad-potatis.jpg` |
| ☐ | Kycklingfärsbiffar med couscous | `kycklingfarsbiffar-couscous.jpg` |
| ☐ | Köttbullar med potatis och gräddsås | `kottbullar-potatis-graddsas.jpg` |
| ☐ | Korvstroganoff med ris | `korvstroganoff-ris.jpg` |
| ☐ | Fiskgratäng med potatismos | `fiskgratang-potatismos.jpg` |
| ☐ | Krispig torsk med citronyoghurt och rostad potatis | `krispig-torsk-citronyoghurt-potatis.jpg` |
| ☐ | Pasta e ceci | `pasta-e-ceci.jpg` |
| ☐ | Krispiga potatistacos med bönor och vitlöksyoghurt | `krispiga-potatistacos-bonor-vitloksyoghurt.jpg` |
| ☐ | Mexikansk bönchili med ris | `mexikansk-bonchili-ris.jpg` |
| ☐ | Ugnsbakad gnocchi med tomat och mozzarella | `ugnsbakad-gnocchi-mozzarella.jpg` |
| ☐ | Vegetariska quesadillas med bönor, majs och ost | `vegetariska-quesadillas-bonor-majs-ost.jpg` |
| ☐ | Ugnsbakad teriyakikyckling med ris och broccoli | `teriyakikyckling-ris-broccoli.jpg` |
| ☐ | Kycklingtacos med majs och bönor | `kycklingtacos-majs-bonor.jpg` |
| ☐ | Harissakyckling med couscous | `harissakyckling-couscous.jpg` |
| ☐ | Köttfärslimpa med potatis och sås | `kottfarslimpa-potatis-sas.jpg` |
| ☐ | Chili con carne | `chili-con-carne.jpg` |
| ☐ | Kryddig nudelwok med köttfärs | `kryddig-nudelwok-kottfars.jpg` |
| ☐ | Korv med potatismos | `korv-potatismos.jpg` |
| ☐ | Laxpasta med spenat | `laxpasta-spenat.jpg` |
| ☐ | Vuxen fisktaco med chili-limecrema | `vuxen-fisktaco-chililime.jpg` |

Bocka av rutan i vänsterkolumnen i din egen kopia av filen när en bild lagts
in, som en enkel checklista över vad som återstår.

## Del 2: Kategoribilder (prioritet 2 – fallback)

Dessa 15 filer används automatiskt av `getRecipeImage.js` om ett recept
saknar sin egen bild ovan. Redan dokumenterade sedan tidigare, oförändrade:

| Filnamn | Motiv |
|---|---|
| `pasta.jpg` | Pastarätt (t.ex. spaghetti med sås) |
| `soup.jpg` | Soppa i skål |
| `stew.jpg` | Gryta |
| `curry.jpg` | Curryrätt |
| `rice.jpg` | Risrätt (t.ex. risotto/stekt ris) |
| `salad.jpg` | Sallad |
| `vegetarian.jpg` | Vegetarisk rätt med grönsaker |
| `chicken.jpg` | Kycklingrätt |
| `minced-meat.jpg` | Köttfärsrätt (t.ex. köttbullar) |
| `fish.jpg` | Fiskrätt |
| `pancakes.jpg` | Pannkakor |
| `breakfast.jpg` | Frukost/gröt |
| `oven-dish.jpg` | Gratäng/ugnsrätt |
| `beans-lentils.jpg` | Rätt med linser/bönor |
| `fallback.jpg` | Neutral matbild (används när inget annat matchar) |

## Rekommenderat bildformat

- **Liggande format**, t.ex. 4:3 eller 3:2 – kortet visar bilden beskuren
  med `object-fit: cover` i 4:3 (stängt kort) respektive 16:9 (öppnat
  recept), så bilden bör själv vara liggande för bäst resultat i båda lägena.
- **Bredd:** ca 800–1200 px (räcker för kortets bredd, håller filstorleken nere).
- **Format:** JPG, komprimerad för webben – sikta på under 150–200 KB per bild.
- **Motiv:** aptitligt, tydligt ljust foto av just den rätten – undvik
  hårt beskurna närbilder som gör det svårt att se vad rätten faktiskt är.

## Så lägger du in en bild

1. Spara bildfilen med **exakt** det filnamn som anges i tabellen ovan.
2. Lägg filen direkt i `public/recipe-images/` (ingen undermapp).
3. Klart – `recipe.image`-fältet i `recipes.js` pekar redan dit, ingen
   kodändring behövs.

## Var du hittar fria bilder

Använd endast bilder med licenser som tillåter användningen:

- **Unsplash** (unsplash.com) – Unsplash License, fri att använda
- **Pexels** (pexels.com) – Pexels License, fri att använda
- **Pixabay** (pixabay.com) – Pixabay License, fri att använda

**Använd inte** slumpmässiga bilder från Google Bilder – de har oftast
upphovsrättsskydd.

## Dokumentera licenser här

Fyll i källa/fotograf/licens när du lägger in bilder, som referens:

| Fil | Källa (URL) | Fotograf | Licens |
|---|---|---|---|
| | | | |
