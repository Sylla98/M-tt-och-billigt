import TrackedLink from '@/components/TrackedLink'
import SiteFooter from '@/components/SiteFooter'

// Receptnamn som exempel på bredden i receptbiblioteket (riktiga recept ur
// biblioteket, inte en påstådd plan) och två exempelnamn för bytet.
const EXAMPLE_RECIPES = ['Butter chicken', 'Kikärtscurry', 'Ungersk gulasch', 'Skagen-räkpasta']

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-[1100px] mx-auto px-4 py-[var(--land-header-py)] md:py-4 flex items-center justify-between">
          <span className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </span>
        </div>
      </header>

      {/* ── Hero + fördelar ───────────────────────────────────────────────
          Rubrik och knapp till vänster, de tre fördelarna som tre tonade
          rutor till höger (desktop); rubrik, knapp och tre rutor i en kolumn
          (mobil). Varje ruta har sin ursprungliga rubrik och bär fördelen med
          en liten bild av själva funktionen – receptnamn, budgetreglage,
          receptbyte. Typsnitt, vikter och rubrikstilar är oförändrade.
          Mobilens avstånd styrs av variablerna --land-* i globals.css: luftigt
          när statistikvalet inte visas (sidan fyller skärmen), kompakt när det
          visas (html[data-consent="open"]) så att rubrik, knapp och alla tre
          rutor ryms ovanför valet på vanliga stora mobiler. På lägre
          mobilskärmar (t.ex. 360x740, 375x667) täcker valet delar av rutorna
          tills besökaren valt. Dekorationen är borttagen för enkelhetens skull.
          */}
      <section className="max-w-[1100px] w-full mx-auto px-4 pt-[var(--land-pt)] pb-8 md:pt-14 md:pb-16 lg:pt-8 xl:pt-14">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-[var(--land-sec-gap)] md:gap-8 lg:gap-12 items-center">
          <div>
            <h1 className="font-display font-semibold text-ink text-[length:var(--land-h1)] leading-[1.05] sm:text-[3rem] sm:leading-[1.02] md:text-[3.5rem] lg:text-[2.5rem] xl:text-[3rem] text-balance mb-[var(--land-h1-mb)] md:mb-5">
              Veckans mat.
              <br />
              Smartare planerad.
            </h1>
            <p className="text-ink-light text-base md:text-lg leading-snug max-w-md mb-[var(--land-lead-mb)] md:mb-7">
              Planera vardagsmat och få en färdig inköpslista.
            </p>
            <TrackedLink
              href="/planera"
              eventName="landing_cta_clicked"
              className="inline-flex items-center justify-center gap-2.5 bg-forest hover:bg-forest-dark
                         text-white font-bold py-[var(--land-cta-py)] md:py-3.5 pl-7 pr-6 rounded-full text-base
                         transition-colors duration-150"
            >
              Skapa min matplan
              <span aria-hidden="true">→</span>
            </TrackedLink>
            <p className="text-sm text-ink-light/70 mt-2 md:mt-3">Gratis · Ingen inloggning</p>
          </div>

          <ul className="grid gap-[var(--land-gap)] md:gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {/* Recept efter hushållet – aprikos. Breda rutan på desktop. */}
            <li className="md:col-span-2 lg:col-span-1 xl:col-span-2 rounded-2xl bg-terracotta-light border border-terracotta p-[var(--land-pad)] md:p-6 lg:p-5 xl:p-6">
              <h2 className="font-display font-semibold text-[length:var(--land-title)] md:text-xl text-ink leading-snug text-balance">
                Recept för varje vardag
              </h2>
              <p className="sr-only">Exempel på recept:</p>
              <div className="mt-[var(--land-vis-mt)] md:mt-4 flex flex-wrap gap-2 md:gap-2">
                {EXAMPLE_RECIPES.map((name, i) => (
                  <span
                    key={name}
                    className={`bg-surface text-ink text-[length:var(--land-chip-fs)] md:text-sm lg:text-xs xl:text-sm font-medium
                                px-[var(--land-chip-px)] py-[var(--land-chip-py)] md:px-3 md:py-1.5
                                rounded-full border border-terracotta/60 inline-block
                                ${i === 3 ? 'max-sm:[html[data-consent=open]_&]:hidden' : ''}`}
                    style={{ transform: `rotate(${i % 2 === 0 ? '-1.5deg' : '1.5deg'})` }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </li>

            {/* Uppskattad kostnad mot budget – smör. Samma visuella språk som
                det riktiga budgetreglaget i formuläret, rent illustrativt. */}
            <li className="rounded-2xl bg-butter-light border border-butter p-[var(--land-pad)] md:p-6 lg:p-5 xl:p-6">
              <h2 className="font-display font-semibold text-[length:var(--land-title)] md:text-xl text-ink leading-snug text-balance">
                Håller sig till din budget
              </h2>
              <div aria-hidden="true" className="mt-[var(--land-slider-mt)] md:mt-6 relative h-1.5 rounded-full bg-butter">
                <div className="absolute inset-y-0 left-0 w-[55%] rounded-full bg-forest" />
                <div className="absolute top-1/2 left-[55%] -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-surface border-2 border-forest" />
              </div>
            </li>

            {/* Byt en rätt – himmelsblått. */}
            <li className="rounded-2xl bg-sky border border-sky-dark/25 p-[var(--land-pad)] md:p-6 lg:p-5 xl:p-6">
              <h2 className="font-display font-semibold text-[length:var(--land-title)] md:text-xl text-ink leading-snug text-balance">
                Byt ut det du inte gillar
              </h2>
              <p className="sr-only">Exempel: Fiskgratäng byts mot Butter chicken.</p>
              <div aria-hidden="true" className="mt-[var(--land-vis-mt)] md:mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="bg-surface text-ink-light text-[length:var(--land-chip-fs)] md:text-xs font-medium px-[var(--land-chip-px)] py-[var(--land-chip-py)] md:px-2.5 md:py-1.5 rounded-lg border border-sky-dark/25 line-through decoration-sky-dark/50">
                  Fiskgratäng
                </span>
                <span className="text-sky-dark font-bold">→</span>
                <span className="bg-forest text-white text-[length:var(--land-chip-fs)] md:text-xs font-bold px-[var(--land-chip-px)] py-[var(--land-chip-py)] md:px-2.5 md:py-1.5 rounded-lg">
                  Butter chicken
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter className="mt-auto" />
    </main>
  )
}
