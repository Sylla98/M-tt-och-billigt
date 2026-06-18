'use client'
import { useState } from 'react'

const FOOD_TYPES = [
  { id: 'familjevanligt', label: 'Familjevänligt', emoji: '👨‍👩‍👧' },
  { id: 'blandkost', label: 'Blandkost', emoji: '🍽' },
  { id: 'kott-gront', label: 'Kött & grönt', emoji: '🥩' },
  { id: 'vegetariskt', label: 'Vegetariskt', emoji: '🥦' },
  { id: 'somrigt', label: 'Somrigt & fräscht', emoji: '🍅' },
  { id: 'proteinrikt', label: 'Proteinrikt', emoji: '💪' },
]

const DURATIONS = ['1 vecka', '2 veckor', '1 månad']

function StepperField({ label, value, onChange, min = 0 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brown mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-11 h-11 rounded-xl bg-stone-warm hover:bg-stone-mid/40 text-brown text-lg font-semibold transition-colors flex items-center justify-center"
        >
          −
        </button>
        <div className="w-12 text-center text-xl font-display font-bold text-brown">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-11 h-11 rounded-xl bg-stone-warm hover:bg-stone-mid/40 text-brown text-lg font-semibold transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function InputForm({ onSubmit, loading }) {
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(1)
  const [duration, setDuration] = useState('2 veckor')
  const [budget, setBudget] = useState(1500)
  const [foodTypes, setFoodTypes] = useState([])
  const [pantry, setPantry] = useState('')

  const toggleFoodType = (id) => {
    setFoodTypes((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id)
      if (prev.length >= 2) return [prev[1], id] // keep max 2, swap oldest
      return [...prev, id]
    })
  }

  const handleSubmit = () => {
    onSubmit({ adults, children, duration, budget, foodTypes, pantry })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hero text */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="inline-flex items-center gap-2 bg-ochre-light/40 text-brown px-4 py-1.5 rounded-full text-sm font-medium mb-5">
          🏡 Fri att använda – ingen inloggning
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-brown leading-tight mb-4 text-balance">
          Slipp tänka<br />
          <span className="text-terracotta">på maten</span>
        </h1>
        <p className="text-brown-light text-lg leading-relaxed max-w-lg mx-auto text-balance">
          Få en komplett matplan med recept, inköpslista och portioner
          som räcker hela perioden.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-3xl shadow-warm-lg p-6 md:p-8 animate-slide-up-delay-1 space-y-7">
        {/* Adults & children */}
        <div className="grid grid-cols-2 gap-4">
          <StepperField label="Antal vuxna" value={adults} onChange={setAdults} min={1} />
          <StepperField label="Antal barn" value={children} onChange={setChildren} min={0} />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-brown mb-2">
            Hur länge ska maten räcka?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  duration === d
                    ? 'bg-terracotta text-white shadow-warm-sm'
                    : 'bg-stone-warm text-brown-light hover:bg-stone-mid/30'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-brown mb-2">Budget</label>
          <div className="relative">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min={0}
              step={50}
              className="w-full rounded-2xl border-2 border-stone-warm bg-cream text-brown
                         p-4 pr-14 text-lg font-semibold
                         focus:outline-none focus:border-terracotta focus:bg-white
                         transition-all duration-200"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brown-light text-sm font-medium">
              kr
            </span>
          </div>
        </div>

        {/* Food types */}
        <div>
          <label className="block text-sm font-medium text-brown mb-2">
            Vad vill du ha för typ av mat? <span className="text-stone-mid font-normal">(välj max 2)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FOOD_TYPES.map((type) => {
              const selected = foodTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleFoodType(type.id)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-medium text-left transition-all duration-150 ${
                    selected
                      ? 'bg-sage text-white shadow-warm-sm'
                      : 'bg-stone-warm text-brown-light hover:bg-stone-mid/30'
                  }`}
                >
                  <span>{type.emoji}</span>
                  <span className="leading-tight">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Pantry (optional) */}
        <div>
          <label className="block text-sm font-medium text-brown mb-2">
            Har ni något hemma? <span className="text-stone-mid font-normal">(frivilligt)</span>
          </label>
          <input
            type="text"
            value={pantry}
            onChange={(e) => setPantry(e.target.value)}
            placeholder="Exempel: ris, pasta, kryddor, olja"
            className="w-full rounded-2xl border-2 border-stone-warm bg-cream text-brown placeholder-stone-mid
                       p-4 text-base
                       focus:outline-none focus:border-terracotta focus:bg-white
                       transition-all duration-200"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-terracotta hover:bg-terracotta-dark text-white font-semibold 
                     py-4 px-8 rounded-2xl text-lg
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 active:scale-[0.98]
                     flex items-center justify-center gap-3 shadow-warm-md hover:shadow-warm-lg"
        >
          {loading ? (
            <>
              <span className="loading-spinner inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Skapar din matplan...
            </>
          ) : (
            <>
              <span>Generera matplan</span>
              <span className="text-xl">→</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-stone-mid">
          Tar ca 10 sekunder · Gratis · Ingen inloggning
        </p>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 animate-slide-up-delay-2">
        {[
          { icon: '⏱', text: 'Sparar tid' },
          { icon: '💰', text: 'Håller budget' },
          { icon: '✅', text: 'Maten räcker' },
        ].map((badge) => (
          <div key={badge.text} className="flex items-center gap-2 bg-white/70 rounded-xl px-4 py-2 text-sm text-brown-light shadow-warm-sm">
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
