# Receptflöde – lägga till, ändra och ta bort recept

Det här dokumentet är arbetsflödet för alla receptuppgifter i Mätt & Billigt. Elis ska kunna skriva *"lägg till det här receptet enligt receptflödet"* (med länk eller recepttext), eller motsvarande för att ändra eller ta bort ett recept, och Claude ska då följa det här dokumentet från start till leverans.

Målet är mindre handpåläggning **utan** sämre receptkvalitet eller sämre kostnadsberäkningar. `CLAUDE.md` gäller alltid i första hand: ingen merge till `main`, ingen Production, feature-gren, Elis beslutar i produkt- och designfrågor. Här står bara det som är specifikt för recept.

**Grundregler**
1. Läs först (avsnitt 1 och befintlig kod/data) och gör sedan. Gissa inte hur appen fungerar.
2. Ändra bara det uppgiften gäller. Ingen appkod, inget ingrediensregister, inga priser och ingen design ändras som sidoeffekt. Behöver receptet en sådan ändring: stanna, föreslå den separat och fråga.
3. Hitta aldrig på priser, källor, mått eller bilder, och beskriv aldrig något som verifierat som inte är det.
4. Lös rutinmässiga val själv och redovisa relevanta antaganden. Fråga bara när saknad information påverkar resultatet väsentligt (se 2.3).
5. Skilj alltid på vad kod/skript visar, vad som setts i webbläsaren och vad som setts på Preview/Production.

---

## 1. Så fungerar recepten i appen

Kartlagt i koden 2026-10-29 (60 recept). Där koden ändras senare gäller koden före detta dokument. Uppdatera i så fall dokumentet i samma uppgift.

### 1.1 Datamodell – `src/data/recipes.js`
Alla recept ligger i en enda array `RECIPES`. Ordningen spelar ingen roll för urvalet. Filen är indelad med kommentarsrubriker per omgång och proteintyp (antalen i rubrikerna är inaktuella). Nya recept läggs sist i arrayen, före `]`, under en egen rubrik. Det finns inget fält för källa, prisdatum eller verifieringsstatus.

| Fält | Konvention i befintliga recept | Används av |
|---|---|---|
| `id` | kebab-case, ASCII (å→a, ä→a, ö→o), unikt. **Samma som bildens filnamn.** Ändras aldrig för befintliga recept | Byt rätt, bildväg, React-nycklar |
| `name` | svenskt visningsnamn, unikt | UI, bildval-fallback |
| `description` | en mening, 36–91 tecken | receptkort och receptvy |
| `baseServings` | **4** | all skalning |
| `dietTypes` | veg: `['vegetarisk','blandkost']`. Kött/fisk: `['blandkost','kott-gront','proteinrikt']` (4 st har bara de två första). Ett vegetariskt recept har även `'somrigt'` | **bara `'vegetarisk'` styr urvalet** och valideras. Övriga värden är beskrivande |
| `familyFriendly` | boolean | hårt filter vid kostval "Familjevänligt", +20 poäng |
| `activeTimeMinutes` / `totalTimeMinutes` | heltal, aktiv ≤ total | poäng ("snabb": aktiv ≤ 25 och total ≤ 40), receptkortet, validering |
| `difficulty` | `'enkel'` (58 av 60) eller `'medel'` | används inte i logiken |
| `tags` | t.ex. `snabb`, `billig`, `familjevänlig`, `fryser bra`, `somrig` | **bara `'somrig'` används** (poäng vid kostval "Somrigt") |
| `mainIngredient` | huvudråvara som text | används inte i logiken |
| `proteinType` | `vegetariskt`, `kyckling`, `fisk`, `köttfärs`, `korv`, `nötkött`, `fläsk` | filter "Kött & grönt", variation, validering |
| `carbohydrateType` | `potatis`, `ris`, `pasta`, `couscous`, `bulgur`, `tortilla`, `bröd`, `nudlar`, `pannkaka`, `gnocchi` | variationsregel (max 2 per typ i urvalet) |
| `freezerFriendly` | boolean, **ska stämma med `freezerStorage`** ("Fryses ej…" ⇔ `false`) | receptvy, fryst-tips i planen |
| `servedWith` | kort visningstext, t.ex. "Serveras med ris" | **endast visning** – påverkar inte inköpslista eller pris |
| `fridgeStorage` / `freezerStorage` | t.ex. `'3 dagar'`, `'3 månader'`, `'Fryses ej (gräddsås)'` | receptvy, "Förvaring" |
| `equipmentRequired` | lista | används inte i logiken |
| `ingredients` | `{ name, quantity, unit, category }` | allt som rör pris, skalning och inköpslista |
| `instructions` | lista med steg (5–10 i befintliga recept, minst 2 krävs) | receptvyn "Gör så här" |
| `image` | `/recipe-images/<id>.jpg` | receptkort, receptvy, Byt rätt-miniatyr |

### 1.2 Ingredienser, enheter och kategorier
- **Enheter** (valideras): `g kg ml l dl cl st msk tsk krm`. Vätskor anges i `ml` (grädde, mjölk, kokosmjölk, vatten och buljong visas automatiskt som dl i receptvyn). Fyra recept anger Mjölk i `dl`, vilket också fungerar eftersom inköpslistan räknar om till ml.
- **Kategorier** (valideras, styr inköpslistans sektioner): `meat` (kött, fisk, skaldjur, chark), `dairy` (mejeri och ägg), `vegetables` (grönsaker, frukt, potatis), `canned` (konserver, baljväxter, tomatpuré, kokosmjölk), `pasta` (pasta, ris, spannmål, bröd, mjöl), `pantry` (kryddor, olja, buljong, såser, socker).
- **Styckevaror ska anges i `st`** (kravet valideras): gul lök/rödlök/schalottenlök, vitlök (klyftor), ägg, citron/lime, paprika/morot, buljongtärningar.
- **Namn ska vara identiska med befintliga ingredienser.** Inköpslistan slår ihop rader på normaliserat namn (gemener, brusord som "färsk", "riven", "hackad" tas bort). Två stavningar ger två rader (t.ex. `Parmesan` och `Parmesanost`). Lista befintliga namn, enheter och kategorier innan du skriver ett nytt recept (se 2.3).
- **Samma ingrediens ska ha samma enhetsfamilj i hela biblioteket** (vikt, volym, antal, skedmått). Annars slår valideringen larm.
- **Skalning** (`ingredientRules.js`, `portionScaling.js`): upp till 6 portioner linjärt, därefter växer *kryddor/olja/soja/senap/ingefära/vitlök/buljong* i halva takten. Räknebara varor (`st`) avrundas bara för de ingredienser som finns i `COUNT_RULES`: gul lök, rödlök, schalottenlök, vitlök, morot, paprika, citron, lime, ägg, zucchini, aubergine, purjolök och buljong. **Alla andra `st`-varor skalas med decimaler** (t.ex. "1,8 st gurka" vid 7 portioner). Idag gäller det Tortillabröd, Bröd, Äpple, Gurka, Tomat, Hamburgerbröd och Färsk basilika. Använd därför för nya recept `g` för sådana varor, eller välj `st` bara när decimaler är acceptabla. Att lägga till en räknebar ingrediens är en appkodsändring och kräver Elis godkännande.
- Receptet skalas i planen till **ca 5–8 portioner per tillagningstillfälle** (idealet är 7; ibland färre). Kontrollera därför alltid mängderna vid 4, 7 och 11 portioner.

### 1.3 Priser – `src/data/referencePrices.js` och `src/utils/referencePricing.js`
- Priserna är **ungefärliga normalpriser**, inte verifierade butikspriser. Appen kallar dem uppskattningar och receptkostnader ska beskrivas så.
- En ingrediens matchas mot en produkt via `aliases` (exakt namn först, sedan delmatchning på hela ord). Flera ingredienser delar produkt: t.ex. `Kycklinglårfilé` och `Kycklingfärs` prissätts som Kycklingfilé (900 g, 100 kr), `Chorizo` som Korv, `Gnocchi` och `Spaghetti` som Pasta, `Parmesan` och `Mozzarella` som Ost, `Lime` som Citron.
- Förpackade varor köps i **hela förpackningar** (uppåt avrundat), lösviktsvaror (potatis, gul lök, morötter m.fl.) per kg, och **skedmått räknas som en hel förpackning** (för lösviktsvaror blir ett skedmått 0,5 kg; ingen nuvarande ingrediens påverkas). Matchar enhetsfamiljerna inte köps en förpackning.
- **Saknas produkten används tyst ett generiskt kategoripris** (t.ex. 25 kr för mejeri, 80 kr för protein, 20 kr för krydda). Raden får `isGenericEstimate: true` i API-svaret men **visas inte** annorlunda i appen. Valideringsskriptet och receptpoängen räknar i stället 10 kr. En saknad prismatchning syns alltså varken i UI eller i `validate:recipes`. **`npm run verify:recipe` (bilaga A) listar dem.**
- Aliasen `biff av nöt` och `grytbitar av nöt` pekar på **Högrev** (140 kr/kg). Högrev är en gryträtt med lång tillagning och **inte** en prisreferens för biff eller filé som steks snabbt. Använd inte de aliasen för sådana recept.
- Idag saknar en enda befintlig ingrediens referenspris: `Parmesanost` (i `en-riktigt-god-kottfarssas`).
- En **receptkostnad per portion** (`estimateRecipeCostPerServing`) används för poäng, budgetbyte och "liknande recept" i Byt rätt. Den är proportionell och skiljer sig från planens förpackningsbaserade totalsumma. Kostnaden som visas för användaren är alltid planens totalsumma.

### 1.4 Kostval och urval – `src/utils/selectRecipes.js`
- **Hårda filter:** `Vegetariskt` ⇒ `dietTypes` innehåller `'vegetarisk'`. `Kött & grönt` ⇒ `proteinType !== 'vegetariskt'` (alltså även fisk). `Familjevänligt` ⇒ `familyFriendly: true` (om det finns tillräckligt många). `Blandkost` ⇒ hela biblioteket.
- **Poäng:** bas 50. Bara när motsvarande kostval är valt: "Familjevänligt" ger +20 för `familyFriendly` och +10 för snabba recept (aktiv ≤ 25 och total ≤ 40 min, oavsett `familyFriendly`), "Somrigt" ger +15 för taggen `somrig`, "Proteinrikt" ger +10 för kött/fisk. Dessutom +8 per skafferiträff (max 24) och en bonus för billiga recept när budgeten är under 14 kr/portion.
- **Urval:** slumpas bland recept inom 10 poäng från bästa, med högst 2 av samma `proteinType` och 2 av samma `carbohydrateType` så länge det går. Ett nytt recept dyker alltså upp slumpmässigt i planer, och `proteinType`/`carbohydrateType`/`familyFriendly`/tider/`tags` avgör hur ofta.
- Användaren väljer 5, 7, 10 eller 14 rätter. **Poolen för varje kostval måste vara minst 14** (vegetariskt ger idag 17), annars blir planen "för få rätter". Ta aldrig bort recept så att en pool understiger det utan att fråga.

### 1.5 Planering, inköpslista och Byt rätt
- **Plan:** portionsbehov = (vuxna + 0,6 × barn) × 2 måltider/dag × dagar × 1,1. Portionerna delas på tillagningstillfällen (idealstorlek 7), och unika recept roterar. Samma recept kan alltså lagas flera gånger.
- **Inköpslista:** alla skalade recept slås ihop per normaliserat namn **och enhetsfamilj**. Bara exakta omräkningar summeras: g/kg, ml/cl/dl/l och skedmått sinsemellan (1 krm = 1 ml, 1 tsk = 5 ml, 1 msk = 15 ml). Mellan familjerna (skedmått ↔ vikt, antal ↔ skedmått, vikt ↔ volym) finns ingen säker omräkning och inga densiteter eller styckevikter hittas på, så mängderna bevaras på **separata rader** (t.ex. `Färsk basilika` i st och `Torkad basilika` i tsk). Testas i `tests/swap/shopping-list-units.test.mjs` (`npm run test:swap`). Dessutom: skafferivaror ("Har hemma") utesluts, och raderna prissätts. Totalsumman är summan av hela förpackningar, avrundad till hela kronor. Går planen över budget byts upp till 3 dyra recept mot billigare.
- **Byt rätt:** ersätter alla tillfällen av en receptplats. Kostnadsskillnaden bygger om **hela** planen med samma funktioner som själva bytet och är därför konsekvent med själva bytet (testas i `npm run test:swap`). Eftersom förhandsvisning och byte delar kod **bevisar det inte att kostnaden är rätt**: kontrollera även konkreta ingrediensmängder och inköp (se 2.5). Kandidater rangordnas med samma kostval/poäng, med litet avdrag för skillnad i pris och tid.
- Planer sparas inte hos användaren och analytics skickar inga recept-id, så att byta namn på, ändra eller ta bort ett recept påverkar inga sparade data.

### 1.6 Bilder
- Varje recept har en egen bild: `public/recipe-images/<id>.jpg`. Kedjan är: receptets egen bild → kategoribild (`pasta.jpg` m.fl.) → neutral textplatshållare med receptnamnet. Trasig bildikon visas aldrig.
- **Kategoribilderna och `fallback.jpg` finns inte i repot** (README:n påstår att de ska finnas). Ett recept utan egen bildfil visar därför receptnamnet på en färgad ruta.
- Valideringen kontrollerar att `image` börjar med `/recipe-images/` och är unik, men **inte att filen finns**. Kontrollera det själv.
- Bildkrav enligt `CLAUDE.md`: liggande JPG, helst 1200–1600 px bred, helst under ca 500 KB, kontrollerad beskärning på mobil (240 px hög ruta, `object-cover`). Godkända bilder från 2026-10 är 1536×1024 (3:2).
- `public/recipe-images/README.md` är **föråldrad** (listar 40 recept och ett äldre format). `CLAUDE.md` gäller före den.

### 1.7 Validering – `npm run validate:recipes`
Kontrollerar: obligatoriska fält, unikt id/namn/bildväg, tider, ≥ 3 ingredienser och ≥ 2 steg, giltiga enheter och kategorier, styckevaror i `st`, vegetariskt utan köttvaror, enhetsfamiljer per ingrediens i hela biblioteket, **exakt antal recept (`EXPECTED_TOTAL = 60`)**, minimiantal (vegetariska 16, kyckling 16, kött/köttfärs 13, fisk 9), minst 80 % familjevänliga och 75 % snabba. Varnar (stoppar inte) för stora portioner av ris, pasta, potatis, protein och linser, samt för kryddmängder vid 18 portioner. Idag: 0 fel, 3 varningar (vitlök vid 18 portioner).
Kontrollerar **inte**: att bildfilen finns, att ingredienser och steg stämmer, att tillbehör i `servedWith` finns bland ingredienserna, saknade priser, `st`-decimaler vid skalning eller att kostnaden är rimlig.
Lägger du till eller tar bort ett recept måste du uppdatera `EXPECTED_TOTAL` (det enda i skriptet som ingår i en receptuppgift). Underskrids ett minimiantal: fråga Elis.

---

## 2. Flödet

### 2.1 Underlag
**Gör**
- Läs hela underlaget: ingredienslista, mängder, portioner, alla steg, tider, tips, anmärkningar och tillbehör. Länkar läses med WebFetch (eller motsvarande). Kontrollera att både ingredienser **och** steg kom med.
- Går länken inte att läsa, eller läses den bara delvis (betalvägg, avkortad text, bara bild/video): **be Elis klistra in recepttexten**. Gissa aldrig innehåll.
- Sammanställ källans uppgifter separat: portioner, tid, ingredienser med mått, steg, tillbehör, förvaring.
- Kontrollera dubbletter innan du skriver något: sök i `RECIPES` på id, namn, huvudråvara och rättstyp (`grep` eller `node`). Samma rätt finns redan: rapportera det och föreslå *ändra* i stället för *lägg till*. En variant (annan huvudråvara eller tillagning): lägg till, men säg vilket befintligt recept det liknar.

**Redovisa i rapporten:** en tabell *Källans uppgift → Appens version → Varför* för varje avvikelse (portionsomräkning, utbytta ingredienser, förenklade steg, namnmappning till ingrediensregistret).

### 2.2 Receptkvalitet
Kontrollera och rätta, och redovisa det du ändrat:
- **Portioner:** appens recept ska vara för 4 portioner. Räkna om från källans portionstal. Redovisa omräkningen.
- **Mängder och enheter:** rimliga per portion. Riktvärden från valideringen (per portion): ris ≤ 80 g, pasta/nudlar ≤ 100 g, potatis ≤ 300 g, protein (kött/fisk) ≤ 170 g. Rätt enhet enligt 1.2, hela kryddmått (krm/tsk/msk), inga orimliga kryddmängder.
- **Tillagning:** steg i rätt ordning, tider, temperaturer och stekgrad realistiska och säkra (kyckling genomstekt, fisk, skaldjur, köttfärs). Tiderna `activeTimeMinutes`/`totalTimeMinutes` ska stämma med stegen.
- **Ingredienslista ⇔ steg:** allt som nämns i stegen finns i listan, och allt i listan används i något steg. Kontrollera ingrediens för ingrediens. Kryddor som bara är "smaka av" kan stå i stegen utan egen rad om närliggande recept gör så (36 av 60 listar salt).
- **Tillbehör:** allt som ingår i måltiden (ris, potatis, pasta, couscous, bulgur, bröd, sallad, sås, yoghurt) ska stå som **ingrediens med mått**, annars saknas det i inköpslistan och priset. `servedWith` är bara visningstext och ska stämma med listan. Rent valfria toppings ("gott med …") får stå i `servedWith` men prissätts inte. Säg det i rapporten.
- **Kost och förvaring:** `dietTypes`, `proteinType`, `carbohydrateType`, `familyFriendly` (barnvänligt: inte starkt, inga svåra texturer), `freezerFriendly` och förvaringstider enligt närmaste befintliga motsvarighet (grädde-, fisk- och skaldjursrätter fryses normalt inte). Konservativt vid osäkerhet.
- **Egna ord:** formulera `description` och `instructions` med egna ord. Kopiera aldrig källans text, och ta aldrig dess bilder. Ingredienser och mått är fakta och får följa källan. Mängder får anpassas.
- **Källa:** projektet har inget källfält. Skriv källa (URL, namn, åtkomstdatum) i **commit-meddelandet och rapporten**, och lägg inte till ett nytt fält utan Elis godkännande. Bildlicens dokumenteras i licenstabellen längst ned i `public/recipe-images/README.md` om en bild kommer från en extern källa.

### 2.3 Anpassning till appen
**Gör**
- Använd befintlig datastruktur (1.1). Lägg inga nya fält i recept.
- **Mappa varje ingrediens till ett befintligt namn.** Lista registret först:
  ```
  node --input-type=module -e "import('./src/data/recipes.js').then(({RECIPES})=>{const m={};for(const r of RECIPES)for(const i of r.ingredients)(m[i.name]??=new Set()).add(i.unit+'/'+i.category);for(const k of Object.keys(m).sort())console.log(k,[...m[k]].join(' '))})"
  ```
  Finns ingrediensen: använd exakt namn, enhet och kategori. Finns den inte: välj enhet och kategori enligt 1.2, och kontrollera priset (nedan).
- **Priser:** kör `npm run verify:recipe` (bilaga A) och se vilka ingredienser som matchar vilken produkt. Hitta aldrig på ett pris, lägg aldrig till en prisrad utan underlag, och markera aldrig något som "verifierat" (det finns ingen sådan markering).
  1. Ingrediensen matchar rätt produkt: klart. Redovisa produkter som delas ("`Kycklinglår` prissätts som Kycklingfilé").
  2. Ingrediensen matchar en **likvärdig** produkt via alias: lägg bara till aliaset om det är samma vara. Det är en ändring av `referencePrices.js` och redovisas separat.
  3. Ingrediensen saknar produkt och är **bisak** (krydda, en skvätt): den får falla tillbaka på det generiska kategoripriset. Redovisa den som "generiskt, ej verifierat".
  4. Ingrediensen saknar produkt och är **huvudkomponent** eller påverkar receptets kostnad väsentligt (se nedan): fråga Elis efter pris och underlag. Lägg bara till prisraden om Elis anger priset (skriv "enligt Elis, datum" i en kommentar vid raden och i commit-meddelandet).
- **Kostval:** sätt `dietTypes`/`proteinType` enligt 1.1. Vegetariska recept får inte innehålla `meat`-ingredienser. Kontrollera att receptet hamnar rätt i filtren: `Vegetariskt`, `Kött & grönt`, `Familjevänligt`, `Somrigt` (tagg `somrig`).
- **Skalning:** räkna om mängderna vid 4, 7 och 11 portioner (använd `scaleIngredient`) och kontrollera `st`-varor, vitlök, buljong och kryddor.
- Lägg till/uppdatera `EXPECTED_TOTAL` vid tillägg eller borttagning.

**Lös själv (redovisa antagandet):** `id`, ingrediensnamn och kategori, enhet, `tags`, `difficulty`, `equipmentRequired`, `mainIngredient`, förvaringstider, `description`, vilket befintligt recept som är mest likt, hur källans mått avrundas.

**Fråga Elis bara när något av detta gäller:**
- Receptet går inte att läsa i sin helhet, eller mängder/portioner är oklara på ett sätt som ändrar resultatet.
- En **huvudingrediens saknar pris** eller prismatchningen är tveksam (t.ex. kycklinglår med ben eller benfria – kontrollera **källreceptet först** – eller biff/filé, specialprodukter). *Väsentligt* = huvudkomponenten, eller ingrediensen står för mer än ca 2 kr per portion, eller den skulle ändra receptets plats bland "billiga" recept.
- Receptet kräver ändring i appkod, ingrediensregler (`COUNT_RULES`), prismotorn eller datastrukturen.
- Receptet är i praktiken en dubblett av ett befintligt, eller en borttagning gör att en filterpool, ett minimiantal eller en andel i valideringen underskrids.
- Receptet bryter mot kostvalet det ska tillhöra, eller en säkerhetsfråga (t.ex. rått ägg, ostekt fågel) går inte att lösa i texten.

### 2.4 Bilder
**Gör**
- **Återanvänd en befintlig godkänd bild** när den *faktiskt visar den färdiga rätten* (samma huvudråvara, tillagning och tillbehör). Ändras ett recept så att bilden fortfarande stämmer behålls filen. Ett *nytt* recept kan inte peka på en annan rätts fil (valideringen kräver unika bildvägar, och konventionen är att filnamnet = id): kopiera i så fall filen till `<nytt-id>.jpg` och redovisa att bilden är återanvänd. Om bilden bara liknar rätten ska den inte återanvändas.
- **Behövs ny bild:** ta fram ett komplett bildbrief (mall i 3.2) utifrån det **färdiga** receptet och bildstandarden (3.1). Skapa inga bilder själv. Bildgenerering sker i Elis separata bildchatt. Leverera receptet utan bild enbart som utkast och säg tydligt att bilden saknas: kontrollera att `image` pekar på en fil som finns, annars visas bara en textplatshållare. Säg också att den saknade bilden är det som återstår.
- **Bildstandard:** gäller den som är dokumenterad i 3.1 (Elis har godkänt stilen 2026-10-30). Avvik inte från den i briefen. Behövs ett undantag (som burgaren från lägre vinkel): skriv det som ett uttryckligt förslag i briefen och låt Elis godkänna det. Claude väljer aldrig själv mellan alternativa genererade bilder, det gör Elis i bildchatten.
- När en bild levereras: följ `CLAUDE.md` för bildfiler (JPG, 1200–1600 px, helst under ca 500 KB, ingen märkbar kvalitetsförlust, samma filnamn som `image`-fältet) och kontrollera i webbläsare: receptkort, receptvy (mobil) och Byt rätt-miniatyr, på mobil och desktop. Jämför bilden med receptets ingredienser, tillbehör och uppläggning, och rapportera avvikelser.

### 2.5 Verifiering
Följ `CLAUDE.md` ("Tester efter ändringens risk") och anpassa efter ändringen:

| Ändring | Kontroller |
|---|---|
| Nytt recept | `npm run validate:recipes` (efter `EXPECTED_TOTAL`), `npm run verify:recipe -- <id>` (bilaga A), `npm run test:swap`, webbläsare: kort, receptvy, Byt rätt-miniatyr |
| Ändrade ingredienser, mängder eller priser | som ovan. För prisändringar i `referencePrices.js`: kör planverifiering för minst 3 recept som använder varan och redovisa ändrade totalsummor |
| Ändrad text, tid, tagg, förvaring (inte ingredienser/mängder) | `npm run validate:recipes`, receptvyn i webbläsaren |
| Borttaget recept | `validate:recipes` (efter `EXPECTED_TOTAL`), sök efter id i `src`, `tests`, `scripts`, att poolerna enligt 1.4 fortfarande är ≥ 14, `git rm` på bildfilen, `npm run test:swap` |
| Bildbyte | enligt `CLAUDE.md` för rena bildändringar |

**Planverifiering (`npm run verify:recipe -- <id> …`, bilaga A):** kontrollera en genererad plan som innehåller receptet: totalsumma, inköpslista och kostnadsskillnaden vid Byt rätt (åt båda håll). **Redovisa alltid hushåll, budget och period.**
- **Konkreta mängder och inköp, inte bara att koden är konsekvent.** Förhandsvisningen av Byt rätt och själva bytet delar kod, så att de stämmer med varandra bevisar inte att kostnaden är rätt. Skriptet summerar därför varje ingrediens över alla tillfällen i planen, räknar förpackningar och kronor direkt ur prislistan och jämför rad för rad med appens inköpslista och totalsumma. Redovisa några exempelrader (behov → förpackningar → kr) ur utskriften.
- **Prisunderlag.** Ingredienser utan referenspris, som appen prissätter med ett generiskt kategoripris, redovisas under `SAKNAT PRISUNDERLAG`. Det är inte ett verifierat pris och ska stå i rapporten, med kronbeloppet som användes. Ingredienser som prissätts som en annan produkt redovisas som antagande.
- Kontrollera även att mängderna är rimliga (hela förpackningar, inga ingredienser som saknar inköpsrad, inga märkliga enheter).
- Dessutom i webbläsaren: att receptet syns i planen, att receptvyn är komplett och att inget går sönder på mobil.

Bygg (`npm run build`) bara om appkod har ändrats. `test:analytics` bara om analytics berörs.

**Separat granskning** (egen granskningsagent) när ändringen har regressionsrisk, t.ex. flera recept, ändrade priser eller aliaser, borttagningar eller allt som rör skalning/prismotor. Låt granskaren kontrollera ingredienslistan mot stegen, tillbehör, enheter, kostval och planverifieringen. Ett enskilt nytt recept som följer flödet och är verifierat behöver ingen separat granskare, men gör det om något tvivel kvarstår.

### 2.6 Leverans
1. Utgå från den **senaste gren som innehåller senaste appversionen** (`CLAUDE.md`, "Standardflöde"). `main` är inte senaste versionen. Skapa en egen feature-gren, t.ex. `feature/recept-<id>`.
2. Ändra, testa och verifiera enligt 2.5. Committa med källa och prisunderlag i meddelandet.
3. Pusha med uttryckligt grennamn: `git push -u origin <gren>:<gren>`.
4. Försök hitta Vercel Preview och byggstatus (GitHub-status/checks). Hittas ingen: skriv att den inte kunnat bekräftas.
5. Rapportera kort:
   - **Ändrat:** recept (id), filer, bild (ny/återanvänd/saknas), gren och commit.
   - **Källa → appen:** avvikelser och antaganden (2.1, 2.3).
   - **Verifierat:** `validate:recipes`, planverifiering (hushåll, budget, period, totalsumma, generiska priser, Byt rätt-skillnad), webbläsarkontroll (bredder), vad som *inte* verifierats (Preview, riktig telefon).
   - **Elis ska bedöma:** smak/recept i verkligheten, receptets bild, kostnaden på mobilen, ev. beslut jag behöver.
6. **Ingen merge till `main`, ingen Production** utan Elis godkännande.

---

## 3. Mallar

### 3.1 Bildstandard (godkänd av Elis)
**Krav:**
1. **Vinkel:** nästan rakt uppifrån. Undantag: burgaren (`husmansburgare-coleslaw.jpg`) har en redan godkänd lägre vinkel. Andra undantag föreslås i briefen och godkänns av Elis.
2. **Komposition:** hela tallriken syns, med lite bord runt omkring men utan stora tomma ytor.
3. **Ljus:** varmt, naturligt ljus.
4. **Mat:** verklighetstrogen (hemlagad, inte stiliserad).
5. **Format:** liggande. Godkända bilder är 3:2, 1536×1024. Filen i repot följer `CLAUDE.md` (JPG, 1200–1600 px bred, helst under ca 500 KB, filnamn `<id>.jpg`).
6. **Ingen text** i bilden.
7. **Bilden ska stämma med receptet:** ingredienser, tillagning och tillbehör. Allt som syns ska finnas i receptets ingredienslista och allt som ingår i måltiden (ris, potatis, couscous, sås, sallad, bröd m.m.) ska synas. Ytan, stekgraden och såsen ska motsvara stegen. Råvarudetaljer ska stämma, t.ex. långkornigt, smalt basmatiris till butter chicken och små oregelbundna bitar kycklinglårfilé i den marockanska grytan.

**Beskärning:** appen visar bilden med `object-cover`: knappt beskuren i mobilens 240 px höga ruta, men ca 5–6 % av bredden försvinner på varje sida i desktopens 4:3-kort. Håll tallriken och det viktiga inom de mittersta ca 85 % av bredden. Burgarens tallrikskant beskärs på desktop och är godkänd ändå.

**Exempel (godkända bilder i `public/recipe-images/`):** `butter-chicken.jpg`, `krispig-torsk-citronyoghurt-potatis.jpg`, `ugnsbakad-sej-medelhavsgronsaker.jpg`, `marockansk-kycklinggryta-citron-oliver.jpg`, `kycklingpaella-formenklad.jpg`, `kycklingshawarma-bulgur-yoghurtsas.jpg`, `flaskytterfile-appel-senapssas-rostad-potatis.jpg`, `kottbullar-mellanosternstil-kummin-kanel.jpg`, och som undantag `husmansburgare-coleslaw.jpg`. Titta på dem innan en brief skrivs och bifoga dem till bildchatten.

**Observerat i exemplen (inget krav, får variera):** ljus beige stenyta, rund ljus keramiktallrik, gaffel till höger, gråbeige linneduk i vänstra kanten, vattenglas uppe i högra hörnet, citron endast när citron ingår i receptet.

Bilder genereras i Elis bildchatt. Claude väljer aldrig mellan alternativa genererade bilder. `public/recipe-images/README.md` är föråldrad och ersätts av det här avsnittet och `CLAUDE.md`.

### 3.2 Bildbrief
Fylls i utifrån det färdiga receptet (efter 2.2) och skickas till Elis för bildchatten.

```
BILDBRIEF
Recept:      <namn> (id: <id>) → fil: public/recipe-images/<id>.jpg
Bild finns:  nej / ja (befintlig bild används inte för att …)

1. Rätten färdig, som den serveras (1 portion på tallriken)
   Huvudråvara och tillagning: <t.ex. panerad torsk, ugnsstekt, gyllene yta>
   Sås/vätska: <färg, konsistens, mängd, hur den ligger>
   Tillbehör som ingår i måltiden: <ris/potatis/pasta/sallad/bröd … med mängd>
   Garnityr: <endast sådant som finns i receptets ingredienslista, t.ex. persilja>
2. Råvaror som SKA synas igen: <lista ur receptet, t.ex. gröna ärtor, röd paprika>
3. Får INTE synas: <råvaror som inte ingår, fel ris/pasta, extra tillbehör, text>
4. Uppläggning: <hur komponenterna ligger på tallriken, vad som är i förgrunden>
5. Stil och teknik: enligt bildstandarden i RECEPTFLÖDE.md 3.1 (nästan rakt uppifrån,
   hela tallriken med lite bord runt men utan stora tomma ytor, varmt naturligt ljus,
   verklighetstrogen mat, liggande 3:2, 1536×1024, ingen text, viktigt inom mittersta
   ca 85 % av bredden).
   Undantag från standarden (om något): <förslag + skäl, Elis godkänner>
6. Kontroll när bilden finns: jämför ingrediens för ingrediens mot receptet,
   inga ingredienser som saknas eller är fel, rimlig portion, tillbehör med, 3:2,
   skarp på mobil.
Bifoga referensbilder: public/recipe-images/butter-chicken.jpg m.fl. (se 3.1).
```

### 3.3 Receptskelett (`src/data/recipes.js`)
```js
{
  id: 'kebab-case-ascii',
  name: 'Svenskt namn',
  description: 'En mening.',
  baseServings: 4,
  dietTypes: ['blandkost', 'kott-gront', 'proteinrikt'], // veg: ['vegetarisk', 'blandkost']
  familyFriendly: true,
  activeTimeMinutes: 20,
  totalTimeMinutes: 40,
  difficulty: 'enkel',
  tags: ['familjevänlig'],
  mainIngredient: 'huvudråvara',
  proteinType: 'kyckling',        // vegetariskt | kyckling | fisk | köttfärs | korv | nötkött | fläsk
  carbohydrateType: 'ris',        // potatis | ris | pasta | couscous | bulgur | tortilla | bröd | nudlar | pannkaka | gnocchi
  freezerFriendly: false,
  servedWith: 'Serveras med …',
  fridgeStorage: '3 dagar',
  freezerStorage: 'Fryses ej (…)',
  equipmentRequired: ['spis', 'kastrull'],
  ingredients: [
    { name: 'Befintligt namn', quantity: 400, unit: 'g', category: 'meat' },
  ],
  instructions: ['Steg 1 …', 'Steg 2 …'],
  image: '/recipe-images/<id>.jpg',
},
```

---

## 4. Kvarstående frågor och receptlogg (2026-10-30)

### Kvarstående frågor i nuvarande data (ej åtgärdade)
Befintliga avvikelser som inte orsakas av en ny receptuppgift. Redovisa dem som "fanns redan" och åtgärda dem bara efter uttrycklig uppgift.
- `Parmesanost` (i `en-riktigt-god-kottfarssas`) saknar referenspris, och `Parmesan` är en annan rad i inköpslistan.
- *Åtgärdat 2026-10-30 (`feature/fix-inkopslista-enheter`):* ingredienser med olika enheter tappade mängd i inköpslistan (Salt, Kanel, Oregano, Paprikapulver, Dijonsenap, basilika). Se 1.5. Skedmått slås nu ihop exakt och övriga mängder bevaras på egna rader.
- Styckevaror som inte är räknebara skalas med decimaler (Tortillabröd, Bröd, Äpple, Gurka, Tomat, Hamburgerbröd, Färsk basilika).
- Kategoribilderna och `fallback.jpg` finns inte. Två bilder står i stående format (`krispiga-potatistacos-bonor-vitloksyoghurt.jpg`, `kycklingwok-nudlar.jpg`), tre bildfiler används inte (`klassisk-kottfarssas.jpg`, `korv-potatismos.jpg`, `kramig-broccolipasta-citron-parmesan.jpg`) och 47 av 63 bilder är över 500 KB.
- Fem recept har `familyFriendly: true` men saknar taggen `familjevänlig` (taggen används inte).
- Tre varningar från `validate:recipes` (vitlök vid 18 portioner) och bara 5 lågprisrecept (< 14 kr/portion).
- **Osäkerheter i prisunderlaget (kvarstår, ej åtgärdade):** (a) `Färsk basilika` (st) prissätts via produkten `Basilika` (1 st = 18 kr, i praktiken en kryddburk), så 3,3 st blir 4 × 18 = 72 kr i en plan. Mängden är nu korrekt bevarad men priset är osäkert. (b) Samma vara på flera rader (t.ex. Smör 100 g + 2 msk) räknas som flera inköp. (c) Skedmått kan inte räknas om till vikt, så en vara med viktförpackning (t.ex. `Tomatpuré` 22,5 msk mot 200 g) prissätts alltid som en förpackning. Inget av detta kan avgöras utan prisunderlag från Elis.
- Prislistans alias `biff av nöt` och `grytbitar av nöt` ger Högrev-priset (se 1.3).
- `public/recipe-images/README.md` och kommentarerna överst i `recipes.js` är föråldrade.

### Receptlogg – receptuppdraget
Biblioteket har 60 recept på `feature/receptflode-dokumentation` och grenar därifrån (`main` har bara 40). Ingen annan gren och inga PR:er innehåller receptarbete som saknas här. **Inga recept har ändrats eller tagits bort än.**

**Ska tas bort senare och ersättas av de tre nya recepten nedan** (granskas inte, Elis beslut 2026-10-30):

| Befintligt recept | Notering inför borttagning |
|---|---|
| Krämig kikärtspasta (`kramig-kikartspasta`) | vegetariskt: efter borttagning 16 vegetariska = valideringens minimum; ett av de 5 lågprisrecepten |
| Kycklinggryta med dijonsenap, purjolök och grädde (`kycklinggryta-dijonsenap-purjolok`) | kyckling 18 → 17 (minimum 16) |
| Skagen-räkpasta (`skagen-rakpasta`) | fisk: efter borttagning 9 fisk = valideringens minimum |

Byts tre recept mot tre i samma uppdrag förblir `EXPECTED_TOTAL` 60. Tas de bort och läggs till i separata steg måste `EXPECTED_TOTAL` följa varje steg. Respektive bildfil tas bort med `git rm` när receptet tas bort.

**Nya recept (ej påbörjade):**

| Nytt recept | Underlag och att tänka på |
|---|---|
| Kycklinggryta med bacon | Första receptet som provar flödet. `Bacon` och `Kycklingfilé`/`Kycklinglårfilé` har referenspris. Bacon finns i `boeuf-bourguignon-formenklad` |
| Kycklinglår i ugn | **Kontrollera källreceptet först: avser det kycklinglår med ben eller benfria?** Först därefter bedöms råvara, mängd per portion och pris. `Kycklinglår` och `Kycklinglårfilé` prissätts som Kycklingfilé (benfritt, 900 g för 100 kr), och lår med ben väger mer per portion. Närmast befintliga (benfri lårfilé, ugn): `grekisk-citronkyckling-ugn-potatis`, `honungs-senapskyckling-rostad-potatis` |
| Nötköttsgryta med svamp, dijonsenap och crème fraîche | Originalet använder **biff eller filé som steks snabbt**. Behåll receptets råvara. Högrev är inte likvärdig råvara eller prisreferens för den tillagningen (lång tillagning), och aliasen `biff av nöt`/`grytbitar av nöt` får inte användas som prisunderlag. **Prisunderlag för biff/filé saknas** i `referencePrices.js`: be Elis om pris och underlag, annars redovisas `SAKNAT PRISUNDERLAG` (generiskt proteinpris 80 kr, inte verifierat). Välj ingrediensnamn som inte råkar matcha ett Högrev-alias och kontrollera med `npm run verify:recipe`. Champinjoner har referenspris och Dijonsenap prissätts som Senap |

---

## Bilaga A – Planverifieringsskript (`npm run verify:recipe`)
Skriptet `scripts/verify-recipe-plan.mjs` ändrar inga filer och behöver ingen API-nyckel. Receptet måste redan finnas i `src/data/recipes.js`.

```
npm run verify:recipe -- <recept-id> [vuxna] [barn] [period] [budget] [rätter] [kostval]
npm run verify:recipe -- en-riktigt-god-kottfarssas 2 1 "1 månad" 4000 14
npm run verify:recipe -- vegetarisk-stroganoff 3 0 "2 veckor" 2500 10 vegetariskt
```
Standard: 2 vuxna, 1 barn, "1 månad", **budget 100000 kr**, 14 rätter, inga kostval. Standardbudgeten är hög med flit: är den låg byter appen ut dyra recept mot billigare (`swapForBudget`) och receptet kan väljas bort ur planen (skriptet ger då avslutskod 1 och säger det). Ange en egen budget när du vill redovisa ett realistiskt hushåll. Period är "1 vecka", "2 veckor" eller "1 månad", rätter är 5, 7, 10 eller 14, kostval är kommaseparerade (`vegetariskt`, `kott-gront`, `blandkost`, `familjevanligt`, `proteinrikt`, `somrigt`).

**Vad det gör**
1. Genererar planer med den riktiga `/api/meal-plan`-handlern tills receptet ingår.
2. **Räknar oberoende om mängder och inköp:** summerar varje ingrediens över alla tillagningstillfällen i planen, räknar förpackningar och kronor direkt ur `REFERENCE_PRICES` och jämför rad för rad med appens inköpslista och totalsumma. Samma sak görs för planen utan receptet. Varje ingrediens (per enhetsfamilj) i planens recept måste ha en inköpsrad med rätt summerad mängd. Tappad eller felräknad mängd är FEL.
3. Kontrollerar receptets skalning med egen härledning (linjär, dämpad och räknebar) mot mängderna i planen.
4. Skriver ut för varje ingrediens: mängd vid 4/7/11 portioner, mängd i planen, vad hela planen behöver och hur inköpet räknas (t.ex. `1760 g ÷ 800 g/förp → 3 förp × 90 kr = 270 kr`).
5. **Prisunderlag:** `SAKNAT PRISUNDERLAG` (ingen referensprodukt, appen använder ett generiskt kategoripris) och "prissätts som annan produkt" (t.ex. `Nötfärs → Köttfärs`).
6. **Byt rätt** åt båda håll. Kontrollen med delad kod visar bara att förhandsvisning och byte är konsekventa. Skillnaden jämförs därför även mot de oberoende totalsummorna.
7. Bildfilen: att `image` är `/recipe-images/<id>.jpg`, att filen finns och dess storlek.

**Utfall:** `FEL` ger avslutskod 1: okänt id, bildfil saknas, mängd, skalning eller kostnad avviker från den oberoende uträkningen, en ingrediens saknar inköpsrad, Byt rätt-skillnaden stämmer inte. `SAKNAT PRISUNDERLAG`, prisantaganden och `ATT BEDÖMA/REDOVISA` ger avslutskod 0 men **ska stå i rapporten**. Det senare gäller decimaler på styckevaror, samma vara på flera rader och bild över ca 500 KB.

**Begränsningar**
- Prislistan (`REFERENCE_PRICES`, `GENERIC_CATEGORY_PRICES`) och produktmatchningen (`findReferenceProduct`, namnnormaliseringen) delas medvetet med appen. Skriptet visar vilken produkt varje ingrediens matchar, men om priserna i sig är rimliga kräver underlag och kontrolleras inte.
- Skafferifunktionen ("Har hemma") testas inte.
- Skalnings- och avrundningskontrollen gäller bara mängderna i det aktuella receptet vid de portionstal planen ger. Ett fel i en avrundningsregel syns bara om receptet berör det.
- Mängder jämförs per (normaliserat namn, enhetsfamilj); skedmått jämförs exakt via volymmåtten. Att samma vara ligger på flera rader redovisas som `ATT BEDÖMA`, eftersom priset då kan räknas som flera inköp.

**Provkört 2026-10-30:** sju recept (kött, kyckling, fisk, vegetariskt och burgare, med olika hushåll, perioder och kostval) stämde rad för rad och i total mot den oberoende uträkningen. Granskaren (separat agent) och jag körde följande avsiktligt införda fel i appens kod på kopior eller tillfälligt med omedelbar återställning, och skriptet gav avslutskod 1 för alla: `Math.ceil` → `Math.floor` för förpackningar, 150 g → 100 g per styck lösvikt, fel `dl`-konstant, `Math.round` → `Math.floor` på totalsumman, Byt rätt-skillnaden +1, sammanslagning som tappar mängd, saknad inköpsrad, fel dämpningstakt och uppåtavrundning av räknebara varor (den sista syns bara för recept med mängder som påverkas). Ett ändrat generiskt proteinpris upptäcks inte, eftersom prislistan delas.

Skriptet ersätter inte webbläsarkontrollen (kort, receptvy, Byt rätt-miniatyr på mobil och desktop), `npm run validate:recipes`, `npm run test:swap` eller innehållsgranskningen av ingredienslista mot steg.
