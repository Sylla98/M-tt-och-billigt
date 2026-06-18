'use client'
import { useState } from 'react'
import InputForm from '@/components/InputForm'
import ResultView from '@/components/ResultView'
import { mockMealPlan } from '@/data/mockData'

export default function Home() {
  const [state, setState] = useState('idle') // idle | loading | done
  const [result, setResult] = useState(null)

  const handleSubmit = (formData) => {
    setState('loading')
    // Simulate API delay – swap this for real API call later
    setTimeout(() => {
      const childFriendly = formData.foodTypes?.includes('familjevanligt')
      setResult({ ...mockMealPlan, childFriendly })
      setState('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 1800)
  }

  const handleReset = () => {
    setResult(null)
    setState('idle')
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
        {state === 'done' && (
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
