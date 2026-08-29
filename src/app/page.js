'use client'
import { useState, useRef } from 'react'
import InputForm from '@/components/InputForm'
import ResultView from '@/components/ResultView'

export default function Home() {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const isSubmittingRef = useRef(false) // synkron spärr mot dubbelklick

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
      {/* Topprad – hårfin avdelare istället för dekorativ bakgrund */}
      <header className="border-b border-line bg-cream/90 backdrop-blur-sm sticky top-0 z-20">
        <div className={`${state === 'done' ? 'max-w-[1100px]' : 'max-w-[660px]'} mx-auto px-4 py-3.5 flex items-center justify-between transition-[max-width] duration-200`}>
          <span className="font-display font-bold text-brown text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </span>
          {(state === 'done' || state === 'error') && (
            <button
              onClick={handleReset}
              className="text-sm text-brown-light hover:text-terracotta transition-colors py-1.5 px-2"
            >
              Ny plan
            </button>
          )}
        </div>
      </header>

      {/* Innehåll */}
      <div className="flex-1 px-4 pt-6 pb-12">
        {state === 'idle' || state === 'loading' ? (
          <InputForm onSubmit={handleSubmit} loading={state === 'loading'} />
        ) : state === 'error' ? (
          <div className="w-full max-w-[660px] mx-auto">
            <div className="bg-white rounded-xl border border-line p-6">
              <h1 className="text-lg font-semibold text-brown mb-2">
                Matplanen kunde inte skapas
              </h1>
              <p className="text-brown-light text-sm mb-5 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={handleReset}
                className="bg-terracotta hover:bg-terracotta-dark text-white font-semibold
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
      <footer className="border-t border-line">
        <p className={`${state === 'done' ? 'max-w-[1100px]' : 'max-w-[660px]'} mx-auto px-4 py-5 text-xs text-stone-mid`}>
          Mätt &amp; Billigt · Hjälper svenska familjer äta gott för mindre
        </p>
      </footer>
    </main>
  )
}
