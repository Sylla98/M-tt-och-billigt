# Lansering av Mätt & Billigt (webbappen)

Status 18 november 2026: **klar för granskning, inte publicerad.** Ingen merge till `main` och ingen Production-deploy har gjorts.

## Release
| | |
|---|---|
| Releasegren | `release/lansering` |
| Release-kod (sista kodändringen) | `0efad72` |
| Ovanpå release-koden | Bara denna fil (`LANSERING.md`), ingen kod |
| Pull request (draft) | https://github.com/Sylla98/M-tt-och-billigt/pull/1 |
| Preview för grenen (Vercel) | https://m-tt-och-billigt-git-release-lansering-sylla1.vercel.app (grenadress, ändras vid nya pushar) |
| Production-adress | https://m-tt-och-billigt.vercel.app/ |

- **Förhållande till `main`:** `origin/main` (77cfe79, augusti 2026) är förfader till releasegrenen. Grenen ligger 0 commits efter och 46+ före. En sammanslagning tappar alltså inget arbete och blir i praktiken en fast-forward.
- **Vercel:** `main` är projektets Production Branch. En merge till `main` startar därför ett Production-bygge automatiskt.
- **Production-variabler:** Production ska byggas med miljön **Production** i Vercel:
  - `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
  - `NEXT_PUBLIC_POSTHOG_KEY` satt
  - `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
  - Variablerna byggs in i klientkoden vid byggtillfället. Ändras de efter bygget krävs ett nytt bygge (Redeploy), inte bara en omstart.
- **Node:** projektet är inställt på Node.js 24.x i Vercel, och det är samma version som releasen verifierades med.

## Vad som är verifierat (release-kod `0efad72`)
**Kod och tester visar** (Node 24.22.3, även Node 22.23.4 för testerna):
- `npm run build` ok.
- `npm run validate:recipes` ok.
- `npm run test:analytics` 50/50.
- `npm run test:swap` 100/100.
- `npm audit` 0 sårbarheter.

**Sett i webbläsare** (headless Chromium mot lokal produktionsserver, riktiga Fontshare-typsnitt, 320/390/1280 px):
- Skapa plan, öppna recept (mobil och desktopmodal, scroll oförändrad), Byt rätt (kostnadsskillnaden stämmer med totalsumman), avbockning och Kopiera listan, feedbacklänk.
- En sparad plan från Next 14-versionen återställs med samma rätter, summa och avbockningar.
- Inget sidledsöverflöd.
- Statistik: inget före val, efter nej eller efter återkallelse. Efter ja skickas manuella `$pageview` och produkthändelser utan indata, utan cookies och utan lagring från PostHog i webbläsaren. Sökord från en hänvisande sökmotor rensas bort.

**Separat granskning:** ändringarna och integritetstextens faktapåståenden har granskats mot koden, kontouppgifterna och PostHogs och Vercels officiella sidor. Fynden är rättade.

**Inte verifierat:**
- Vercel Preview och Production.
- Riktig telefon med den slutliga versionen.
- Att PostHog faktiskt tar emot och lagrar händelserna från Production.
- Juridisk bedömning: tekniska tester visar hur appen beter sig, inte att den uppfyller dataskyddsregler.

## Före publicering
1. **Preview:** öppna Preview-länken ovan, eller den commit-specifika länken i Vercel. Gå igenom: skapa plan, Byt rätt, ladda om (planen och avbockningarna finns kvar) och feedback.
2. **PostHog:** under *Settings > Project > Web analytics* ska **Enable cookieless tracking** vara påslaget. Appen kör PostHog i cookieless-läge, och enligt PostHog kastas sådana händelser med en varning om inställningen är av.
3. **Integritetssidan:** läs `/integritet` och besvara de öppna frågorna i rapporten:
   - Google Formulärets inställningar.
   - Rättslig grund för övrig behandling.
   - Fontshare.
4. **Godkänn PR:en** och ändra den från draft till klar.

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
