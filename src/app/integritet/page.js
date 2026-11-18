import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import AnalyticsSettingsButton from '@/components/AnalyticsSettingsButton'

export const metadata = {
  title: 'Integritet – Mätt & Billigt',
  description: 'Så fungerar valet om produktstatistik i Mätt & Billigt och vilka uppgifter som hanteras.',
}

// ─── Underlag för texten ────────────────────────────────────────────────────
// Texten beskriver hur koden faktiskt fungerar och följande uppgifter, kontrollerade
// 2026-11-18. Ändras något av detta ska texten ses över.
//  - Koden: statistik laddas först efter ja (src/utils/analytics.js, analyticsConsent.js),
//    PostHog körs i cookieless-läge utan personprofiler, autocapture och skärminspelning är
//    avstängda, sidvisningar skickas manuellt (src/app/providers.js) och adresser, hänvisare,
//    kampanjparametrar och sökord från sökmotorer tas bort (sanitizeAnalyticsProperties).
//  - PostHog-projektet (bekräftat av ägaren): EU Cloud, "Discard client IP data" påslaget,
//    lagringstid för händelser ett år, autocapture, Session Replay, Heatmaps, Web Vitals och
//    Dead Clicks avstängda, signerat biträdesavtal (DPA).
//  - PostHogs källor: posthog.com/docs/privacy/data-storage (IP sparas inte med händelserna),
//    posthog.com/tutorials/cookieless-tracking (daglig hash av IP, user agent och värdnamn),
//    posthog.com/pricing (ett års lagring på gratisplanen), posthog.com/dpa avsnitt 10
//    (behandling även utanför EU, bl.a. USA; DPF; standardavtalsklausuler),
//    posthog.com/subprocessors (EU Cloud i Tyskland; Cloudflare globalt för data under överföring).
//  - Vercel (Hobby): vercel.com/docs/logs/runtime (körloggar sparas en timme),
//    vercel.com/legal/privacy-notice (IP-adress, ort och land, systeminformation; överföring
//    utanför hemlandet med standardavtalsklausuler; certifierat enligt EU–US DPF).
//    Vercel Analytics och Speed Insights är inte aktiverade (bekräftat av ägaren).
//  - Personuppgiftsansvarig och kontaktadress: Elis Sylla Sundin, kontakt.mattochbilligt@gmail.com.
// Ej fastställt i texten: Google Formulärets inställningar (t.ex. om e-postadress samlas in)
// och i vilken region Vercel kör appens serverfunktion. Texten påstår därför inget om dem.

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display font-semibold text-ink text-2xl mb-3">{title}</h2>
      <div className="space-y-3 text-ink-light leading-relaxed">{children}</div>
    </section>
  )
}

export default function IntegritetPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-page/90">
        <div className="max-w-[660px] mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </Link>
          <Link href="/planera" className="text-sm font-medium text-ink-light hover:text-primary transition-colors py-1.5 px-2">
            Till planeringen
          </Link>
        </div>
      </header>

      <article className="flex-1 w-full max-w-[660px] mx-auto px-4 pt-10 pb-16">
        <h1 className="font-display font-semibold text-ink text-[2.25rem] leading-tight text-balance mb-4">
          Integritet och produktstatistik
        </h1>
        <p className="text-ink-light text-lg leading-relaxed">
          Du kan använda hela appen utan att tillåta någon statistik. Här förklarar vi vad
          valet gäller och vilka andra uppgifter som hanteras när du planerar.
        </p>
        <p className="text-sm text-ink-light mt-3">Senast uppdaterad 18 november 2026.</p>

        <Section title="Produktstatistik är ett frivilligt val">
          <p>
            Första gången du besöker appen frågar vi om du vill bidra med produktstatistik. Du kan
            välja <strong className="text-ink">Tillåt produktstatistik</strong> eller{' '}
            <strong className="text-ink">Fortsätt utan statistik</strong>. Inget av valen är
            förvalt, och planeringen fungerar likadant oavsett vad du väljer.
          </p>
          <p>
            Innan du har valt, och om du väljer att fortsätta utan statistik, laddas inte
            statistikverktyget och ingenting skickas dit. Du kan ändra ditt val när som helst via
            länken ”Ändra val för statistik” längst ned på sidorna. Om du tar tillbaka ditt ja
            slutar appen skicka nya händelser direkt. Händelser som redan har skickats finns kvar
            hos statistikverktyget under den lagringstid som beskrivs nedan.
          </p>
          <p>
            <AnalyticsSettingsButton className="text-primary font-bold underline underline-offset-4 hover:text-primary-hover" />
          </p>
        </Section>

        <Section title="Vad vi mäter om du tillåter statistik">
          <p>
            Vi använder verktyget PostHog för att förstå hur appen används, så att vi kan göra den
            bättre. Appen skickar själv en händelse när något av följande händer, utan någon
            information om vad du fyllt i:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>att du visar en sida i appen (sidans adress, utan sökparametrar eller fragment)</li>
            <li>att du klickar på knappen på startsidan för att skapa en matplan</li>
            <li>att du börjar fylla i planeringsformuläret</li>
            <li>att en matplan har skapats</li>
            <li>att du öppnar ett recept</li>
            <li>att du byter ett recept</li>
            <li>att du ser inköpslistan</li>
            <li>att du når slutet av inköpslistan</li>
          </ul>
          <p>
            Vi skickar <strong className="text-ink">aldrig</strong> din budget, hur många ni är i
            hushållet, vad du skriver i skafferifältet eller något annat du matar in. Vi sparar
            inte vilka recept du valt. PostHogs automatiska insamling av klick, inspelning av
            skärmen, värmekartor, mätning av sidans prestanda och registrering av klick som inte
            leder någonstans är avstängda.
          </p>
        </Section>

        <Section title="Teknisk information som följer med">
          <p>
            Med varje händelse följer teknisk information om din webbläsare och enhet:
            operativsystem och version, webbläsare och version (inklusive webbläsarens
            fullständiga identifieringssträng), enhetstyp och ibland enhetsmodell (till exempel
            iPhone), skärm- och fönsterstorlek,
            webbläsarens språk, tidszon, sidans titel och adress, samt vilken version av
            statistikverktyget som används. Om du kom till appen från en annan webbplats följer
            bara den webbplatsens domännamn med, och om det var en sökmotor även sökmotorns
            namn. Hela adressen och dina sökord skickas inte.
          </p>
          <p>
            Vi försöker inte ta reda på vem du är och skapar inga personprofiler. PostHog lägger
            inga cookies och sparar ingenting i din webbläsare.
          </p>
        </Section>

        <Section title="IP-adress och räkning av besökare">
          <p>
            När din webbläsare skickar en händelse tar PostHog emot din IP-adress, eftersom den
            ingår i varje internetanslutning. Vårt PostHog-projekt är inställt så att IP-adressen
            inte sparas tillsammans med händelserna.
          </p>
          <p>
            För att kunna räkna ungefär hur många som använder appen utan cookies räknar PostHog
            på sina servrar fram ett kodat värde (en så kallad hash) av IP-adressen, webbläsarens
            identifieringssträng, webbplatsens adress och ett slumpvärde som byts varje dag.
            Slumpvärdet raderas när dagens händelser har behandlats, och värdet går inte att räkna
            tillbaka till IP-adressen. Samma besökare räknas därför som en ny besökare nästa dag.
          </p>
        </Section>

        <Section title="Hur länge sparas statistiken?">
          <p>
            PostHog sparar händelserna i ett år. Därefter kan de raderas permanent av PostHog. Vi
            kan inte ange någon exakt dag då en viss händelse tas bort.
          </p>
        </Section>

        <Section title="Var behandlas statistiken?">
          <p>
            Statistiken lagras i PostHogs EU-moln, på servrar i Tyskland. Enligt vårt
            biträdesavtal med PostHog kan PostHog ändå behandla uppgifter utanför EU/EES, bland
            annat i USA, till exempel hos de leverantörer som förmedlar trafiken. PostHog deltar
            i EU:s och USA:s ramverk för dataskydd (EU–US Data Privacy Framework), och avtalet
            innehåller EU-kommissionens standardavtalsklausuler.
          </p>
        </Section>

        <Section title="Vad appen sparar på din enhet">
          <p>
            Appen sparar två saker i din webbläsares lokala lagring. Det första är ditt val om
            statistik (ja eller nej), så att vi inte behöver fråga vid varje besök. Det andra
            är din senaste matplan, inköpslistan och vilka varor du har bockat av, så att de
            finns kvar om du laddar om sidan eller kommer tillbaka för att handla. Planen sparas
            i högst 30 dagar och tas bort när du väljer att skapa en ny plan. Båda sakerna
            lämnar inte din enhet och sparas även om du avböjer statistik, eftersom de behövs
            för att tjänsten ska fungera. Om du rensar webbläsarens data eller byter webbläsare
            försvinner de. Appen sparar inget annat på din enhet.
          </p>
        </Section>

        <Section title="Dina matplaner och uppgifter i formuläret">
          <p>
            Det du fyller i (antal vuxna och barn, period, budget, kostval, skafferi och antal
            rätter) skickas till appens egen server för att matplanen ska kunna räknas ut. Planen
            skapas från appens egna receptbibliotek. Ingen AI-tjänst eller annan extern part
            anropas för att skapa planen.
          </p>
          <p>
            Appens server sparar inte det du fyller i eller din färdiga plan i någon databas och
            skriver inte in det i sina loggar. Planen sparas bara i din webbläsare, enligt
            beskrivningen ovan. För att skydda tjänsten mot överbelastning håller servern en
            tillfällig räknare per IP-adress i minnet, i högst tio minuter.
          </p>
        </Section>

        <Section title="Drift av appen">
          <p>
            Appen drivs hos Vercel (Vercel Inc., USA). När du besöker sidorna tar Vercel emot din
            IP-adress, ort och land som härleds ur den, och teknisk information om anslutningen
            och webbläsaren, för att kunna leverera sidorna och skydda tjänsten. De körloggar som
            vi har tillgång till i Vercel sparas i en timme.
          </p>
          <p>
            Vercel kan behandla uppgifter utanför EU/EES, bland annat i USA. Vercel är
            certifierat enligt EU–US Data Privacy Framework och använder standardavtalsklausuler
            eller andra lämpliga skyddsåtgärder vid överföring. Hur Vercel självt hanterar
            uppgifterna beskrivs i{' '}
            <a
              href="https://vercel.com/legal/privacy-notice"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              Vercels integritetsmeddelande
            </a>
            . Vi använder inte Vercels egna tjänster för besöksstatistik eller prestandamätning.
          </p>
        </Section>

        <Section title="Andra tjänster som kontaktas">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-ink">Typsnitt.</strong> Sidorna hämtar typsnitt från
              Fontshare (api.fontshare.com och cdn.fontshare.com). Din webbläsare kontaktar då
              Fontshare, som får din IP-adress och teknisk information om webbläsaren. Detta sker
              oavsett ditt val om statistik.
            </li>
            <li>
              <strong className="text-ink">Feedback.</strong> Knapparna och länkarna ”Lämna feedback” (en fast knapp
              på startsidan och planeringen, en knapp i resultatet och en länk i sidfoten) öppnar ett Google Formulär i en ny flik. Det är
              en frivillig extern tjänst; appen skickar inga uppgifter dit själv och tar inte emot
              dina svar. Vad som sparas styrs av det du skriver i formuläret och av Googles villkor.
            </li>
          </ul>
        </Section>

        <Section title="Dina rättigheter och kontakt">
          <p>
            Mätt &amp; Billigt drivs av Elis Sylla Sundin som privatperson, inte av ett bolag.
            Elis Sylla Sundin ansvarar för hanteringen av uppgifterna som beskrivs här.
          </p>
          <p>
            Stödet för produktstatistik bygger på ditt samtycke, som du kan ta tillbaka när som
            helst utan att det påverkar appen. Statistiken är avsedd att inte kunna kopplas till dig
            som person, men om du vill veta mer, få uppgifter rättade eller raderade, eller har
            frågor om integritet, hör av dig till{' '}
            <a
              href="mailto:kontakt.mattochbilligt@gmail.com"
              className="text-primary font-bold underline underline-offset-2 hover:text-primary-hover"
            >
              kontakt.mattochbilligt@gmail.com
            </a>
            .
          </p>
          <p>
            Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY).
          </p>
        </Section>
      </article>

      <SiteFooter widthClass="max-w-[660px]" />
    </main>
  )
}
