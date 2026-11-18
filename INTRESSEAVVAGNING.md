# Rättslig grund och intresseavvägning – underlag för granskning

Upprättad 18 november 2026 som **förslag** för Elis Sylla Sundins granskning (personuppgiftsansvarig). Det här är ingen juridisk rådgivning, och tekniska tester visar bara hur appen beter sig, inte att den uppfyller dataskyddsreglerna.

Integritetssidan (`src/app/integritet/page.js`, avsnittet "Ändamål och rättslig grund") anger:
- **Samtycke** för produktstatistiken (PostHog).
- **Intresseavvägning** för behandlingarna nedan.

## Källor (lästa 18 november 2026)
- **IMY, intresseavvägning:** https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/intresseavvagning/ – behandlingen ska vara nödvändig för ett berättigat intresse, och den registrerades intressen får inte väga tyngre. Ordagrant: "Om det är möjligt att uppnå samma resultat på ett mindre integritetskänsligt sätt, så kan ni inte stödja en personuppgiftsbehandling på en intresseavvägning." Bedömningen ska dokumenteras.
- **IMY, känsliga personuppgifter:** https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/introduktion-till-gdpr/personuppgifter/kansliga-personuppgifter/ – omfattar bland annat hälsa ("alla aspekter av en persons hälsa") och religiös eller filosofisk övertygelse.
- **IMY, när känsliga personuppgifter får behandlas:** …/kansliga-personuppgifter/nar-far-ni-behandla-kansliga-personuppgifter/ – huvudregeln är förbud, med undantag.
- **IMY, de registrerades rättigheter:** https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/de-registrerades-rattigheter/ – rätten att invända, och svar senast inom en månad.
- **EDPB, riktlinjer 2/2019 om artikel 6.1 b (avtal), svensk version, punkt 26:** https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_sv
- **Lagen (2022:482) om elektronisk kommunikation (LEK), 9 kap. 28 §:** https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2022482-om-elektronisk-kommunikation_sfs-2022-482/
- **PTS, kakor:** https://www.pts.se/internet-och-telefoni/kakor-cookies/
- **EDPB, riktlinjer 2/2023 om den tekniska räckvidden av artikel 5.3 i ePrivacy-direktivet:** nämner uttryckligen "local storage" bland de lagringsformer som omfattas.

## Avtal som rättslig grund
Att appen saknar konto och skrivna användarvillkor visar inte ensamt att avtal saknas. Ett avtal kan uppstå på andra sätt.

Enligt EDPB (2/2019, punkt 26) kan den personuppgiftsansvarige stödja sig på avtal bara om hen kan visa tre saker:
- att ett avtal existerar,
- att det är giltigt enligt tillämplig nationell avtalsrätt,
- att behandlingen objektivt sett är nödvändig för att fullgöra avtalet.

Annars "bör den personuppgiftsansvarige överväga att använda en annan rättslig grund".

För en kostnadsfri, anonym webbtjänst utan konto är det osäkert om och när ett sådant avtal uppstår, och det har inte bedömts enligt svensk avtalsrätt. Förslaget är därför att använda intresseavvägning, där grunden kan dokumenteras med bedömningarna nedan, i stället för att bygga på ett avtal som inte går att visa. Det här är en bedömning för Elis att ta ställning till, inte ett konstaterande att avtal är uteslutet. Inga nya villkor eller konton föreslås.

## 1. Visa appen och skydda den (Vercel, räknaren mot överbelastning)
- **Uppgifter:** IP-adress, ort och land som Vercel härleder ur den, och teknisk information om webbläsaren.
  - Vercels körloggar sparas en timme på Hobby.
  - Räknaren per IP-adress hålls i serverns minne och gäller de senaste tio minuterna.
  - Vid oväntade fel loggas bara feltypen.
- **Berättigat intresse:** att kunna leverera sidorna som besökaren själv öppnar och skydda tjänsten mot överbelastning.
- **Nödvändighet:** en webbsida kan inte levereras utan IP-adress. Räknaren behövs för att begränsa missbruk av plan-API:et. Inga uppgifter sparas i databas, och loggarna innehåller ingen indata.
- **Avvägning:** besökare räknar med att en webbplats tar emot IP-adressen. Lagringen är kort, och ingen profilering sker.
- **Förslag:** intresseavvägning.

## 2. Räkna ut matplanen
- **Uppgifter:** antal vuxna och barn, period, budget, kostval, skafferitext och antal rätter, tillsammans med IP-adressen i anropet.
  - Servern använder uppgifterna bara under uträkningen och sparar dem inte.
  - Svaret, inklusive skafferitexten och budgeten, sparas sedan i besökarens webbläsare (se avsnitt 3).
- **Berättigat intresse:** att ge besökaren den plan hen ber om.
- **Nödvändighet:** utan uppgifterna går planen inte att räkna ut.

### Kan behandlingen omfatta känsliga personuppgifter?
Kontrollerat i koden (`src/components/InputForm.js`, `src/app/api/meal-plan/route.js`):
- **Kostval:** appen har bara de fasta valen *Blandkost, Kött & grönt, Vegetariskt* och *Familjevänligt, Proteinrikt, Somrigt & fräscht*. Det finns inga val för allergier, intoleranser, specialkost av medicinska skäl eller religiösa kostregler, och appen frågar inte varför någon väljer något.
  - Det här är vanliga matpreferenser, inte uppgifter om hälsa.
  - Valet *Vegetariskt* skulle i enstaka fall kunna hänga ihop med en filosofisk eller religiös övertygelse. Appen frågar dock inte om skälet, sparar inte valet på servern och gör ingen profilering. Bedömningen är att valet inte i sig avslöjar en sådan övertygelse.
- **Fritext:** det enda fritextfältet är skafferiet ("Har ni något hemma?", frivilligt, platshållare "Ris, pasta, kryddor, olja", högst 500 tecken).
  - Fältet efterfrågar matvaror, men en besökare kan själv skriva till exempel "glutenfri pasta, son har celiaki". Det vore en uppgift om hälsa.
  - Text som "laktosfri mjölk" utan någon koppling till en person eller ett skäl är däremot en matvara.
- **Brist:** appen kan ta emot hälsouppgifter som besökaren själv skriver in, utan att någon artikel 9-grund har bedömts. Risken är låg men verklig:
  - fältet efterfrågar inte sådant,
  - servern sparar inte texten,
  - texten sparas bara i besökarens egen webbläsare.
- **Minsta lämpliga åtgärd (genomförd):**
  - Hjälptexten vid skafferifältet lyder: "Det du har hemma tas bort från inköpslistan. Skriv bara matvaror, inte hälsouppgifter eller andra personuppgifter." Den är kopplad till fältet med `aria-describedby`.
  - Integritetssidan avråder från hälsouppgifter i skafferifältet och i feedbackformuläret.
  - Kvar för Elis: samma rad i Google Formulärets beskrivning (avsnitt 5).
  - Ett allmänt samtycke föreslås inte. Appen ska inte samla in hälsouppgifter, så rätt åtgärd är att avråda från dem, inte att be om samtycke till dem.
- **Förslag:** intresseavvägning för de vanliga uppgifterna, med åtgärderna ovan för fritexten.

## 3. Lagring i webbläsaren
LEK 9 kap. 28 § kräver samtycke för att lagra uppgifter i användarens terminalutrustning (EDPB 2/2023 räknar local storage hit), med två undantag. Det relevanta undantaget är lagring som "är nödvändig för tillhandahållande av en tjänst på uttrycklig begäran av användaren". Enligt PTS ska lagringen behövas "för att en tjänst som användaren begär ska fungera", och PTS ger varukorgen i en nätbutik som exempel.

Att uppgifterna stannar på enheten är inte i sig ett undantag. Undantaget hänger på att lagringen behövs för en funktion som besökaren själv har begärt. Oavsett undantaget gäller informationskravet: användaren ska få veta ändamål och hur länge varje uppgift sparas.

GDPR gäller parallellt. Uppgifterna lämnar aldrig besökarens enhet och behandlas inte av Elis. GDPR-grunden för att appens kod sparar dem föreslås vara intresseavvägning, av samma skäl som nedan.

### 3a. Statistikvalet (`mb_analytics_consent`)
- **Vad:** värdet "granted" eller "declined". Inget annat.
- **Varför det behövs:** besökaren har själv gjort ett val i statistikpanelen. Valet måste sparas för att respekteras: annars skulle panelen visas igen vid varje sidvisning, och ett nej skulle inte gälla vid nästa besök. Lagringen är också förutsättningen för att PostHog inte laddas efter ett nej.
- **Omfattning och tid:**
  - Bara ett av två värden sparas.
  - Det sparas tills besökaren ändrar valet ("Ändra val för statistik") eller rensar webbläsarens data. Någon automatisk utgång finns inte.
- **Att granska:** den obegränsade tiden. Det finns ingen svensk regel om exakt tid, men ett tidsgränsat val (till exempel tolv månader, varefter frågan ställs igen) begränsar lagringen mer. Det vore en kodändring, så den kräver ditt beslut.
- **Bedömning:** undantaget i 28 § bör vara tillämpligt, eftersom lagringen behövs för att besökarens eget uttryckliga val ska gälla. Integritetssidan anger nu ändamål och lagringstid.

### 3b. Den sparade planen (`mb_saved_plan_v1`)
- **Vad:** planen (recepten och mängderna), inköpslistan, avbockningarna och tidpunkten. Dessutom besökarens indata från formuläret, inklusive skafferitexten och budgeten, eftersom planen byggs om från dem vid nästa besök.
- **Varför det behövs:** appens kärnfunktion är en matplan med en inköpslista som besökaren använder när hen handlar, ofta vid ett senare tillfälle och på en annan plats än där planen skapades.
  - Avbockningarna har bara värde om de finns kvar mellan besöken. Det motsvarar PTS exempel med varukorgen.
  - Planen sparas när besökaren själv har begärt en plan. Inget sparas innan dess.
- **Tid:** högst 30 dagar, vilket motsvarar den längsta planperiod appen erbjuder ("1 månad"; övriga val är 1 och 2 veckor). En äldre plan används inte och raderas nästa gång planeringen öppnas. Planen raderas också vid "Ny plan".
- **Svag punkt:** planen sparas automatiskt, utan ett eget klick på "Spara". Det kan ifrågasättas om varaktig lagring är del av det besökaren "uttryckligen" begärt, till exempel på en delad dator.
  - **Det som talar för undantaget:** inköpslistan är själva tjänsten och används under planperioden. Sidan visar tydligt "Din sparade plan från …", och integritetssidan beskriver lagringen.
  - **Alternativ:** om du vill minska risken är ett eget "Spara planen"-val eller en kortare tid de minsta ändringarna. Båda är funktionsändringar och föreslås inte utan ditt beslut.
- **Bedömning:** undantaget bör vara tillämpligt för planen under planperioden. Det är en bedömning, inte ett konstaterande.

## 4. Typsnitt (genomförd lösning: alternativ b)
- **Lösning:**
  - Vid varje bygge hämtar `scripts/fetch-fonts.mjs` Fontshares officiella paket för Satoshi, från `https://api.fontshare.com/v2/fonts/download/satoshi`. Det är samma adress som "Download Family" på fontshare.com använder.
  - Skriptet packar upp de oförändrade webbfilerna (woff2 och woff, vikterna 400, 500, 700 och 900) och licenstexten `FFL.txt` till `public/fonts/satoshi/`.
  - Mappen är utesluten i `.gitignore`, så filerna checkas aldrig in i det publika repot.
  - Appen serverar filerna från sin egen domän via `@font-face` i `src/app/globals.css`.
  - Rubrikerna använder systemtypsnittet Georgia. Boska laddas inte.
- **Licens (ITF Free Font License 2.0, 17 augusti 2026):**
  - Avsnitt 01 tillåter uttryckligen egen hosting för den egna webbplatsen med `@font-face`.
  - Avsnitt 02 förbjuder att filerna görs tillgängliga i publika repositories och att de ändras eller konverteras. Det följs:
    - filerna finns inte i repot,
    - de kopieras byte för byte ur det officiella paketet,
    - inget konverteras, beskärs eller döps om.
- **Om hämtningen misslyckas:** skriptet avslutas med felkod och ett tydligt meddelande, så att bygget stoppas.
- **Personuppgifter:** besökarens webbläsare kontaktar inte längre Fontshare. Typsnittet levereras av Vercel tillsammans med sidorna och omfattas av avsnitt 1. Den tidigare svaga punkten, att samma resultat kunde nås på ett mindre integritetskänsligt sätt, är därmed åtgärdad.

## 5. Feedback via Google Formulär
- **Uppgifter:** det besökaren själv skriver i formuläret. Bekräftat 18 november 2026:
  - Formuläret samlar inte in e-postadress.
  - Det kräver ingen inloggning.
  - Bara Elis har tillgång till svaren.
- **Berättigat intresse:** att förbättra appen utifrån synpunkter som besökaren frivilligt lämnar.
- **Nödvändighet:** utan svaren går synpunkterna inte att ta till vara.
- **Känsliga uppgifter:** fritextsvar kan innehålla hälsouppgifter, till exempel om allergier i familjen. Integritetssidan avråder från det. Föreslagen åtgärd: samma rad i formulärets beskrivning, och att sådana uppgifter raderas när de upptäcks.
- **Lagringstid, förslag 90 dagar:** svaren raderas manuellt senast 90 dagar efter att de kommit in.
  - Google Formulär har ingen automatisk radering. Enligt Googles hjälp raderar formulärägaren svaren själv.
  - Svar som har kopierats till ett länkat kalkylark eller laddats ned finns kvar där tills de raderas separat.
  - Integritetssidan anger 90 dagar som manuell radering, inte som automatisk.
- **Rutin som återstår att etablera:**
  - en återkommande påminnelse, till exempel första måndagen varje månad,
  - då raderas svar äldre än 90 dagar i Formulär och i ett eventuellt länkat kalkylark,
  - nedladdade kopior raderas,
  - Rutinen finns inte förrän du har lagt in påminnelsen.
- **Googles egen behandling:** Google behandlar IP-adress, webbläsare och enhet enligt sin integritetspolicy. Enligt Google sker behandlingen på servrar i hela världen, med EU–US Data Privacy Framework och standardavtalsklausuler (policies.google.com/privacy/frameworks). Den styrs inte av appen och ingår inte i den här avvägningen.
- **Förslag:** intresseavvägning.

## Rätt att invända
Vid intresseavvägning har den registrerade rätt att invända mot behandlingen av sina uppgifter. Detta enligt IMY, de registrerades rättigheter.
- **Kontaktväg:** e-post till kontakt.mattochbilligt@gmail.com, som integritetssidan anger.
- **Bedömning av en invändning:**
  - Behandlingen får bara fortsätta om Elis kan visa avgörande berättigade skäl som väger tyngre än personens intressen, rättigheter och friheter, eller om den behövs för att fastställa, utöva eller försvara rättsliga anspråk. Annars upphör behandlingen av den personens uppgifter.
  - Svar ska lämnas så snart som möjligt och senast inom en månad. Tiden kan förlängas med två månader, men då ska personen informeras om förlängningen och skälet inom den första månaden.
- **Praktiska följder, som komplement till rättigheten:**
  - Uppgifter som redan har behandlats kan raderas där Elis har tillgång till dem, till exempel feedbacksvar.
  - Vissa tekniska behandlingar, som att leverera en sida till en IP-adress, går inte att stoppa för en enskild besökare medan hen använder appen. Det framgår av bedömningen ovan.
  - Statistik styrs av samtycket och återkallas med "Ändra val för statistik".

## Återkallelse av samtycke till statistik (PTS)
PTS skriver att användaren ska kunna återkalla sitt samtycke "när som helst", att det ska vara "lika enkelt att återkalla samtycket som det var att ge det", och att möjligheten att återkalla "ska ligga högt upp på sidan. Användaren ska inte behöva scrolla eller leta". GDPR artikel 7.3 kräver också att samtycket ska vara lika lätt att återkalla som att ge.

PTS vägledning gäller kakor enligt LEK 9 kap. 28 §. PostHog körs utan cookies och lagring, men läser teknisk information från enheten, till exempel skärmstorlek och språk. EDPB 2/2023 räknar även sådan åtkomst till information i terminalutrustningen till artikel 5.3. Kravet bör därför antas gälla.

- **Före rättelsen:** samtycket gavs i en panel som visas direkt vid första besöket. Återkallelsen fanns bara som länken "Ändra val för statistik" i sidfoten och på integritetssidan, så på mobil och på långa sidor måste användaren scrolla. Det var en konkret brist mot PTS vägledning.
- **Genomförd rättelse (minsta möjliga):**
  - Medan statistik är tillåten visas knappen "Ändra statistikval" fast högst upp på alla sidor (`src/components/ConsentQuickButton.js`, renderas tillsammans med statistikpanelen i `src/app/providers.js`).
  - Den öppnar samma panel med samma likvärdiga val. Ingen samtyckeslogik är ändrad.
  - Placering:
    - smal skärm: direkt under feedbackknappen,
    - 600–767 px: centrerad under den,
    - bredare: bredvid den,
    - startsidan: under feedbackknappen i dess oliv- och gräddvita stil.
  - Den ligger i den del av skärmen som receptvyn och Byt rätt lämnar fri och över deras bakgrund, så den nås även när de är öppna.
  - Efter ett nej försvinner knappen. Valet kan då ändras via sidfoten eller integritetssidan.
  - Sidfotslänken finns kvar.
- **Kontrollerat i webbläsare (lokal produktionsserver, 320–1440 px):**
  - synlig utan scroll på alla sidor, inget sidledsöverflöd och ingen överlappning med varumärke, "Lämna feedback", "Ny plan" eller "Till planeringen",
  - nåbar och klickbar med receptvyn (desktop) och Byt rätt (mobil) öppna,
  - nåbar med Tab, med synlig fokusring, och öppnar panelen med Enter; fokus återgår till knappen när panelen stängs,
  - efter nej skickas inga nya händelser, valet består efter omladdning, och den sparade planen och avbockningarna påverkas inte.

## Verkliga hinder och dokumentationsrättningar
**Verkliga hinder före lansering:** inga kvar i det här underlaget.

**Åtgärdat:**
- Fontshare-hindret (avsnitt 4, alternativ b genomfört).
- Hjälptexten vid skafferifältet (avsnitt 2).
- Återkallelsen av statistiksamtycket: "Ändra statistikval" högst upp på alla sidor.

**Rutin att etablera:**
- Påminnelse för manuell 90-dagarsradering av feedback.
- En rad om hälsouppgifter i formulärets beskrivning (avsnitt 5).

**Ställningstaganden som inte stoppar lanseringen tekniskt:**
- Intresseavvägning i stället för avtal.
- Den automatiska planlagringen (3b).
- Statistikvalet utan utgångstid (3a).
