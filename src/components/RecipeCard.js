'use client'
import { useState } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'

// Gradients roterar baserat på index
const GRADIENTS = [
  'from-terracotta to-ochre',
  'from-ochre to-sage',
  'from-sage to-ochre-light',
  'from-terracotta-light to-terracotta-dark',
  'from-ochre-light to-terracotta',
  'from-sage to-terracotta',
  'from-ochre to-terracotta-light',
]

// Emojis roterar baserat på index
const EMOJIS = ['🍝', '🍗', '🫘', '🥘', '🧀', '🥗', '🍲', '🌮', '🥩', '🍜', '🫕', '🥙']

export default function RecipeCard({ recipe, index }) {
  const [open, setOpen] = useState(false)
  const delay = `animate-slide-up-delay-${Math.min(index + 1, 5)}`

  // Stöd båda dataformat: från AI (title) och från mock (name)
  const title = recipe.title || recipe.name || 'Recept'
  const servings = recipe.servings || recipe.portions || 0
  const time = recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} min` : (recipe.time || '')
  const freezable = recipe.freezerFriendly ?? recipe.freezable ?? false
  const servedWith = recipe.servedWith || ''
  const gradient = recipe.gradient || GRADIENTS[index % GRADIENTS.length]
  const emoji = recipe.emoji || EMOJIS[index % EMOJIS.length]

  // Ingredienser: stöd både {name, quantity, unit} och strängar
  const ingredients = (recipe.ingredients || []).map(ing => {
    if (typeof ing === 'string') return ing
    const formatted = formatQuantity(ing.quantity, ing.unit || '')
    return formatted ? `${formatted} ${ing.name}`.trim() : ing.name
  })

  // Instruktioner: stöd array av strängar
  const instructions = recipe.instructions || recipe.steps || []

  // Hållbarhet
  const storage = recipe.storage ||
    [recipe.fridgeStorage && `Kyl: ${recipe.fridgeStorage}`,
     recipe.freezerStorage && `Frys: ${recipe.freezerStorage}`]
    .filter(Boolean).join(' · ') || ''

  return (
    <div className={`bg-white rounded-3xl shadow-warm-md overflow-hidden ${delay}`}>
      {/* Image area */}
      <div className={`relative h-40 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 50%)',
        }} />
        <span className="text-6xl drop-shadow-md">{emoji}</span>
        {freezable && (
          <span className="absolute top-3 right-3 bg-white/90 text-blue-500 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            ❄️ Kan frysas
          </span>
        )}
      </div>

      {/* Compact meal card info */}
      <div className="p-5">
        <h3 className="text-xl font-display text-brown font-semibold leading-tight mb-1">
          {title}
        </h3>
        {recipe.description && (
          <p className="text-xs text-stone-mid mb-1 leading-relaxed">{recipe.description}</p>
        )}
        {servedWith && (
          <p className="text-sm text-stone-mid mb-3">{servedWith}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {servings > 0 && (
            <span className="inline-flex items-center gap-1 bg-sage-light/30 text-sage px-2.5 py-0.5 rounded-full text-xs font-medium">
              🍽 {servings} portioner
            </span>
          )}
          {time && (
            <span className="inline-flex items-center gap-1 bg-ochre-light/30 text-brown-light px-2.5 py-0.5 rounded-full text-xs font-medium">
              ⏱ {time}
            </span>
          )}
          {(recipe.childFriendly) && (
            <span className="inline-flex items-center gap-1 bg-sage-light/30 text-sage px-2.5 py-0.5 rounded-full text-xs font-medium">
              👧 Barnvänligt
            </span>
          )}
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
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brown-light">
                    <span className="w-1.5 h-1.5 bg-terracotta rounded-full mt-1.5 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-sage text-white rounded-full flex items-center justify-center text-xs">👩‍🍳</span>
                Gör så här
              </h4>
              <ol className="space-y-3">
                {instructions.map((step, i) => (
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

          {/* Storage */}
          {storage && (
            <div className="px-6 pb-5">
              <div className="bg-warm rounded-2xl px-4 py-3 flex items-center gap-3">
                <span>🕐</span>
                <span className="text-sm text-brown-light">
                  <strong className="text-brown">Hållbarhet:</strong> {storage}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
