'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import InputForm from '@/components/InputForm'
import ResultView from '@/components/ResultView'
import SiteFooter from '@/components/SiteFooter'
import { trackEvent } from '@/utils/analytics'

export default function PlaneraPage() {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const isSubmittingRef = useRef(false) // synkron spärr mot dubbelklick

  // QA-fynd: hasTrackedStartRef låg tidigare INNE i InputForm. InputForm
  // avmonteras när state blir 'error' (se ternären längre ner) och
  // MONTERAS OM när användaren klickar "Försök igen" – då nollställdes
  // ref:en och planning_started kunde registreras flera gånger för samma
  // sidbesök. Genom att lägga spärren HÄR istället (PlaneraPage avmonteras
  // aldrig mellan idle/loading/error/done) överlever den hela besöket,
  // oavsett hur många gånger InputForm monteras om. Notera att den INTE
  // nollställs vid "Ny plan" heller – ett nytt påbörjat formulär inom
  // samma sidbesök räknas medvetet inte som ett nytt planning_started,
  // se uppdragets definition: skilja besökare från de som börjar ANVÄNDA
  // planeringssidan, inte räkna varje enskilt formulärförsök.
  const hasTrackedPlanningStartedRef = useRef(false)
  const trackPlanningStarted = () => {
    if (hasTrackedPlanningStartedRef.current) return
    hasTrackedPlanningStartedRef.current = true
    trackEvent('planning_started')
  }

  const handleSubmit = async (formData) => {
    if (isSubmittingRef.current) return // redan ett anrop på gång – ignorera
    isSubmittingRef.current = true

    setState('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Något gick fel. Försök igen.')
      }

      setResult(data)
      setState('done')
      // Skickas HÄR – efter bekräftat lyckat svar (res.ok) – aldrig vid
      // knapptryck och aldrig vid ett API-fel (se catch-blocket nedan,
      // som inte skickar något event).
      trackEvent('meal_plan_generated')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrorMessage(err.message || 'Kunde inte hämta matplanen. Kontrollera din anslutning.')
      setState('error')
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleReset = () => {
    setResult(null)
    setState('idle')
    setErrorMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Används av "Byt rätt" – slår ihop det ombyggda receptet/inköpslistan/
  // priset i den BEFINTLIGA planen istället för att generera en ny. Övriga
  // fält (numberOfDays, foodTypes, pantry, childFriendly, ...) rörs inte.
  const handleUpdateResult = (updatedFields) => {
    setResult((prev) => (prev ? { ...prev, ...updatedFields } : prev))
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Topprad – hårfin avdelare istället för dekorativ bakgrund.
          Logotypen länkar tillbaka till startsidan. */}
      <header className="border-b border-line bg-cream/90 backdrop-blur-sm sticky top-0 z-20">
        <div className={`${state === 'done' ? 'max-w-[1100px]' : 'max-w-[660px]'} mx-auto px-4 py-3.5 flex items-center justify-between transition-[max-width] duration-200`}>
          <Link href="/" className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </Link>
          {(state === 'done' || state === 'error') && (
            <button
              onClick={handleReset}
              className="text-sm font-medium text-ink-light hover:text-forest transition-colors py-1.5 px-2"
            >
              Ny plan
            </button>
          )}
        </div>
      </header>

      {/* Innehåll */}
      <div className="flex-1 px-4 pt-6 pb-12">
        {state === 'idle' || state === 'loading' ? (
          <InputForm onSubmit={handleSubmit} loading={state === 'loading'} onInteraction={trackPlanningStarted} />
        ) : state === 'error' ? (
          <div className="w-full max-w-[660px] mx-auto">
            <div className="bg-white rounded-xl border border-line p-6">
              <h1 className="text-lg font-bold text-ink mb-2">
                Matplanen kunde inte skapas
              </h1>
              <p className="text-ink-light text-sm mb-5 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={handleReset}
                className="bg-forest hover:bg-forest-dark text-white font-bold
                           py-3 px-6 rounded-lg text-sm min-h-[44px] transition-colors duration-150"
              >
                Försök igen
              </button>
            </div>
          </div>
        ) : (
          <ResultView data={result} onReset={handleReset} onUpdateResult={handleUpdateResult} />
        )}
      </div>

      {/* Footer */}
      <SiteFooter widthClass={state === 'done' ? 'max-w-[1100px]' : 'max-w-[660px]'} />
    </main>
  )
}
