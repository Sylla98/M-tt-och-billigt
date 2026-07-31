'use client'
import { useState } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'

function formatSEK(value) {
  if (value == null || isNaN(value)) return null
  return `Cirka ${Math.round(value).toLocaleString('sv-SE')} kr`
}

function formatPackageLabel(item) {
  if (item.packageAmount != null && item.packageUnit) {
    if (item.packageUnit === 'st' && item.packageAmount > 1) return `${item.packageAmount}-pack`
    return formatQuantity(item.packageAmount, item.packageUnit)
  }
  return ''
}

/**
 * Bygger huvudraden ("vad ska köpas") och en eventuell hjälprad
 * ("hur mycket används i recepten"). De hålls medvetet isär så att
 * receptmängd aldrig ser ut att vara varan som köps.
 */
function buildDisplay(item) {
  if (item.isWeightBased) {
    const qty = formatQuantity(item.purchaseQuantity, item.purchaseUnit)
    return { main: `${item.displayName} – cirka ${qty}`, helper: null }
  }

  const packageText = formatPackageLabel(item)
  const purchaseText = item.packagesRequired != null && packageText
    ? `${item.packagesRequired} × ${packageText}`
    : packageText

  return {
    main: purchaseText ? `${item.displayName} – ${purchaseText}` : item.displayName,
    helper: `${formatQuantity(item.requiredQuantity, item.requiredUnit)} används i recepten.`,
  }
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
          const { main, helper } = buildDisplay(item)

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
                {helper && (
                  <span className="block text-xs text-stone-mid mt-0.5">{helper}</span>
                )}
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
