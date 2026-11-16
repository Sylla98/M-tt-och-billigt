import TrackedLink from '@/components/TrackedLink'
import SiteFooter from '@/components/SiteFooter'
import FeedbackFab from '@/components/FeedbackFab'
import styles from './landing.module.css'

// ─── Startsida ──────────────────────────────────────────────────────────────
// Design: se DESIGN.md. Terrakottasektion med sidhuvud, rubrik, introduktion,
// huvudknapp, grytfigur och en stor matbild med välvd överkant; under den en
// ljus rad med tre korta fördelar. Desktop (md och uppåt): text till vänster,
// bild till höger, fördelarna på en rad. Mobil: allt i en kolumn, texten och
// knappen före bilden, fördelarna som tre enkla rader.
//
// Färger och övriga startsidestilar ligger i landing.module.css (gäller bara
// den här sidan). Matbilden är receptbilden för "Köttbullar med potatis och
// gräddsås" och visas här som stämningsbild, inte som ett receptförslag.

const HERO_IMAGE = '/recipe-images/kottbullar-potatis-graddsas.jpg'

// Enkla linjeikoner för fördelarna (dekorativa; texten bär innehållet).
function IconCalendar(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M3 9.5h18M8 2.75v3.5M16 2.75v3.5" />
      <path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 17h.01M12 17h.01M16.5 17h.01" strokeWidth="2.4" />
    </svg>
  )
}

function IconCoins(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="14.5" cy="6.5" rx="6.5" ry="3" />
      <path d="M8 6.5v3.5c0 1.66 2.91 3 6.5 3s6.5-1.34 6.5-3V6.5" />
      <ellipse cx="9.5" cy="14" rx="6.5" ry="3" />
      <path d="M3 14v3.5c0 1.66 2.91 3 6.5 3s6.5-1.34 6.5-3V14" />
    </svg>
  )
}

function IconSwap(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </svg>
  )
}

const BENEFITS = [
  { text: 'Recept för varje vardag', Icon: IconCalendar },
  { text: 'Planerad efter din budget', Icon: IconCoins },
  { text: 'Byt ut det du inte gillar', Icon: IconSwap },
]

// Grytfiguren (dekorativ) med en kort linje under, som i designunderlaget.
function Pot({ className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/gryta.svg" alt="" width="850" height="769" className="block w-full h-auto" />
      <span className={`${styles.ground} w-[38%] mx-auto mt-2`} />
    </div>
  )
}

export default function HomePage() {
  return (
    <main className={`${styles.landing} min-h-screen flex flex-col`}>
      <div className={styles.hero}>
        <header className="max-w-[75rem] mx-auto px-5 md:px-8 pt-3.5 md:pt-6 pr-[9rem] md:pr-[12rem]">
          {/* Höger sida lämnas fri för den fasta feedbackknappen. */}
          <span className="block font-display font-semibold tracking-tight whitespace-nowrap leading-[1.9rem] md:leading-[2.5rem] lg:leading-[3rem] text-[1.625rem] max-[359px]:text-[1.375rem] md:text-[2.25rem] lg:text-[2.625rem]">
            Mätt &amp; Billigt
          </span>
        </header>

        <section className={`${styles.heroInner} max-w-[75rem] mx-auto px-5 md:px-8 pt-6 md:pt-6 grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-10 lg:gap-16 items-end`}>
          {/* Text, knapp och figur */}
          <div className="text-center md:text-left md:self-center md:pb-14">
            <h1 className={`${styles.title} font-display font-bold leading-[1.02] tracking-tight text-[2.25rem] max-[359px]:text-[2rem] md:text-[3.25rem] lg:text-[4rem] xl:text-[4.5rem] mb-3 md:mb-6`}>
              <span className="block">Veckans mat.</span>{' '}
              <span className="block">Smartare</span>{' '}
              <span className="block">planerad.</span>
            </h1>
            <p className={`${styles.lead} text-[1.0625rem] leading-snug md:text-xl lg:text-[1.375rem] max-w-[17rem] md:max-w-[22rem] mx-auto md:mx-0 mb-5 md:mb-4`}>
              Planera vardagsmat och få en färdig inköpslista.
            </p>

            <div className="md:flex md:items-center md:gap-8 lg:gap-12">
              <div className="flex flex-col items-center md:items-start">
                <TrackedLink
                  href="/planera"
                  eventName="landing_cta_clicked"
                  className={`${styles.cta} inline-flex items-center justify-center gap-2.5 w-full max-w-[17.5rem] md:w-auto md:max-w-none
                             font-bold rounded-full min-h-[3rem] md:min-h-[3.75rem] px-7 md:px-10 text-[1.0625rem] md:text-[1.25rem]
                             transition-colors duration-150`}
                >
                  Skapa min matplan
                  <span aria-hidden="true">→</span>
                </TrackedLink>
                <p className="text-sm md:text-[0.9375rem] mt-2.5 md:mt-3 md:pl-10 opacity-90">Gratis · Ingen inloggning</p>
              </div>
              <Pot className="hidden md:block w-[7.5rem] lg:w-[8.5rem] shrink-0" />
            </div>
            <Pot className="md:hidden w-[5.25rem] mx-auto mt-5" />
          </div>

          {/* Matbild med välvd överkant */}
          <div className="relative mt-6 md:mt-0 mx-auto w-full max-w-[22rem] md:max-w-[30rem]">
            <svg className={styles.arc} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <path className="hidden md:block" d="M -10.2 62.1 A 58 58 0 0 1 71.5 -0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path className="md:hidden" d="M 61.6 -4.8 A 56 56 0 0 1 104.1 35.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className={`${styles.arch} ${styles.archBox} relative overflow-hidden h-[15rem] min-[400px]:h-[16.5rem]`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_IMAGE}
                alt=""
                width="1448"
                height="1086"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-[50%_38%] md:object-[57%_50%]"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Tre korta fördelar */}
      <section aria-label="Fördelar" className={`${styles.benefits} md:flex-1 md:flex md:items-center`}>
        <ul className="max-w-[75rem] md:w-full mx-auto px-5 md:px-8 py-6 md:py-9 flex flex-col items-start w-fit md:flex-row md:items-center md:justify-between gap-3.5 md:gap-6">
          {BENEFITS.map(({ text, Icon }, i) => (
            <li
              key={text}
              className={`flex items-center gap-3 md:gap-4 font-medium text-[1.0625rem] lg:text-[1.25rem] md:flex-1 md:justify-center
                          ${i > 0 ? 'md:border-l md:border-[#793528]/35' : ''}`}
            >
              <Icon className="w-7 h-7 md:w-9 md:h-9 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter className="mt-auto" />
      <FeedbackFab />
    </main>
  )
}
