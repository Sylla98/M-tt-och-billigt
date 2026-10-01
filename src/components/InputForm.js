'use client'
import { useState } from 'react'

// Samma id:n och samma values som tidigare – endast presentationen är ny.
// Backend, payload och urvalslogik är oförändrade.
const DIET_TYPES = [
  { id: 'blandkost', label: 'Blandkost' },
  { id: 'kott-gront', label: 'Kött & grönt' },
  { id: 'vegetariskt', label: 'Vegetariskt' },
]

const PREFERENCES = [
  { id: 'familjevanligt', label: 'Familjevänligt' },
  { id: 'proteinrikt', label: 'Proteinrikt' },
  { id: 'somrigt', label: 'Somrigt & fräscht' },
]

const MAX_FOOD_TYPES = 2

const DURATIONS = ['1 vecka', '2 veckor', '1 månad']

// Budgetreglagets intervall beror på vald period. Steg om 100 kr.
// Själva budgetvärdet som skickas till backend är oförändrat i format.
const BUDGET_RANGES = {
  '1 vecka':  { min: 500,  max: 3000 },
  '2 veckor': { min: 500,  max: 5000 },
  '1 månad':  { min: 1000, max: 10000 },
}
const BUDGET_STEP = 100

// Vilka antal rätter som är rimliga per period
const DISHES_BY_DURATION = {
  '1 vecka':  [5, 7],
  '2 veckor': [5, 7, 10],
  '1 månad':  [7, 10, 14],
}

const TOTAL_STEPS = 5

// Alla etiketter samlade för sammanfattningen på steg 5
const ALL_FOOD_TYPES = [...DIET_TYPES, ...PREFERENCES]

/** Sektionsrubrik – konsekvent label-stil genom hela formuläret */
function FieldLabel({ children, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2.5">
      <span className="text-label font-semibold text-ink">{children}</span>
      {hint && <span className="text-xs text-ink-light/70 font-normal">{hint}</span>}
    </div>
  )
}

/** Valknapp – vald status signaleras med både färg, ram och en bock,
 *  så färg aldrig är enda signalen (tillgänglighetskrav). */
function ChoiceButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative py-2.5 px-3 rounded-lg text-sm font-medium text-center
                  border transition-colors duration-150 min-h-[44px]
        ${selected
          ? 'bg-forest text-white border-forest'
          : 'bg-white text-ink border-line hover:border-ink-light/40'}`}
    >
      {selected && <span aria-hidden="true" className="mr-1.5">✓</span>}
      {children}
    </button>
  )
}

function StepperField({ label, value, onChange, min = 0 }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Minska ${label.toLowerCase()}`}
          disabled={value <= min}
          className="w-11 h-11 rounded-lg border border-line bg-white text-ink text-lg
                     hover:border-ink-light/40 disabled:opacity-35 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center"
        >
          −
        </button>
        <div className="flex-1 text-center text-lg font-semibold text-ink tabular-nums" aria-live="polite">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Öka ${label.toLowerCase()}`}
          className="w-11 h-11 rounded-lg border border-line bg-white text-ink text-lg
                     hover:border-ink-light/40 transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Diskret stegindikator – segment istället för ett stort progresskort */
function StepProgress({ step }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200
              ${i < step ? 'bg-forest' : 'bg-line'}`}
          />
        ))}
      </div>
      <p className="text-xs text-ink-light/70" aria-live="polite">
        Steg {step} av {TOTAL_STEPS}
      </p>
    </div>
  )
}

/** Minimal bakåtkontroll – en riktig pilkaraktär, ingen emoji.
 *  Placeras vid progressraden så den inte konkurrerar med huvud-CTA:n. */
function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tillbaka"
      className="w-11 h-11 -ml-2.5 flex items-center justify-center rounded-lg
                 text-ink-light hover:text-ink hover:bg-line/60
                 transition-colors text-lg leading-none flex-shrink-0"
    >
      <span aria-hidden="true">&#8592;</span>
    </button>
  )
}

/** En rad i sammanfattningen på steg 5 */
function SummaryRow({ label, value, onEdit }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-xs text-ink-light/70 mb-0.5">{label}</div>
        <div className="text-sm text-ink break-words">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-forest hover:text-forest-dark underline underline-offset-4
                   flex-shrink-0 py-1 px-1 transition-colors"
      >
        Ändra
      </button>
    </div>
  )
}

export default function InputForm({ onSubmit, loading, onInteraction }) {
  // All formulärstate ligger kvar i komponenten oavsett vilket steg som
  // visas – stegen byter bara vilken sektion som renderas. Därför bevaras
  // alla val automatiskt när användaren går fram och tillbaka.
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  // Sätts när användaren hoppar till ett steg via "Ändra" på sammanfattningen.
  // Då byter huvudknappen till "Klar" och tar användaren direkt tillbaka
  // till steg 5 istället för att tvinga fram genom resten av flödet.
  const [editingFromSummary, setEditingFromSummary] = useState(false)

  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(1)
  const [duration, setDuration] = useState('2 veckor')
  const [budget, setBudget] = useState(1500)
  const [foodTypes, setFoodTypes] = useState([])
  const [pantry, setPantry] = useState('')
  const [numberOfDishes, setNumberOfDishes] = useState(5)

  // planning_started ska registreras vid den FÖRSTA faktiska interaktionen
  // med formuläret – inte bara för att /planera laddas. Själva "bara en
  // gång"-spärren ägs numera av föräldern (planera/page.js) eftersom DEN
  // komponenten överlever hela sidbesöket, medan InputForm kan monteras om
  // (t.ex. vid "Försök igen" efter ett fel) – se motivering där.
  const markPlanningStarted = () => onInteraction?.()

  const availableDishes = DISHES_BY_DURATION[duration] || [5, 7]
  const budgetRange = BUDGET_RANGES[duration] || BUDGET_RANGES['2 veckor']
  const budgetValue = budget

  const handleDurationChange = (d) => {
    markPlanningStarted()
    setDuration(d)
    // Återställ antal rätter till lägsta tillgängliga för ny period
    const options = DISHES_BY_DURATION[d] || [5]
    if (!options.includes(numberOfDishes)) {
      setNumberOfDishes(options[0])
    }
    // Klampa budgeten till den nya periodens tillåtna intervall, så att
    // t.ex. 8 000 kr på "1 månad" blir 3 000 kr när man byter till "1 vecka".
    const range = BUDGET_RANGES[d]
    if (range) {
      setBudget((b) => Math.min(range.max, Math.max(range.min, b)))
    }
  }

  // Oförändrad logik: max 2 val totalt, äldsta valet byts ut vid nytt val.
  // Gäller fortfarande över BÅDA grupperna tillsammans.
  const toggleFoodType = (id) => {
    markPlanningStarted()
    setFoodTypes((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id)
      if (prev.length >= MAX_FOOD_TYPES) return [prev[1], id]
      return [...prev, id]
    })
  }

  const handleBudgetChange = (e) => {
    markPlanningStarted()
    setBudget(Number(e.target.value))
    if (error) setError('')
  }

  /** Validering per steg. Returnerar felmeddelande eller null. */
  const validateStep = (s) => {
    if (s === 1) {
      if (adults + children < 1) return 'Lägg till minst en person.'
    }
    if (s === 2) {
      if (!DURATIONS.includes(duration)) return 'Välj hur länge maten ska räcka.'
      if (budgetValue < 100) return 'Ange en budget på minst 100 kr.'
    }
    if (s === 4) {
      if (!availableDishes.includes(numberOfDishes)) return 'Välj hur många rätter du vill ha.'
    }
    // Steg 3 har inget obligatoriskt val – samma regler som tidigare.
    return null
  }

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const goNext = () => {
    markPlanningStarted()
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    // I edit-läge tar "Klar" användaren direkt tillbaka till sammanfattningen
    if (editingFromSummary) {
      setEditingFromSummary(false)
      setStep(TOTAL_STEPS)
    } else {
      setStep((s) => Math.min(TOTAL_STEPS, s + 1))
    }
    scrollTop()
  }

  const goBack = () => {
    setError('')
    // Bakåtpilen i edit-läge går tillbaka till sammanfattningen istället för
    // att kasta in användaren i en förvirrande stegsekvens. Ändringar som
    // redan gjorts ligger kvar (state uppdateras live).
    if (editingFromSummary) {
      setEditingFromSummary(false)
      setStep(TOTAL_STEPS)
    } else {
      setStep((s) => Math.max(1, s - 1))
    }
    scrollTop()
  }

  /** Anropas från "Ändra" på sammanfattningen */
  const goToStep = (s) => {
    setError('')
    setEditingFromSummary(true)
    setStep(s)
    scrollTop()
  }

  const handleSubmit = () => {
    // Payloaden är exakt densamma som i det tidigare formuläret.
    onSubmit({
      adults,
      children,
      duration,
      budget: budgetValue,
      foodTypes,
      pantry,
      numberOfDishes,
    })
  }

  // Enter i ett textfält går VIDARE till nästa steg – aldrig direkt till
  // generering. Formuläret använder heller inget <form>-element, så
  // webbläsaren kan inte implicit submitta på steg 1–4.
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      goNext()
    }
  }

  const inputClass =
    'w-full rounded-lg border border-line bg-white text-ink placeholder-ink-light/60 ' +
    'px-3.5 py-3 text-base focus:outline-none focus:border-forest transition-colors'

  const selectedFoodLabels = foodTypes
    .map((id) => ALL_FOOD_TYPES.find((t) => t.id === id)?.label)
    .filter(Boolean)

  const stepTitles = {
    1: 'Hur många ska maten räcka till?',
    2: 'Hur länge ska maten räcka?',
    3: 'Hur vill du äta?',
    4: 'Hur många olika rätter vill du ha?',
    5: 'Din plan',
  }

  return (
    <div className="w-full max-w-[660px] mx-auto">
      {/* Hero – ligger kvar på samma plats; endast formulärinnehållet byts */}
      <header className="mb-6 animate-slide-up">
        <h1 className="font-display font-semibold text-[1.75rem] leading-[1.15] md:text-4xl text-ink mb-2.5 text-balance">
          Slipp tänka på maten
        </h1>
        <p className="text-ink-light text-[0.9375rem] md:text-base leading-relaxed max-w-md">
          Få en komplett matplan med recept, inköpslista och portioner
          som räcker hela perioden.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-line p-4 md:p-6">
        <div className="flex items-start gap-1">
          {step > 1 && <BackButton onClick={goBack} />}
          <div className="flex-1 min-w-0">
            <StepProgress step={step} />
          </div>
        </div>

        {/* key={step} gör att varje steg tonar in diskret.
            prefers-reduced-motion respekteras globalt i globals.css. */}
        <div key={step} className="animate-fade-in">
          <h2 className="text-lg md:text-xl font-bold text-ink mb-4">
            {stepTitles[step]}
          </h2>

          {/* ── Steg 1: hushåll ───────────────────────────────────── */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <StepperField label="Vuxna" value={adults} onChange={(v) => { markPlanningStarted(); setAdults(v) }} min={0} />
              <StepperField label="Barn" value={children} onChange={(v) => { markPlanningStarted(); setChildren(v) }} min={0} />
            </div>
          )}

          {/* ── Steg 2: period + budget ───────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <ChoiceButton key={d} selected={duration === d} onClick={() => handleDurationChange(d)}>
                    {d}
                  </ChoiceButton>
                ))}
              </div>

              <div>
                <label htmlFor="budget-slider" className="block text-label font-semibold text-ink mb-2">
                  Budget för hela perioden
                </label>

                {/* Beloppet visas alltid som text – användaren ska aldrig
                    behöva tolka reglagets position för att förstå värdet. */}
                <div className="text-2xl font-semibold text-ink tabular-nums mb-3" aria-hidden="true">
                  {budgetValue.toLocaleString('sv-SE')} kr
                </div>

                <input
                  id="budget-slider"
                  type="range"
                  min={budgetRange.min}
                  max={budgetRange.max}
                  step={BUDGET_STEP}
                  value={budgetValue}
                  onChange={handleBudgetChange}
                  aria-label="Budget för hela perioden i kronor"
                  aria-valuetext={`${budgetValue.toLocaleString('sv-SE')} kronor`}
                  className="budget-slider w-full"
                />

                <div className="flex justify-between mt-2 text-xs text-ink-light/70 tabular-nums">
                  <span>{budgetRange.min.toLocaleString('sv-SE')} kr</span>
                  <span>{budgetRange.max.toLocaleString('sv-SE')} kr</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Steg 3: matval ────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3.5">
                <span className="text-xs text-ink-light">Välj det som passar er bäst</span>
                <span className="text-xs text-ink-light/70 tabular-nums" aria-live="polite">
                  {foodTypes.length} av {MAX_FOOD_TYPES} valda
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                {DIET_TYPES.map((type) => (
                  <ChoiceButton
                    key={type.id}
                    selected={foodTypes.includes(type.id)}
                    onClick={() => toggleFoodType(type.id)}
                  >
                    {type.label}
                  </ChoiceButton>
                ))}
              </div>

              <h3 className="text-label font-semibold text-ink mb-2.5">Vad är viktigt för dig?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PREFERENCES.map((type) => (
                  <ChoiceButton
                    key={type.id}
                    selected={foodTypes.includes(type.id)}
                    onClick={() => toggleFoodType(type.id)}
                  >
                    {type.label}
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}

          {/* ── Steg 4: antal rätter + skafferi ───────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${availableDishes.length}, 1fr)` }}
              >
                {availableDishes.map((n) => (
                  <ChoiceButton key={n} selected={numberOfDishes === n} onClick={() => setNumberOfDishes(n)}>
                    {n} rätter
                  </ChoiceButton>
                ))}
              </div>

              <div>
                <FieldLabel hint="frivilligt">Har ni något hemma?</FieldLabel>
                <input
                  type="text"
                  value={pantry}
                  onChange={(e) => { markPlanningStarted(); setPantry(e.target.value.slice(0, 500)) }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ris, pasta, kryddor, olja"
                  aria-label="Varor du redan har hemma"
                  className={inputClass}
                />
                <p className="text-xs text-ink-light/70 mt-2">
                  Det du har hemma tas bort från inköpslistan.
                </p>
              </div>
            </div>
          )}

          {/* ── Steg 5: sammanfattning ────────────────────────────── */}
          {step === 5 && (
            <div className="divide-y divide-line -mt-1">
              <SummaryRow
                label="Hushåll"
                value={`${adults} ${adults === 1 ? 'vuxen' : 'vuxna'}${children > 0 ? ` · ${children} ${children === 1 ? 'barn' : 'barn'}` : ''}`}
                onEdit={() => goToStep(1)}
              />
              <SummaryRow label="Period" value={duration} onEdit={() => goToStep(2)} />
              <SummaryRow
                label="Budget"
                value={`${budgetValue.toLocaleString('sv-SE')} kr`}
                onEdit={() => goToStep(2)}
              />
              <SummaryRow
                label="Matval"
                value={selectedFoodLabels.length > 0 ? selectedFoodLabels.join(' · ') : 'Inget särskilt valt'}
                onEdit={() => goToStep(3)}
              />
              <SummaryRow label="Rätter" value={`${numberOfDishes} rätter`} onEdit={() => goToStep(4)} />
              {pantry.trim() && (
                <SummaryRow label="Har hemma" value={pantry.trim()} onEdit={() => goToStep(4)} />
              )}
            </div>
          )}

          {/* Inline-fel nära relevant fält, läsbart för hjälpmedel */}
          {error && (
            <p role="alert" className="text-sm font-medium text-rust mt-4">
              {error}
            </p>
          )}
        </div>

        {/* Navigering – bakåt sitter numera som pil vid progressen */}
        <div className="mt-6">
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="w-full bg-forest hover:bg-forest-dark text-white font-bold
                         py-3.5 px-6 rounded-lg text-base min-h-[52px]
                         transition-colors duration-150"
            >
              {editingFromSummary ? 'Klar' : 'Fortsätt'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-forest hover:bg-forest-dark text-white font-bold
                         py-3.5 px-6 rounded-lg text-base min-h-[52px]
                         disabled:opacity-45 disabled:cursor-not-allowed
                         transition-colors duration-150
                         flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <span className="loading-spinner inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Skapar din matplan…
                </>
              ) : (
                'Generera matplan'
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-ink-light/70 mt-3">
        Gratis · Ingen inloggning
      </p>
    </div>
  )
}
