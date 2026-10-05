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
- För ändringar med regressionsrisk: implementera, låt en separat granskare leta efter konkreta fel, rätta dem och kontrollera igen. Undvik ändringsrundor för rena stilpreferenser.
- Kör tester som berör ändringen. Använd `npm run test:analytics` för analytics, `npm run validate:recipes` för receptdata och `npm run build` när appens kod ändrats. Testa berört användarflöde i webbläsare när det är möjligt.
- Rapportera kort: ändrade filer, testresultat, vad som inte kunnat verifieras och git-status.
- Arbeta på feature-branch. Slå inte ihop med main eller publicera Production som del av en vanlig koduppgift.
- Fråga Elis när ett produktbeslut, en juridisk bedömning eller saknad åtkomst hindrar arbetet.
