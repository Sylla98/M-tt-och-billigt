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

  return (
    <main className="min-h-screen">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-terracotta/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ochre/3 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🥘</span>
          <span className="font-display font-bold text-brown text-xl">Mätt & Billigt</span>
        </div>
        {(state === 'done' || state === 'error') && (
          <button
            onClick={handleReset}
            className="text-sm text-brown-light hover:text-terracotta transition-colors bg-white/70 px-3 py-1.5 rounded-xl shadow-warm-sm"
          >
            Ny plan
          </button>
        )}
      </header>

      {/* Main content */}
      <div className="relative z-10 px-4 pb-16 pt-4">
        {state === 'idle' || state === 'loading' ? (
          <InputForm onSubmit={handleSubmit} loading={state === 'loading'} />
        ) : state === 'error' ? (
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-warm-lg p-8 text-center">
              <div className="text-4xl mb-4">😕</div>
              <h2 className="text-xl font-display font-semibold text-brown mb-2">
                Det gick inte den här gången
              </h2>
              <p className="text-brown-light text-sm mb-6 leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={handleReset}
                className="bg-terracotta hover:bg-terracotta-dark text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-200"
              >
                Försök igen
              </button>
            </div>
          </div>
        ) : (
          <ResultView data={result} onReset={handleReset} />
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-stone-mid pb-8 px-4">
        Mätt & Billigt · Hjälper svenska familjer äta gott för mindre
      </footer>
    </main>
  )
}
