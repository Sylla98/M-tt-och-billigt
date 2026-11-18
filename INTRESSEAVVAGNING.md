# Intresseavvägning – underlag för granskning

Upprättad 18 november 2026 som **förslag** för Elis Sylla Sundins granskning (personuppgiftsansvarig). Det här är ingen juridisk rådgivning, och tekniska tester visar bara hur appen beter sig, inte att den uppfyller dataskyddsreglerna.

Integritetssidan (`src/app/integritet/page.js`, avsnittet "Ändamål och rättslig grund") anger:
- **Samtycke** för produktstatistiken (PostHog).
- **Intresseavvägning** för behandlingarna nedan.

Bedömningen följer IMY:s beskrivning: behandlingen ska vara nödvändig för ett berättigat intresse, den registrerades intressen får inte väga tyngre, och samma resultat ska inte kunna nås på ett mindre integritetskänsligt sätt. Bedömningen ska dokumenteras. Källa: https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/intresseavvagning/ (läst 18 november 2026).

Varför inte "avtal": appen har inga användarvillkor och inget konto, så det finns inget avtal med besökaren att stödja behandlingen på.

## 1. Visa appen och skydda den (Vercel, räknaren mot överbelastning)
- **Uppgifter:** IP-adress, ort och land som Vercel härleder ur den, och teknisk information om webbläsaren. Vercels körloggar sparas en timme på Hobby. Räknaren per IP-adress hålls i serverns minne och gäller de senaste tio minuterna.
- **Berättigat intresse:** att kunna leverera sidorna som besökaren själv öppnar och skydda tjänsten mot överbelastning.
- **Nödvändighet:** en webbsida kan inte levereras utan IP-adress. Räknaren behövs för att begränsa missbruk av plan-API:et. Inga uppgifter sparas i databas, och serverloggarna innehåller inte indata.
- **Avvägning:** besökare räknar med att en webbplats tar emot IP-adressen. Lagringen är kort, och ingen profilering sker.
- **Förslag:** intresseavvägning håller.

## 2. Räkna ut matplanen
- **Uppgifter:** antal vuxna och barn, period, budget, kostval, skafferi och antal rätter, tillsammans med IP-adressen i anropet.
- **Berättigat intresse:** att ge besökaren den plan hen ber om.
- **Nödvändighet:** utan uppgifterna går planen inte att räkna ut. De används bara under uträkningen och sparas inte.
- **Avvägning:** besökaren lämnar uppgifterna själv för just det här syftet. Uppgifterna är inte känsliga, men skafferifältet är fritext, så besökare kan skriva annat än matvaror.
- **Förslag:** intresseavvägning håller.

## 3. Spara plan och statistikval i webbläsaren
- **Uppgifter:** planen, inköpslistan, avbockningarna och valet ja/nej, sparade i webbläsarens lokala lagring. Inget skickas till servern.
- **Berättigat intresse:** att planen finns kvar när besökaren kommer tillbaka för att handla, och att statistikvalet respekteras utan att frågan ställs varje gång.
- **Nödvändighet:** lagringen behövs för den funktion besökaren använder. Uppgifterna stannar på besökarens enhet, och planen tas bort efter 30 dagar (vid nästa besök) eller vid Ny plan.
- **Att granska:** reglerna om lagring på användarens enhet (lagen om elektronisk kommunikation) gäller parallellt med GDPR. Bedömningen här är att lagringen är nödvändig för den tjänst besökaren uttryckligen använder. Bekräfta det vid granskningen.
- **Förslag:** intresseavvägning håller.

## 4. Typsnitt (Fontshare)
- **Uppgifter:** IP-adress och teknisk information om webbläsaren, som en del av anslutningen när Satoshi hämtas. Enligt Fontshares FAQ samlar API:et inte in eller sparar personuppgifter, utan tar emot hänvisande domän och antal anrop.
- **Berättigat intresse:** att visa appen med sitt godkända typsnitt.
- **Nödvändighet, den svaga punkten:** samma utseende kan nås utan att besökarens webbläsare kontaktar Fontshare, genom att Satoshi ligger på appens egen domän. Licensen (ITF Free Font License 2.0, avsnitt 01) tillåter egen hosting, men avsnitt 02 förbjuder att filerna görs tillgängliga i publika repositories. Repot är publikt, så filerna kan inte checkas in. Enligt IMY:s princip om mindre integritetskänsliga alternativ kan detta tala emot intresseavvägning så länge typsnittet hämtas externt.
- **Alternativ för beslut:**
  - (a) Behåll som nu, och dokumentera att Fontshare enligt egen uppgift inte sparar personuppgifter.
  - (b) Hämta de officiella filerna från Fontshare vid bygget, utan att de checkas in, och servera dem från appens domän. Det kräver att du bedömer att det ryms i licensen.
  - (c) Byt Satoshi mot ett systemtypsnitt. Det är en designändring.
- **Förslag:** beslut av Elis. Integritetssidan beskriver lösningen som faktiskt används (a).

## 5. Feedback via Google Formulär
- **Uppgifter:** det besökaren själv skriver i formuläret. Formuläret samlar inte in e-postadress, kräver ingen inloggning, och bara Elis har tillgång till svaren (bekräftat 18 november 2026).
- **Berättigat intresse:** att förbättra appen utifrån synpunkter som besökaren frivilligt lämnar.
- **Nödvändighet:** utan svaren går synpunkterna inte att ta till vara. Ingen e-post eller inloggning samlas in.
- **Avvägning:** besökaren väljer själv att svara och vad hen skriver. Sidan uppmanar till att inte skriva personuppgifter i fritext.
- **Att bekräfta:** sidan anger att svaren raderas när de inte längre behövs för att förbättra appen. Bestäm gärna en konkret rutin, till exempel en genomgång och radering efter varje testomgång.
- **Googles egen behandling:** IP-adress, webbläsare och enhet behandlas av Google enligt Googles integritetspolicy. Den styrs inte av appen och ingår inte i den här avvägningen.
- **Förslag:** intresseavvägning håller.

## Rätt att invända
Vid intresseavvägning har den registrerade rätt att invända (IMY: https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/de-registrerades-rattigheter/). Integritetssidan beskriver rätten och kontaktvägen (kontakt.mattochbilligt@gmail.com). Den säger också ärligt att uppgifter som krävs för att sidan alls ska visas, alltså drift och typsnitt, i praktiken bara kan undvikas genom att inte använda appen.
