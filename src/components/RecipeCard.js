'use client'
import { useState } from 'react'

export default function RecipeCard({ recipe, index }) {
  const [open, setOpen] = useState(false)
  const delay = `animate-slide-up-delay-${Math.min(index + 1, 5)}`

  return (
    <div className={`bg-white rounded-3xl shadow-warm-md overflow-hidden ${delay}`}>
      {/* Image area */}
      <div className={`relative h-40 bg-gradient-to-br ${recipe.gradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 50%)',
        }} />
        <span className="text-6xl drop-shadow-md">{recipe.emoji}</span>
        {recipe.freezable && (
          <span className="absolute top-3 right-3 bg-white/90 text-blue-500 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            ❄️ Kan frysas
          </span>
        )}
      </div>

      {/* Compact meal card info */}
      <div className="p-5">
        <h3 className="text-xl font-display text-brown font-semibold leading-tight mb-1">
          {recipe.name}
        </h3>
        <p className="text-sm text-stone-mid mb-3">{recipe.servedWith}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 bg-sage-light/30 text-sage px-2.5 py-0.5 rounded-full text-xs font-medium">
            🍽 {recipe.portions} portioner
          </span>
          <span className="inline-flex items-center gap-1 bg-ochre-light/30 text-brown-light px-2.5 py-0.5 rounded-full text-xs font-medium">
            ⏱ {recipe.time}
          </span>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="w-full bg-warm hover:bg-stone-warm text-brown font-medium py-3 rounded-xl
                     transition-colors duration-150 flex items-center justify-center gap-2 text-sm"
        >
          {open ? 'Dölj recept' : 'Visa recept'}
          <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>↓</span>
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-stone-warm">
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Ingredients */}
            <div>
              <h4 className="font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-terracotta text-white rounded-full flex items-center justify-center text-xs">🛒</span>
                Ingredienser
              </h4>
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brown-light">
                    <span className="w-1.5 h-1.5 bg-terracotta rounded-full mt-1.5 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            {/* Steps */}
            <div>
              <h4 className="font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-sage text-white rounded-full flex items-center justify-center text-xs">👩‍🍳</span>
                Gör så här
              </h4>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-brown-light">
                    <span className="flex-shrink-0 w-5 h-5 bg-stone-warm text-brown rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Storage reminder */}
          <div className="px-6 pb-5">
            <div className="bg-warm rounded-2xl px-4 py-3 flex items-center gap-3">
              <span>🕐</span>
              <span className="text-sm text-brown-light"><strong className="text-brown">Hållbarhet:</strong> {recipe.storage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
