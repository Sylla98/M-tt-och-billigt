import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import AnalyticsSettingsButton from '@/components/AnalyticsSettingsButton'

export const metadata = {
  title: 'Integritet – Mätt & Billigt',
  description: 'Så fungerar valet om produktstatistik i Mätt & Billigt och vilka uppgifter som hanteras.',
}

// ─── GRANSKNING INNAN PUBLICERING ───────────────────────────────────────────
// Den här sidan är ett UTKAST för granskning, inte juridisk rådgivning.
//
// Måste fyllas i / verifieras av ansvarig innan externa tester:
//  1. Att produktions-env faktiskt pekar på PostHog EU Cloud
//     (NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com) – koden visar bara
//     det som exempelvärde i .env.local.example.
//  2. Hur PostHog-projektet hanterar IP-adress (projektinställning, syns inte
//     i koden) och vad Google Forms-formuläret för feedback samlar in.
//  3. Hostingplats/loggning hos Vercel (syns inte i koden).
// Texten nedan påstår därför inget om dessa punkter utöver det koden visar.

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
      <header className="border-b border-line bg-cream/90">
        <div className="max-w-[660px] mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </Link>
          <Link href="/planera" className="text-sm font-medium text-ink-light hover:text-forest transition-colors py-1.5 px-2">
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

        <Section title="Produktstatistik är ett frivilligt val">
          <p>
            Första gången du besöker appen frågar vi om du vill bidra med produktstatistik.
            Du kan välja <strong className="text-ink">Tillåt produktstatistik</strong> eller{' '}
            <strong className="text-ink">Fortsätt utan statistik</strong>. Inget av valen är
            förvalt, och planeringen fungerar likadant oavsett vad du väljer.
          </p>
          <p>
            Innan du har valt, och om du väljer att fortsätta utan statistik, laddas inte
            statistikverktyget och ingenting skickas dit. Du kan ändra ditt val när som helst
            via länken ”Ändra val för statistik” längst ned på sidorna. Om du tar tillbaka ditt
            ja slutar appen skicka statistik direkt.
          </p>
          <p>
            <AnalyticsSettingsButton className="text-forest font-bold underline underline-offset-4 hover:text-forest-dark" />
          </p>
        </Section>

        <Section title="Vad vi mäter om du tillåter statistik">
          <p>
            Vi använder verktyget PostHog (EU Cloud) för att förstå hur appen används, så att vi
            kan göra den bättre. Vi mäter bara att följande händer, utan någon information om
            vad du fyllt i:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>att du besöker en sida i appen (sidans adress, utan sökparametrar eller fragment)</li>
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
            hushållet, vad du skriver i skafferifältet eller något annat du matar in som
            statistik. Vi sparar inte heller vilka recept du valt, och vi spelar inte in din
            skärm eller dina klick.
          </p>
        </Section>

        <Section title="Teknisk information som ändå följer med">
          <p>
            Även om vi har ställt in PostHog så att det inte lägger några cookies eller sparar
            något i din webbläsare (så kallat cookieless-läge) tar PostHog <strong className="text-ink">ändå
            emot teknisk information om din webbläsare och enhet</strong>. Det handlar om
            webbläsare och version (inklusive webbläsarens fullständiga identifieringssträng),
            operativsystem, enhetstyp, skärm- och fönsterstorlek, språk, tidszon och sidans
            titel. Dessutom ser PostHogs servrar den IP-adress din enhet har när den kontaktar
            dem, eftersom det ingår i varje internetanslutning.
          </p>
          <p>
            Vi försöker inte ta reda på vem du är och skapar inga personliga profiler. Innan något
            skickas tar vi bort sökparametrar och fragment ur sidadresser, och av vilken sida du
            kom från behåller vi bara domännamnet.
          </p>
        </Section>

        <Section title="Hur länge sparas statistiken?">
          <p>
            PostHogs nuvarande Free-plan, som vi använder, garanterar att händelser och
            tillhörande metadata sparas i minst ett år. Därefter kan äldre data finnas kvar i
            så kallad kallagring eller raderas. Vi kan därför inte ange någon exakt dag då
            uppgifterna tas bort.
          </p>
        </Section>

        <Section title="Vad appen sparar på din enhet">
          <p>
            Appen sparar bara ett enda litet värde i din webbläsares lokala lagring: ditt val
            om statistik (ja eller nej), så att vi inte behöver fråga vid varje besök. Det
            lämnar inte din enhet. Om du rensar webbläsarens data eller byter webbläsare
            frågar vi igen. Appen sparar inget annat på din enhet.
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
            Appens kod sparar inte det du fyller i eller din färdiga plan i någon databas. Planen
            finns kvar i din webbläsare tills du stänger eller laddar om sidan. För att skydda
            tjänsten mot överbelastning håller servern en tillfällig räknare per IP-adress i
            minnet, i högst tio minuter.
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
              <strong className="text-ink">Feedback.</strong> Knappen ”Lämna feedback” öppnar
              ett Google Formulär i en ny flik. Det är en frivillig extern tjänst; appen
              skickar inga uppgifter dit själv. Vad som sparas styrs av det du skriver i
              formuläret och av Googles villkor.
            </li>
            <li>
              <strong className="text-ink">Drift.</strong> Som alla webbplatser hanterar vår
              driftleverantör anslutningsuppgifter, till exempel IP-adress, för att kunna leverera sidorna.
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
              className="text-forest font-bold underline underline-offset-2 hover:text-forest-dark"
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
