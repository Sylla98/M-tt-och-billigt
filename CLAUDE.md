# Mätt & Billigt

## Produkt
- Prioritera användbara matplaner, kompletta recept och tillförlitliga kostnader.
- Bygg inte nya funktioner eller utöka receptbiblioteket utan en konkret uppgift.
- Ändra inte etablerad design utifrån personlig smak. Motivera designändringar med ett användarproblem eller testfeedback.
- Beskriv uppskattad receptkostnad som en uppskattning, inte som priset för en faktisk varukorg.

## Känsliga flöden
- Bevara mobilens receptöppning och scrollbeteende.
- På desktop ska receptmodalen inte flytta bakgrundssidan; användaren ska återvända till samma position när den stängs.
- Ändringar i analytics och samtycke ska kontrolleras både före samtycke, efter ja, efter nej och efter återkallelse. Skicka inte budget, hushållsuppgifter eller fritext till PostHog.
- Skilj på vad kod och tester visar och vad som faktiskt verifierats i webbläsare eller Production.

## Arbetsflöde
- Läs relevant kod och git-status innan du ändrar något. Håll ändringen till uppgiftens omfattning.
- Arbeta på feature-branch. Slå inte ihop med main eller publicera Production som del av en vanlig koduppgift.
- Fråga Elis när ett produktbeslut, en juridisk bedömning eller saknad åtkomst hindrar arbetet.

### Standardflöde för en uppgift
1. **Bas:** `main` är inte nödvändigtvis senaste appversionen. Hämta alla grenar (`git fetch origin`), jämför dem (`git rev-list --count`, `git merge-base --is-ancestor`) och utgå från den gren som innehåller senaste versionen. Skapa en egen feature-branch därifrån.
2. **Ändra:** håll dig till uppgiftens omfattning.
3. **Testa efter risk** (se nedan). Kör inte tester som inte berör ändringen.
4. **Separat granskning** vid regressionsrisk (se nedan), rätta konkreta fel och kontrollera igen.
5. **Push** med uttryckligt grennamn: `git push -u origin <ny-gren>:<ny-gren>`. En gren som skapats från en annan gren kan annars ha fel upstream och pusha till fel gren.
6. **Vercel Preview:** försök hitta Preview-länken för den pushade committen (GitHub-status/checks, Vercel-koppling om den finns). Hittas ingen, skriv att den inte kunnat bekräftas och be Elis kolla Vercel-dashboarden. Hitta aldrig på en länk, och skapa inte PR bara för att få en Preview utan att fråga.
7. **Rapportera** (se nedan).

### Tester efter ändringens risk
- **Ren bildfil byts (samma filnamn och sökväg, ingen kodändring):** kontrollera att filen är en giltig JPEG med rimliga mått och storlek, att `image`-fältet i `src/data/recipes.js` pekar på filen, och att bilden visas rätt i receptkort och receptvy på mobilbredd och desktop i webbläsare. Kör inte `test:analytics`, `test:swap`, `validate:recipes` eller `build`; de berör inte ändringen och Vercels Preview-bygge täcker bygget. Ingen separat granskare behövs om bara en bildfil ändrats och kontrollen ovan är gjord.
- **Receptdata (`src/data/recipes.js`) ändras:** `npm run validate:recipes`, och `npm run build` om kod också ändrats. Ändras ingredienser, mängder eller priser ska du dessutom kontrollera, i appen eller via `/api/meal-plan`, en genererad plan som innehåller det ändrade receptet: totalsumman, inköpslistan (rätt ingredienser, mängder och summor per kategori) och kostnadsskillnaden när receptet byts med Byt rätt (`npm run test:swap`). Redovisa vilken plan (hushåll, budget, period) som kontrollerades. Priser är uppskattningar och ska inte beskrivas som en faktisk varukorg. Kör `npm run verify:recipe -- <recept-id>`: det räknar oberoende om mängder, inköp och totalsumma och redovisar saknat prisunderlag (generiskt kategoripris är inte ett verifierat pris). Hela kontrollmatrisen finns i `RECEPTFLÖDE.md` (avsnitt 2.5 och bilaga A).
- **Appens kod ändras:** `npm run build`, och testa berört flöde i webbläsare. Ändrar du analytics eller samtycke: `npm run test:analytics` och kontrollera före samtycke, efter ja, efter nej och efter återkallelse. Ändrar du Byt rätt eller inköpslistans sammanslagning av ingredienser: `npm run test:swap` (inkluderar `tests/swap/shopping-list-units.test.mjs`).
- **Regressionsrisk** (receptöppning, scroll, modal, analytics, prisberäkning): låt en separat granskare leta efter konkreta fel, rätta dem och kontrollera igen. Undvik ändringsrundor för rena stilpreferenser.

### Recept
- När Elis ber om att lägga till, ändra eller ta bort ett recept (t.ex. "lägg till det här receptet enligt receptflödet", med länk eller recepttext) ska du följa [RECEPTFLÖDE.md](RECEPTFLÖDE.md) från underlag till leverans. Läs den hela innan du börjar. Den beskriver hur recept, ingredienser, priser, kostval, planering och bilder fungerar i koden, vilka kontroller som krävs och hur du rapporterar.
- Vid konflikt mellan de två filerna gäller `CLAUDE.md`.

### Receptbilder
- Byt bild på plats med samma filnamn i `public/recipe-images/`; då behövs ingen kodändring.
- Liggande JPG, helst 1200–1600 px bred, utan omskalning om källan redan är rimlig, och helst under ca 500 KB. Bilden visas med `object-cover` (240 px hög ruta på mobil), så kontrollera beskärningen på mobilbredd.
- Använd bara bilder som Elis tillhandahållit eller som har tillåten licens.
- Bildstandard för nya receptbilder (vinkel, komposition, ljus, att bilden ska stämma med receptet, exempel): `RECEPTFLÖDE.md` avsnitt 3.1.

### Rapport
Rapportera kort och håll isär:
- **Verifierat:** vad som faktiskt körts eller setts (bygge, tester, webbläsarkontroll med vilka bredder). Skriv "kod/tester visar" respektive "sett i webbläsare" respektive "sett på Preview/Production" var för sig.
- **Inte verifierat:** t.ex. riktig telefon, Vercel Preview som inte kunde nås, typsnitt som blockerats i sandlådan.
- **Bas, gren, ändrade filer, git-status och Preview-länk** (eller att den saknas).
- **Vad Elis ska bedöma på mobilen** som en kort punktlista.
