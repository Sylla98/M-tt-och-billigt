'use client'
import { useState } from 'react'
import { formatIngredientString } from '@/utils/formatQuantity'

function ShoppingCategory({ category }) {
  const [checked, setChecked] = useState([])

  const toggle = (item) => {
    setChecked(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  return (
    <div className="mb-6 last:mb-0">
      <h4 className="font-semibold text-brown mb-2 flex items-center gap-2 text-sm">
        <span>{category.emoji}</span>
        {category.label}
      </h4>
      <ul className="space-y-1.5">
        {category.items.map((item) => {
          const done = checked.includes(item)
          return (
            <li
              key={item}
              onClick={() => toggle(item)}
              className={`flex items-center gap-3 cursor-pointer group text-sm rounded-xl px-3 py-2 transition-all duration-150
                ${done ? 'bg-sage-light/20' : 'hover:bg-stone-warm/50'}`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150
                ${done ? 'bg-sage border-sage' : 'border-stone-mid group-hover:border-terracotta'}`}>
                {done && <span className="text-white text-xs">✓</span>}
              </span>
              <span className={`leading-snug transition-all duration-150 ${done ? 'line-through text-stone-mid' : 'text-brown-light'}`}>
                {formatIngredientString(item)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function ShoppingList({ shoppingList, freshItemsTips = [] }) {
  const categories = Object.values(shoppingList || {})

  return (
    <div className="space-y-5 animate-slide-up-delay-2">
      {/* Main list */}
      <div className="bg-white rounded-3xl shadow-warm-md p-6">
        <h3 className="text-xl font-display text-brown font-semibold mb-1">
          🛒 Inköpslista
        </h3>
        <p className="text-sm text-stone-mid mb-5">
          Tryck för att bocka av – spara till butiken
        </p>
        <div className="divide-y divide-stone-warm">
          {categories.map((cat) => (
            <div key={cat.label} className="py-4 first:pt-0 last:pb-0">
              <ShoppingCategory category={cat} />
            </div>
          ))}
        </div>
      </div>

      {/* Fresh items tips */}
      {freshItemsTips.length > 0 && (
        <div className="bg-ochre-light/25 rounded-3xl p-6 border border-ochre-light/50">
          <h3 className="font-semibold text-brown mb-3 flex items-center gap-2">
            🥬 Tips för färskvaror
          </h3>
          <ul className="space-y-2">
            {freshItemsTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brown-light">
                <span className="text-ochre mt-0.5 flex-shrink-0">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
