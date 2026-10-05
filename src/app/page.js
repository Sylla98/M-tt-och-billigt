import TrackedLink from '@/components/TrackedLink'
import SiteFooter from '@/components/SiteFooter'

// Fyra riktiga, korta receptnamn ur biblioteket – ren variation (kyckling/
// vegetariskt/kött/fisk), ingen påhittad data. Används bara som exempel på
// bredden i receptbiblioteket, inte som en påstådd "din vecka"-plan.
const PLANNING_EXAMPLES = ['Butter chicken', 'Kikärtscurry', 'Ungersk gulasch', 'Skagen-räkpasta']

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

      {/* ── Hero ──────────────────────────────────────────────────────────
          Editorial komposition: rubriken tar täten, mjuka färgade former
          i terrakotta/smör/himmelsblått ger sidan karaktär bakom texten –
          rent grafiskt, ingen produktrepresentation (den kommer i nästa
          sektion, tydligt separat).
          Cirklarna hålls MEDVETET helt innanför sektionens egen box (inga
          negativa right-värden) – tidigare stack den största cirkeln ut
          60px till höger om sektionens overflow-hidden-gräns och blev
          därför hårt avskuren exakt vid den gränsen, vilket såg ut som ett
          layoutfel snarare än en avsiktlig komposition. */}
      <section className="relative max-w-[1100px] w-full mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-8 right-4 w-64 h-64 rounded-full bg-terracotta/50 -z-10 hidden md:block"
        />
        <div
          aria-hidden="true"
          className="absolute top-64 right-32 w-36 h-36 rounded-full bg-sky -z-10 hidden md:block"
        />
        <div
          aria-hidden="true"
          className="absolute top-0 right-64 w-24 h-24 rounded-full bg-butter -z-10 hidden lg:block"
        />

        <div className="max-w-2xl">
          <h1 className="font-display font-semibold text-ink text-[2.75rem] leading-[1.05] md:text-[4rem] md:leading-[1.02] text-balance mb-6">
            Veckans mat.
            <br />
            Smartare planerad.
          </h1>
          <p className="text-ink-light text-lg leading-relaxed max-w-md mb-8">
            Planera god vardagsmat utifrån din budget, få en färdig
            inköpslista och byt enkelt ut ett recept om något inte känns
            rätt.
          </p>
          <TrackedLink
            href="/planera"
            eventName="landing_cta_clicked"
            className="inline-flex items-center justify-center bg-forest hover:bg-forest-dark
                       text-white font-bold py-4 px-7 rounded-lg text-base
                       transition-colors duration-150"
          >
            Skapa min matplan
          </TrackedLink>
          <p className="text-sm text-ink-light/70 mt-3">Gratis · Ingen inloggning</p>
        </div>
      </section>

      {/* ── Tre produktmoment ─────────────────────────────────────────────
          Ersätter den tidigare exempelrutan, som gav intrycket av en
          komplett genererad plan trots att den bara visade två recept.
          Detta är medvetet INTE en plan: tre fristående, olika utformade
          representationer av tre separata funktioner, var och en i sin
          egen temafärg. Inga påhittade besparingar eller användardata. */}
      <section className="border-t border-line">
        <div className="max-w-[1100px] mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">

            {/* Planering – aprikos. Receptnamnen visas som lösa, lätt
                vinklade etiketter för att signalera bredd/variation,
                aldrig som "din vecka". */}
            <div className="rounded-2xl bg-terracotta-light border border-terracotta p-6 flex flex-col">
              <h2 className="font-display font-semibold text-xl text-ink mb-2">
                Recept för varje vardag
              </h2>
              <p className="text-sm text-ink-light leading-relaxed mb-6">
                Ett brett receptbibliotek – ange budget och preferenser, få
                förslag som passar just ert hushåll.
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {PLANNING_EXAMPLES.map((name, i) => (
                  <span
                    key={name}
                    className="inline-block bg-surface text-ink text-xs font-medium
                               px-3 py-1.5 rounded-full border border-terracotta/60"
                    style={{ transform: `rotate(${i % 2 === 0 ? '-1.5deg' : '1.5deg'})` }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Budget – smör. Samma visuella språk som det riktiga
                budgetreglaget i formuläret, men rent illustrativt. */}
            <div className="rounded-2xl bg-butter-light border border-butter p-6 flex flex-col">
              <h2 className="font-display font-semibold text-xl text-ink mb-2">
                Håller sig till din budget
              </h2>
              <p className="text-sm text-ink-light leading-relaxed mb-6">
                Ange vad ni vill lägga på maten – planen räknar ut vad
                perioden kostar och håller sig därinom.
              </p>
              <div className="mt-auto">
                <div className="flex items-baseline justify-between text-xs text-ink-light mb-1.5">
                  <span>500 kr</span>
                  <span>5 000 kr</span>
                </div>
                <div aria-hidden="true" className="relative h-1.5 rounded-full bg-butter">
                  <div className="absolute inset-y-0 left-0 w-[45%] rounded-full bg-forest" />
                  <div className="absolute top-1/2 left-[45%] -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-surface border-2 border-forest" />
                </div>
              </div>
            </div>

            {/* Flexibilitet / Byt rätt – himmelsblått. En enkel
                bytesvisualisering istället för en tredje identisk ikonruta. */}
            <div className="rounded-2xl bg-sky border border-sky-dark/25 p-6 flex flex-col">
              <h2 className="font-display font-semibold text-xl text-ink mb-2">
                Byt ut det du inte gillar
              </h2>
              <p className="text-sm text-ink-light leading-relaxed mb-6">
                Gillar du inte ett recept i planen? Byt ut det – resten av
                planen och inköpslistan uppdateras automatiskt.
              </p>
              <div className="mt-auto flex items-center justify-center gap-3">
                <span className="bg-surface text-ink-light text-xs font-medium px-3 py-2 rounded-lg border border-sky-dark/25 line-through decoration-sky-dark/50">
                  Fiskgratäng
                </span>
                <span className="text-sky-dark font-bold" aria-hidden="true">→</span>
                <span className="bg-forest text-white text-xs font-bold px-3 py-2 rounded-lg">
                  Butter chicken
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <SiteFooter className="mt-auto" />
    </main>
  )
}
