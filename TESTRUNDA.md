# Testrunda: extern test med svenska hushåll

Den här filen beskriver hur den första externa testomgången av Mätt & Billigt är tänkt att fungera, vad som sparas, hur feedback lämnas och vad ägaren (Elis) behöver kontrollera före teststart. Vad som är verifierat och inte verifierat står i leveransrapporten för grenen.

## 1. Vad testaren kan göra
1. Öppna länken → startsidan → **Skapa min matplan** (4 steg: hushåll, period och budget, kostval, antal rätter, sedan Generera).
2. Läsa planen och trycka **Visa recept** (öppnas under kortet på mobil och i en ruta på desktop).
3. Trycka **Byt rätt**, se kostnadsskillnaden för hela planen och välja ett annat recept.
4. Använda **Inköpslistan**: bocka av varor, och **Kopiera listan** (kopierar de varor som inte är avbockade som text, för anteckningar eller ett meddelande).
5. Lämna feedback när som helst via den fasta knappen **Lämna feedback ↗** längst upp i mitten (startsidan och genom hela planeringen: stegen, resultatet, recepten, Byt rätt och inköpslistan). Den följer med vid scroll och är tryckbar även med receptvyn eller Byt rätt öppen. Dessutom finns knappen **Lämna feedback** längst ned på planen och länken **Feedback (Google Formulär)** i sidfoten på planeringssidan.

Allt fungerar även om testaren avböjer statistik.

### Förslag på text att skicka till testare
> Hej! Testa Mätt & Billigt: [länk]. Skapa en matplan för ditt hushåll, byt någon rätt du inte gillar och titta på inköpslistan. Priserna är uppskattningar, inte ett kassakvitto. Planen och listan sparas i din webbläsare, så du kan stänga sidan och komma tillbaka för att handla (samma webbläsare och enhet). När du är klar: tryck på "Lämna feedback", så öppnas ett Google Formulär i en ny flik.

## 2. Sparad plan och inköpslista
- Planen, inköpslistan, bytena och avbockningarna sparas **i testarens webbläsare** (`localStorage`, nyckeln `mb_saved_plan_v1`). Inget skickas till servern. Det fungerar även när statistik är avböjd, och samtyckesvalet påverkas inte.
- Om testaren laddar om sidan, stänger fliken eller kommer tillbaka via startsidan → **Skapa min matplan** visas samma plan igen, med en rad "Din sparade plan från …". Avbockningarna finns kvar.
- Planen finns **bara i den webbläsaren på den enheten** och sparas i högst 30 dagar. Den följer inte med till en annan telefon, och försvinner om webbläsarens data rensas, i privat läge när fliken stängs, eller om webbläsaren blockerar lagring. För att flytta listan mellan enheter: **Kopiera listan** och skicka texten.
- **Ny plan** frågar först med en bekräftelse i sidan (knapparna "Skapa ny plan" och "Behåll min plan") och tar sedan bort den sparade planen. Två flikar i samma webbläsare delar samma sparade plan och kan skriva över varandra.
- Vid inläsning byggs planen om med den version av appen som körs (samma beräkning som "Byt rätt"), så summor och kostnadsskillnader stämmer. Hänvisar en sparad plan till ett recept som inte finns längre, eller är den för gammal eller trasig, visas formuläret i stället.

## 3. Feedback
- Feedback lämnas **enbart via det befintliga Google Formuläret** (`https://forms.gle/GEG39fV4MtKDkPbs5`, definierat i `src/utils/feedbackLink.js`). Länken öppnas i en ny flik och är märkt "Öppnas i Google Formulär i en ny flik".
- Den fasta knappen är liten och ska inte ta över: sekundär stil, den öppnar inget av sig själv och skickar inget till statistik. Den ligger i toppradens höjd, centrerad mellan logotypen och "Ny plan" (med hänsyn till mobilens safe area), alltid på samma plats. Modalerna lämnar fritt ovanför sig. På pekskärmar döljs den medan ett textfält har fokus (tangentbordet uppe) och visas igen när fokus lämnar fältet. På mycket smala skärmar (320 px) är avståndet till logotypen bara någon pixel och pilen är dold.
- På mobil ligger sidfotslänken längst ned på planeringssidan. Medan det första statistikvalet visas (fast panel längst ned) lämnar sidan extra plats under sidfoten, så länken går att scrolla fram ovanför panelen. Knappen "Lämna feedback" i resultatvyn är den mest synliga vägen.
- Appen tar inte emot, sparar eller skickar vidare några feedbacksvar själv, och inget går till statistiktjänsten. Det finns ingen mottagare att konfigurera i appen eller i Vercel.
- Svaren läser du i Google Formulär (fliken Svar) med det Google-konto som äger formuläret.
- Formulärets innehåll (frågor och tackmeddelande) styr du i Google Formulär. Enligt dig har det uppdaterats till fem frågor och ett tackmeddelande. Jag har inte kunnat öppna formuläret härifrån och har inte verifierat dess frågor, inställningar eller att svar kommer fram.

## 4. Preview och åtkomst för externa testare
- Vercels Preview-deployer är som standard ofta skyddade av Vercel Authentication, så att den som inte är inloggad hos Vercel inte kommer in. **Kontrollera att en utloggad person kan öppna länken** (t.ex. i ett privat webbläsarfönster eller på en annan telefon). Behöver du släppa in externa testare: Vercel → projektet → Settings → Deployment Protection. Det är en ändring av åtkomstskydd som du gör själv; jag har inte ändrat något.
- Använd **commit-specifik** deploy-adress (eller en domän du kontrollerar) när du skickar ut länken. Grenens "senaste"-adress ändras vid varje push.
- För att hålla versionen **oförändrad under testomgången**: pusha inte fler commits till grenen och mergea inte den. Behövs en rättelse mitt i: gör den på en ny gren och bestäm själv om testarna ska flyttas.

## 5. Känt och bra att veta (ingen åtgärd gjord)
- **Kostnaderna är uppskattningar** utifrån generella svenska priser och räknas på **hela förpackningar**. För små hushåll (t.ex. en person, en vecka) blir kostnaden per portion hög eftersom många olika varor köps i hela förpackningar, och en rätt kan få bara 2 portioner. Det är så modellen är byggd, inte ett fel, men testare kan reagera på det.
- Färsk basilika och andra varor utan verifierat pris prissätts med generiska kategoripriser (se `RECEPTFLÖDE.md`).
- Typsnitt hämtas från Fontshare (oavsett statistikval, står i integritetstexten).
- **Integritetssidan är ett utkast** (se kommentaren överst i `src/app/integritet/page.js`): bekräfta punkterna där, bland annat PostHogs IP-hantering, hosting och logghantering hos Vercel, och vad Google Formuläret samlar in, var svaren lagras och vem som har åtkomst.
- `NEXT_PUBLIC_ENABLE_ANALYTICS` styr om statistikvalet visas. Ska testdata inte blandas med riktig statistik: använd ett eget PostHog-projekt/nyckel för Preview.

## 6. Checklista för dig före första testet
- [ ] Feedbackformuläret: länken öppnas, frågorna och tackmeddelandet stämmer, och du kan läsa svaren (skicka ett svar märkt `TESTSVAR` och radera det).
- [ ] Integritetssidans utkast är granskat, inklusive beskrivningen av vad Google Formuläret samlar in (avsnitt 5).
- [ ] Preview-länken (commit-specifik) har öppnats av en utloggad person (avsnitt 4).
- [ ] Du har öppnat länken på din egen telefon och gått igenom flödet (planera → byt rätt → lista → feedback).
