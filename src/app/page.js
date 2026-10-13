import TrackedLink from '@/components/TrackedLink'
import SiteFooter from '@/components/SiteFooter'

// De tre fördelarna visas direkt i första skärmvyn, bredvid (desktop) eller
// under (mobil) rubriken – inte som stora kort längre ned på sidan. Texterna
// är medvetet sakliga: kostnaden är en UPPSKATTNING och vi lovar inte att
// planen alltid håller budgeten. Inga påhittade besparingar eller användardata.
const BENEFITS = [
  {
    icon: '🥘',
    title: 'Recept efter ert hushåll',
    text: 'Välj personer, period och kostval.',
    tone: 'bg-terracotta-light border-terracotta',
  },
  {
    icon: 'kr',
    title: 'Kostnad mot din budget',
    text: 'Se uppskattad kostnad mot budgeten.',
    tone: 'bg-butter-light border-butter',
  },
  {
    icon: '⇄',
    title: 'Byt en rätt när du vill',
    text: 'Inköpslistan och kostnaden uppdateras.',
    tone: 'bg-sky border-sky-dark/25',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-[1100px] mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </span>
          <TrackedLink
            href="/planera"
            eventName="landing_cta_clicked"
            className="text-sm font-bold text-white bg-forest hover:bg-forest-dark
                       transition-colors py-2 px-4 rounded-lg"
          >
            Planera veckan
          </TrackedLink>
        </div>
      </header>

      {/* ── Hero + fördelar ───────────────────────────────────────────────
          Två kolumner på desktop (rubrik/knapp till vänster, de tre
          fördelarna till höger), en kolumn på mobil (rubrik, knapp, sedan
          fördelarna). Avsiktligt kompakta marginaler så att rubrik, knapp och
          alla tre fördelar ryms i första skärmvyn. Uppmätt i webbläsare: det
          gäller även när valet om produktstatistik visas längst ned på
          vanliga stora mobiler (t.ex. 375x812, 390x844, 414x896) och på
          desktop; på lägre mobilskärmar (t.ex. 360x740, 375x667) täcker
          panelen delar av fördelarna tills besökaren har valt.
          Dekorationscirklarna ligger bakom de heltäckande fördelsraderna och
          hålls helt innanför sektionens box (inga negativa right-värden –
          annars skärs de av av overflow-hidden). */}
      <section className="relative max-w-[1100px] w-full mx-auto px-4 pt-4 pb-6 md:pt-12 md:pb-14 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-6 right-4 w-56 h-56 rounded-full bg-terracotta/50 -z-10 hidden md:block"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-6 right-40 w-28 h-28 rounded-full bg-sky -z-10 hidden md:block"
        />
        <div
          aria-hidden="true"
          className="absolute top-2 right-[26rem] w-20 h-20 rounded-full bg-butter -z-10 hidden lg:block"
        />

        <div className="grid md:grid-cols-[minmax(0,1fr)_24rem] lg:grid-cols-[minmax(0,1fr)_28rem] gap-4 md:gap-10 items-center">
          <div>
            <h1 className="font-display font-semibold text-ink text-[2rem] leading-[1.05] min-[400px]:text-[2.25rem] sm:text-[2.75rem] md:text-[3rem] lg:text-[3.5rem] lg:leading-[1.04] text-balance mb-2 md:mb-5">
              Veckans mat.
              <br />
              Smartare planerad.
            </h1>
            <p className="text-ink-light text-base md:text-lg leading-relaxed max-w-md mb-3 md:mb-7">
              Planera vardagsmat och få en färdig inköpslista.
            </p>
            <TrackedLink
              href="/planera"
              eventName="landing_cta_clicked"
              className="inline-flex items-center justify-center bg-forest hover:bg-forest-dark
                         text-white font-bold py-3 md:py-3.5 px-7 rounded-lg text-base
                         transition-colors duration-150"
            >
              Skapa min matplan
            </TrackedLink>
            <p className="text-sm text-ink-light/70 mt-2 md:mt-3">Gratis · Ingen inloggning</p>
          </div>

          <ul className="space-y-2 md:space-y-3">
            {BENEFITS.map(({ icon, title, text, tone }) => (
              <li
                key={title}
                className={`rounded-2xl border p-3 md:p-5 flex items-center gap-3.5 md:gap-4 ${tone}`}
              >
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface flex items-center
                             justify-center text-base md:text-lg font-bold text-forest"
                >
                  {icon}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-[1.0625rem] md:text-xl text-ink leading-snug">
                    {title}
                  </h2>
                  <p className="text-sm md:text-base text-ink-light leading-snug mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter className="mt-auto" />
    </main>
  )
}
