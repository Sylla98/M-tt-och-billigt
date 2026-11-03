# Testrunda: extern test med svenska hushåll

Den här filen beskriver hur den första externa testomgången av Mätt & Billigt är tänkt att fungera, vad som sparas, var feedbacksvaren hamnar och vad ägaren (Elis) behöver ordna före testet. Status för det som är verifierat och inte verifierat står i leveransrapporten för grenen `feature/testklar-extern-testomgang`.

## 1. Vad testaren kan göra
1. Öppna länken → startsidan → **Skapa min matplan** (4 steg: hushåll, period och budget, kostval, antal rätter, sedan Generera).
2. Läsa planen och trycka **Visa recept** (öppnas under kortet på mobil och i en ruta på desktop).
3. Trycka **Byt rätt**, se kostnadsskillnaden för hela planen och välja ett annat recept.
4. Använda **Inköpslistan**: bocka av varor, och **Kopiera listan** (kopierar de varor som inte är avbockade som text, för anteckningar eller ett meddelande).
5. Trycka **Lämna feedback** (längst ned på planen, och som länk **Feedback** i sidfoten på alla sidor) och svara på tre korta frågor.

Allt fungerar även om testaren avböjer statistik.

### Förslag på text att skicka till testare
> Hej! Testa Mätt & Billigt: [länk]. Skapa en matplan för ditt hushåll, byt någon rätt du inte gillar och titta på inköpslistan. Priserna är uppskattningar, inte en kassakvitto. Planen och listan sparas i din webbläsare, så du kan stänga sidan och komma tillbaka för att handla (samma webbläsare och enhet). När du är klar: tryck på "Lämna feedback" längst ned (3 korta frågor, inget konto behövs).

## 2. Sparad plan och inköpslista
- Planen, inköpslistan, bytena och avbockningarna sparas **i testarens webbläsare** (`localStorage`, nyckeln `mb_saved_plan_v1`). Inget skickas till servern. Det fungerar även när statistik är avböjd.
- Om testaren laddar om sidan, stänger fliken eller kommer tillbaka via startsidan → **Skapa min matplan** visas samma plan igen, med en rad "Din sparade plan från …". Avbockningarna finns kvar.
- Planen finns **bara i den webbläsaren på den enheten** och sparas i högst 30 dagar. Den följer inte med till en annan telefon, och försvinner om webbläsarens data rensas, i privat läge när fliken stängs, eller om webbläsaren blockerar lagring. För att flytta listan mellan enheter: **Kopiera listan** och skicka texten.
- **Ny plan** frågar först ("Skapa en ny matplan? …") och tar sedan bort den sparade planen.
- Vid inläsning byggs planen om med den version av appen som körs (samma beräkning som "Byt rätt"), så summor och kostnadsskillnader stämmer. Hänvisar en sparad plan till ett recept som inte finns längre, eller är den för gammal eller trasig, visas formuläret i stället.

## 3. Feedback: var svaren hamnar
Sidan `/feedback` har tre frågor (vad hann du använda, var något oklart/fel/svårt, vill du använda appen nästa gång och varför), utan konto, namn eller e-post. Svaret skickas från appens server till en mottagare som **du konfigurerar**. Appen sparar inget själv, loggar inte svarstexten och skickar inget till statistiktjänsten.

**Så länge ingen mottagare är konfigurerad** visar `/feedback` bara det befintliga Google Formuläret (`https://forms.gle/M5PvhoAFESmbyxZh7`) i en ny flik. Det formuläret har jag inte kunnat öppna eller se frågorna i (se leveransrapporten), så kontrollera själv att det ställer de tre frågorna och att du kan läsa svaren.

### Så här aktiverar du det egna formuläret (gratis, med ditt Google-konto)
1. Skapa ett nytt **Google Kalkylark** (t.ex. "Mätt & Billigt feedback").
2. **Tillägg → Apps Script**. Ersätt innehållet med:
   ```js
   // Tar emot feedback från Mätt & Billigt och lägger en rad i bladet "Svar".
   function safe(v) {
     v = (v === null || v === undefined) ? '' : String(v);
     return /^[=+\-@]/.test(v) ? "'" + v : v; // hindrar att fritext tolkas som kalkylarksformel
   }
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     var ss = SpreadsheetApp.getActiveSpreadsheet();
     var sh = ss.getSheetByName('Svar') || ss.insertSheet('Svar');
     if (sh.getLastRow() === 0) {
       sh.appendRow(['Tid', 'Version', 'Miljö', 'Enhet', 'Hann använda', 'Oklart/fel/svårt', 'Använda nästa gång?', 'Varför']);
     }
     sh.appendRow([d.receivedAt, d.build, d.environment, d.device, d.used, d.unclear, d.nextTime, d.nextTimeWhy].map(safe));
     return ContentService.createTextOutput('ok');
   }
   ```
3. **Distribuera → Ny distribution → Typ: Webbapp.** Kör som: **Jag**. Vem som har åtkomst: **Alla**. Kopiera **webbappens URL** (börjar med `https://script.google.com/macros/s/…/exec`). Den adressen är hemlig: dela den inte.
4. I **Vercel → projektet → Settings → Environment Variables**: lägg till `FEEDBACK_WEBHOOK_URL` = webbappens URL, för **Preview** (och Production om den ska användas där). Gör en **ny deploy**: en ändrad variabel gäller bara nya deployer.
5. **Testa:** öppna `/feedback` på den nya deployen och skicka ett svar där du skriver `TESTSVAR` i fritextfältet. Raden ska dyka upp i kalkylarkets blad "Svar" inom några sekunder. Radera testraden efteråt.
- **Var du läser svaren:** i kalkylarket, bladet "Svar". Kolumnen "Version" är de sju första tecknen i commit-id:t för den deploy som svaret kom ifrån, "Miljö" är `preview` eller `production`, "Enhet" är `mobil` eller `dator`.
- Går det inte att skicka (mottagaren nere, fel URL) visar formuläret ett felmeddelande med en länk till Google Formuläret, och inget går förlorat för testaren.
- Svar skickas inte vidare om ett dolt skriptfält är ifyllt, och en IP-adress får högst 8 svar per tio minuter.
- Vill du använda en annan mottagare (t.ex. en e-posttjänst): `FEEDBACK_WEBHOOK_URL` tar emot vilken https-adress som helst som accepterar en JSON-POST med fälten `receivedAt, build, environment, device, used, usedKeys, unclear, nextTime, nextTimeWhy`. Lägg inte till ett betalt verktyg utan att bestämma det först.

## 4. Preview och åtkomst för externa testare
- Vercels Preview-deployer är som standard ofta skyddade av Vercel Authentication, så att den som inte är inloggad hos Vercel inte kommer in. **Kontrollera att en utloggad person kan öppna länken** (t.ex. i ett privat webbläsarfönster eller på en annan telefon). Behöver du släppa in externa testare: Vercel → projektet → Settings → Deployment Protection (stäng av för Preview, eller använd en delbar länk / "Protection Bypass"). Det är en ändring av åtkomstskydd som du gör själv; jag har inte ändrat något.
- Använd **commit-specifik** deploy-adress (eller en domän du kontrollerar) när du skickar ut länken. Grenens "senaste"-adress ändras vid varje push.
- För att hålla versionen **oförändrad under testomgången**: pusha inte fler commits till grenen och mergea inte den. Behövs en rättelse mitt i: gör den på en ny gren och bestäm själv om testarna ska flyttas.

## 5. Känt och bra att veta (ingen åtgärd gjord)
- **Kostnaderna är uppskattningar** utifrån generella svenska priser och räknas på **hela förpackningar**. För små hushåll (t.ex. en person, en vecka) blir kostnaden per portion hög eftersom många olika varor köps i hela förpackningar, och en rätt kan få bara 2 portioner. Det är så modellen är byggd, inte ett fel, men testare kan reagera på det.
- Färsk basilika och andra varor utan verifierat pris prissätts med generiska kategoripriser (se `RECEPTFLÖDE.md`).
- Typsnitt hämtas från Fontshare (oavsett statistikval, står i integritetstexten).
- **Integritetssidan är ett utkast** (se kommentaren överst i `src/app/integritet/page.js`): bekräfta punkterna där, bland annat PostHogs IP-hantering, hosting och logghantering hos Vercel, och vilken tjänst som tar emot feedbacksvaren, innan externa tester.
- `NEXT_PUBLIC_ENABLE_ANALYTICS` styr om statistikvalet visas. Ska testdata inte blandas med riktig statistik: använd ett eget PostHog-projekt/nyckel för Preview.

## 6. Checklista för dig före första testet
- [ ] `FEEDBACK_WEBHOOK_URL` satt i Vercel (Preview) och ny deploy gjord, och ett `TESTSVAR` har dykt upp i kalkylarket (avsnitt 3). Annars används Google Formuläret: kontrollera dess frågor och att du kan läsa svaren.
- [ ] En utloggad person har öppnat Preview-länken (avsnitt 4).
- [ ] Integritetssidans utkast är granskat (avsnitt 5).
- [ ] Du har öppnat länken på din egen telefon och gått igenom flödet (planera → byt rätt → lista → feedback).
