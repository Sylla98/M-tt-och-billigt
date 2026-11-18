# Lansering av Mätt & Billigt (webbappen)

Status 18 november 2026 (uppdaterad efter dina svar): **klar för granskning, inte publicerad.** Ingen merge till `main` och ingen Production-deploy har gjorts.

## Release
| | |
|---|---|
| Releasegren | `release/lansering` |
| Release-kod (sista kodändringen) | `399848a` |
| Ovanpå release-koden | Bara uppdateringen av denna fil (`LANSERING.md`), ingen kod |
| Pull request (draft) | https://github.com/Sylla98/M-tt-och-billigt/pull/1 |
| Preview för grenen (Vercel) | https://m-tt-och-billigt-git-release-lansering-sylla1.vercel.app (grenadress, följer senaste push). Kräver inloggning i Vercel (Vercel Authentication), så den är inte öppnad härifrån. |
| Production-adress | https://m-tt-och-billigt.vercel.app/ |

- **Förhållande till `main`:** `origin/main` (77cfe79, augusti 2026) är förfader till releasegrenen. Grenen ligger 0 commits efter och 46+ före. En sammanslagning tappar alltså inget arbete och blir i praktiken en fast-forward.
- **Vercel:** `main` är projektets Production Branch. En merge till `main` startar därför ett Production-bygge automatiskt.
- **Production-variabler:** Production ska byggas med miljön **Production** i Vercel:
  - `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
  - `NEXT_PUBLIC_POSTHOG_KEY` satt
  - `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
  - Variablerna byggs in i klientkoden vid byggtillfället. Ändras de efter bygget krävs ett nytt bygge (Redeploy), inte bara en omstart.
- **Node:** projektet är inställt på Node.js 24.x i Vercel, och det är samma version som releasen verifierades med.

## Vad som är verifierat (release-kod `399848a`; se även Typsnitt nedan)
**Kod och tester visar** (Node 24.22.3, även Node 22.23.4 för testerna):
- `npm run build` ok.
- `npm run validate:recipes` ok.
- `npm run test:analytics` 50/50.
- `npm run test:swap` 100/100.
- `npm audit` 0 sårbarheter.

**Sett i webbläsare** (headless Chromium mot lokal produktionsserver, riktiga Fontshare-typsnitt, 320/390/1280 px). Huvudflödet kontrollerades på `0efad72`. Ändringarna därefter rör inte flödet: typsnitten gav pixelidentiska sidor, och plan-API:et ändrar bara loggtexten.

Kontrollerat:
- Skapa plan, öppna recept (mobil och desktopmodal, scroll oförändrad), Byt rätt (kostnadsskillnaden stämmer med totalsumman), avbockning och Kopiera listan, feedbacklänk.
- En sparad plan från Next 14-versionen återställs med samma rätter, summa och avbockningar.
- Inget sidledsöverflöd.
- Statistik: inget före val, efter nej eller efter återkallelse. Efter ja skickas manuella `$pageview` och produkthändelser utan indata, utan cookies och utan lagring från PostHog i webbläsaren. Sökord från en hänvisande sökmotor rensas bort.

**Ändringar efter dina svar 18 november**, verifierade med bygge på Node 24, `test:analytics` 50/50 och `test:swap` 100/100:
- **Typsnitt:** Boska är borttagen ur Fontshare-anropet, och rubrikerna använder uttryckligen Georgia. Sidorna är pixelidentiska före och efter (start, planering, resultat och integritet, 390 och 1440 px). Satoshi är det enda typsnitt som hämtas från Fontshare.
- **Integritetssidan:**
  - Ändamål och rättslig grund redovisas per behandling, och rätten att invända beskrivs.
  - Google Formulärets inställningar skiljs från Googles egen behandling.
  - Typsnittsavsnittet beskriver den lösning som faktiskt används.
  - Underlaget för bedömningen står i `INTRESSEAVVAGNING.md`.
- **Plan-API:et:** vid oväntade fel loggas bara feltypen, inte felmeddelandet. Kontrollerat med ogiltig JSON: loggen innehöll ingen indata.

**Separat granskning:** ändringarna och integritetstextens faktapåståenden har granskats två gånger mot koden, kontouppgifterna, licensen och de officiella källorna (PostHog, Vercel, Fontshare, Google, IMY). Fynden är rättade.

**Inte verifierat:**
- Vercel Preview och Production.
- Riktig telefon med den slutliga versionen.
- Att PostHog faktiskt tar emot och lagrar händelserna från Production.
- Juridisk bedömning: tekniska tester visar hur appen beter sig, inte att den uppfyller dataskyddsregler.

## Typsnitt: Satoshi på egen domän (genomfört)
- **Hämtning vid bygget:** `npm run build` kör först `scripts/fetch-fonts.mjs` (prebuild). Skriptet hämtar Fontshares officiella paket (`https://api.fontshare.com/v2/fonts/download/satoshi`) och packar upp de oförändrade webbfilerna och `FFL.txt` till `public/fonts/satoshi/`.
- **Inte i repot:** mappen är utesluten i `.gitignore` och checkas aldrig in, enligt ITF Free Font License 2.0, avsnitt 01 och 02.
- **Inga externa anrop:** appen serverar filerna från sin egen domän, så besökarens webbläsare kontaktar inte Fontshare.
- **Om hämtningen misslyckas:** bygget stoppas med meddelandet `[fetch-fonts] FEL: …`. Är Fontshare tillfälligt nere, bygg om senare.
- **Vercel:** bygget behöver nå `api.fontshare.com`. Vercel kör paketets `build`-skript, och därmed `prebuild`.
  - Om Build Command har ändrats (Override) så att typsnitten inte hämtas, stoppar `next.config.js` bygget med ett tydligt fel.
  - Ett lyckat Vercel-bygge betyder därför att typsnitten hämtades.

## Kvar före publicering
Underlaget står i `INTRESSEAVVAGNING.md` (version 18 november, granskad mot IMY, EDPB, LEK 9 kap. 28 § och PTS).

**Verkligt hinder:**
1. **Återkallelse av statistiksamtycket:** PTS skriver att möjligheten att återkalla ska ligga "högt upp på sidan" och inte kräva att användaren scrollar, och GDPR artikel 7.3 kräver att det ska vara lika lätt att återkalla som att ge samtycke.
   - I dag finns "Ändra val för statistik" bara i sidfoten och på integritetssidan.
   - Minsta rättelse: en liten "Ändra val för statistik"-kontroll i den fasta toppraden på alla sidor, bredvid "Lämna feedback". Den öppnar samma panel och visas bara när statistik är påslagen.
   - Kräver ditt godkännande av placeringen. Se `INTRESSEAVVAGNING.md`, "Återkallelse av samtycke till statistik (PTS)".

**Rutin att etablera:**

2. **Feedbacksvar, 90 dagar:** integritetssidan anger att svaren raderas manuellt senast 90 dagar efter att de kommit in. Google Formulär raderar inte automatiskt.
   - Lägg in en återkommande påminnelse, till exempel första måndagen varje månad.
   - Radera då svar äldre än 90 dagar i Formulär och i ett eventuellt länkat kalkylark, och radera nedladdade kopior.
   - Lägg till en rad i formulärets beskrivning om att inte skriva uppgifter om hälsa.

**Ställningstaganden (stoppar inte lanseringen):**

3. Intresseavvägning i stället för avtal (`INTRESSEAVVAGNING.md`, "Avtal som rättslig grund").
4. **Lagringen i webbläsaren** (avsnitt 3):
   - automatisk sparning av planen i högst 30 dagar,
   - statistikvalet utan utgångstid.

**Åtgärdat 18 november:**
- Fontshare: Satoshi serveras nu från egen domän.
- Hjälptexten vid skafferifältet: "Skriv bara matvaror, inte hälsouppgifter eller andra personuppgifter."

## Före publicering
1. **Preview:** logga in i Vercel och öppna Preview-länken ovan, eller den commit-specifika länken i Vercel. Gå igenom:
   - skapa plan,
   - Byt rätt,
   - ladda om (planen och avbockningarna finns kvar),
   - feedback,
   - `/integritet`.
2. **PostHog:** *Enable cookieless tracking* är påslaget (bekräftat 18 november).
3. **Godkänn PR:en** och ändra den från draft till klar.

## Publicering
1. Slå ihop https://github.com/Sylla98/M-tt-och-billigt/pull/1 till `main`.
2. Vercel bygger Production automatiskt från `main`. Kontrollera i Vercel → Deployments:
   - Bygget lyckas.
   - Miljön är **Production**.
   - Commit är merge-commiten (eller `release/lansering`s sista commit).
   - Domänen `m-tt-och-billigt.vercel.app` pekar på den nya deployen.
3. **Deployment Protection:** Production måste kunna öppnas utan Vercel-inloggning. Prova i ett privat fönster eller på en annan telefon.

## Slutkontroller efter publicering
Gör dem på https://m-tt-och-billigt.vercel.app/, helst på mobil:
- [ ] **Offentlig åtkomst:** sidan öppnas i ett privat fönster utan inloggning, och startsidan visar den nya olivfärgade designen.
- [ ] **Skapa plan:** en plan skapas med recept, totalsumma och inköpslista.
- [ ] **Byt rätt:** kostnadsskillnaden visas och totalsumman ändras med samma belopp.
- [ ] **Sparande:** bocka av två varor, ladda om sidan. Planen och avbockningarna finns kvar.
- [ ] **Feedback:** "Lämna feedback" öppnar Google Formuläret (https://forms.gle/GEG39fV4MtKDkPbs5) i en ny flik.
- [ ] **Statistik efter ja:** i ett nytt privat fönster, välj "Tillåt produktstatistik" och skapa en plan.
  - Inom några minuter syns `$pageview` och `meal_plan_generated` i PostHog (Activity).
  - Kontrollera att händelsen saknar IP-adress och platsdata (`$ip`, `$geoip_*`).
- [ ] **Statistik efter nej:** i ett annat privat fönster, välj "Fortsätt utan statistik" och skapa en plan. Inga nya händelser ska komma in från den sessionen.

## Återställning
Om något allvarligt är fel efter publiceringen:

1. **Snabbast: Instant Rollback i Vercel.** Projekt → Production Deployment → *Instant Rollback*.
   - På Hobby går det bara att rulla tillbaka till den **närmast föregående** Production-deployen. Det är den som är live före mergen, med den äldre appversionen.
   - Rollbacken bygger inte om. Den gamla deployen körs med de variabler den byggdes med.
   - Efter en rollback stänger Vercel av automatisk tilldelning av Production-domänen, så nya pushar till `main` går inte live förrän du väljer *Manage* → befordra en deploy.
   - Kontrollera efteråt att domänen pekar på rätt deploy och att sidan öppnas.
2. **Permanent: återställ koden i `main`.** Gör en revert av merge-commiten i GitHub, med PR:ens *Revert*-knapp, som ny PR mot `main`. Slå ihop den och låt Vercel bygga Production igen. Ångra därefter en eventuell Instant Rollback (*Manage* → befordra den nya deployen).
3. **Om bara statistiken är fel:** sätt `NEXT_PUBLIC_ENABLE_ANALYTICS` till något annat än `true` för Production i Vercel och gör *Redeploy*. Då visas inget statistikval och ingenting skickas. Resten av appen fungerar som vanligt.

Källor:
- Vercel: https://vercel.com/docs/instant-rollback och https://vercel.com/docs/deployments/promoting-a-deployment (lästa 18 november 2026).
- PostHog: https://posthog.com/docs/privacy/data-collection (cookieless-inställningen).
