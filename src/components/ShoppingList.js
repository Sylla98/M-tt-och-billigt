'use client'
import { useState } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'
import { formatCountableIngredient } from '@/utils/ingredientRules'

function formatSEK(value) {
  if (value == null || isNaN(value)) return null
  return `Cirka ${Math.round(value).toLocaleString('sv-SE')} kr`
}

// Volym under 1 liter visas i dl i inköpslistan (t.ex. 800 ml → 8 dl).
// formatQuantity.js rörs inte – den delen är en delad funktion som även
// receptvyn använder, så dl-omvandlingen hålls lokal här istället.
function formatShoppingTotal(quantity, unit) {
  const u = (unit || '').toLowerCase()
  if (u === 'ml' && quantity < 1000) {
    return formatQuantity(quantity / 100, 'dl')
  }
  return formatQuantity(quantity, unit)
}

/**
 * Bygger huvudraden för en inköpslistrad: enbart den totala mängd som
 * behöver köpas, inte antal förpackningar. Prisberäkningen (packagesRequired,
 * packageAmount, isWeightBased m.m.) fortsätter beräknas exakt som förut –
 * det är bara PRESENTATIONEN som förenklas här.
 */
function buildDisplay(item) {
  // Räknebara varor (lök, vitlök, ägg, citron, buljong ...): visa alltid
  // det naturliga antalet, oavsett om prisberäkningen internt räknat om
  // det till vikt eller förpackningar.
  if (item.requiredUnit === 'st') {
    return { main: formatCountableIngredient(item.displayName, item.requiredQuantity) }
  }

  // Lösviktsvaror: redan en sammanlagd mängd utan förpackningsantal.
  if (item.isWeightBased) {
    const qty = formatQuantity(item.purchaseQuantity, item.purchaseUnit)
    return { main: `${item.displayName} – cirka ${qty}` }
  }

  // Paketbaserade varor: total köpt mängd = antal förpackningar × storlek,
  // visad som EN sammanlagd mängd istället för "N × storlek".
  if (item.packagesRequired != null && item.packageAmount != null && item.packageUnit) {
    const totalQuantity = item.packagesRequired * item.packageAmount
    return { main: `${item.displayName} – ${formatShoppingTotal(totalQuantity, item.packageUnit)}` }
  }

  return { main: item.displayName }
}

function ShoppingCategory({ category }) {
  const [checked, setChecked] = useState([])

  const toggle = (key) => {
    setChecked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
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
          const key = item.displayName
          const done = checked.includes(key)
          const { main } = buildDisplay(item)

          return (
            <li
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-start gap-3 cursor-pointer group text-sm rounded-xl px-3 py-2 transition-all duration-150
                ${done ? 'bg-sage-light/20' : 'hover:bg-stone-warm/50'}`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150 mt-0.5
                ${done ? 'bg-sage border-sage' : 'border-stone-mid group-hover:border-terracotta'}`}>
                {done && <span className="text-white text-xs">✓</span>}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block leading-snug transition-all duration-150 ${done ? 'line-through text-stone-mid' : 'text-brown-light'}`}>
                  {main}
                </span>
              </span>
              <span className="text-xs font-medium flex-shrink-0 mt-0.5 text-stone-mid">
                {formatSEK(item.lineCost)}
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

      {/* Prisreservation */}
      <p className="text-xs text-stone-mid text-center px-2">
        Prisuppskattningen bygger på generella svenska matpriser och kan variera mellan butiker.
      </p>
    </div>
  )
}
