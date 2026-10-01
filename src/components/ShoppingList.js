'use client'
import { useState, useRef, useEffect } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'
import { formatCountableIngredient } from '@/utils/ingredientRules'
import { trackEvent } from '@/utils/analytics'

function formatSEK(value) {
  if (value == null || isNaN(value)) return null
  return `ca ${Math.round(value).toLocaleString('sv-SE')} kr`
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
 * Delar upp raden i namn och mängd så de kan visas på var sin rad i butik.
 * Prisberäkningen (packagesRequired, packageAmount, isWeightBased m.m.)
 * fortsätter beräknas exakt som förut – det är bara PRESENTATIONEN här.
 */
function buildDisplay(item) {
  // Räknebara varor (lök, vitlök, ägg, citron, buljong ...): visa alltid
  // det naturliga antalet, oavsett hur priset räknats internt.
  if (item.requiredUnit === 'st') {
    return { name: formatCountableIngredient(item.displayName, item.requiredQuantity), amount: null }
  }

  // Lösviktsvaror: redan en sammanlagd mängd utan förpackningsantal.
  if (item.isWeightBased) {
    return {
      name: item.displayName,
      amount: `cirka ${formatQuantity(item.purchaseQuantity, item.purchaseUnit)}`,
    }
  }

  // Paketbaserade varor: total köpt mängd = antal förpackningar × storlek,
  // visad som EN sammanlagd mängd istället för "N × storlek".
  if (item.packagesRequired != null && item.packageAmount != null && item.packageUnit) {
    const totalQuantity = item.packagesRequired * item.packageAmount
    return {
      name: item.displayName,
      amount: formatShoppingTotal(totalQuantity, item.packageUnit),
    }
  }

  return { name: item.displayName, amount: null }
}

function ShoppingCategory({ category, checked, onToggle }) {
  return (
    <section className="break-inside-avoid mb-6">
      <h3 className="text-label font-semibold text-ink pb-2 mb-1 border-b border-line">
        {category.label}
      </h3>
      <ul>
        {category.items.map((item) => {
          const key = `${category.label}::${item.displayName}`
          const done = checked.includes(key)
          const { name, amount } = buildDisplay(item)

          return (
            <li key={key} className="border-b border-line/60 last:border-b-0">
              <button
                type="button"
                onClick={() => onToggle(key)}
                aria-pressed={done}
                className="w-full flex items-center gap-3 py-2.5 text-left min-h-[48px]
                           hover:bg-cream/60 -mx-2 px-2 rounded transition-colors"
              >
                {/* Checkbox – tydligt läge via både form, bock och genomstrykning */}
                <span
                  aria-hidden="true"
                  className={`w-[22px] h-[22px] rounded border-2 flex-shrink-0
                              flex items-center justify-center text-xs transition-colors
                    ${done
                      ? 'bg-forest border-forest text-white'
                      : 'border-ink-light/40 bg-white'}`}
                >
                  {done && '✓'}
                </span>

                <span className="flex-1 min-w-0">
                  <span className={`block text-sm leading-snug transition-colors
                    ${done ? 'line-through text-ink-light/70' : 'text-ink font-medium'}`}>
                    {name}
                  </span>
                  {amount && (
                    <span className={`block text-meta transition-colors
                      ${done ? 'text-ink-light/70' : 'text-ink-light'}`}>
                      {amount}
                    </span>
                  )}
                </span>

                <span className={`text-sm tabular-nums flex-shrink-0 transition-colors
                  ${done ? 'text-ink-light/70' : 'text-ink-light'}`}>
                  {formatSEK(item.lineCost)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function ShoppingList({ shoppingList, freshItemsTips = [], totalCost = null }) {
  const categories = Object.values(shoppingList || {})
  // Avbockningen delas mellan kategorierna så state inte nollställs när
  // layouten går från en till två kolumner.
  const [checked, setChecked] = useState([])

  const toggle = (key) => {
    setChecked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const totalItems = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0)

  // shopping_list_viewed (QA-granskning, döpt om från "shopping_list_opened"):
  // listan renderas automatiskt som en del av resultatsidan (ingen klick
  // krävs för att visa den), så en vanlig montering får INTE räknas som en
  // aktiv öppning (se uppdragets avsnitt 2/3). Vi mäter istället när
  // användaren faktiskt scrollar fram till och ser sektionen – en riktig,
  // aktiv "når fram till"-handling, inte bara att komponenten finns i
  // DOM:en. Namnet "opened" antydde en klickhandling som inte finns här;
  // "viewed" beskriver korrekt det som faktiskt mäts (synlighet, inte
  // interaktion). Ref-flaggan garanterar att det bara skickas en gång per
  // gång listan visas.
  const containerRef = useRef(null)
  const hasTrackedViewRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || hasTrackedViewRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedViewRef.current) {
          hasTrackedViewRef.current = true
          trackEvent('shopping_list_viewed')
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-1">
        <h2 className="text-lg font-bold text-ink">Inköpslista</h2>
        {totalCost != null && (
          <div className="text-right">
            <div className="text-xs text-ink-light">Uppskattad totalsumma</div>
            <div className="text-xl font-black text-ink tabular-nums">
              {Math.round(totalCost).toLocaleString('sv-SE')} kr
            </div>
          </div>
        )}
      </div>
      <p className="text-meta text-ink-light/70 mb-5">
        {checked.length} av {totalItems} avbockade · tryck för att bocka av
      </p>

      {/* Desktop: två kolumner via CSS-kolumner, så kategorierna flödar
          naturligt utan att någon kategori blir onödigt kort. */}
      <div className="lg:columns-2 lg:gap-10">
        {categories.map((cat) => (
          <ShoppingCategory key={cat.label} category={cat} checked={checked} onToggle={toggle} />
        ))}
      </div>

      {freshItemsTips.length > 0 && (
        <div className="mt-2 pt-5 border-t border-line">
          <h3 className="text-label font-semibold text-ink mb-2">Tips för färskvaror</h3>
          <ul className="space-y-1.5">
            {freshItemsTips.map((tip, i) => (
              <li key={i} className="text-sm text-ink-light leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-ink-light/70 mt-5">
        Prisuppskattningen bygger på generella svenska matpriser och kan variera mellan butiker.
      </p>
    </div>
  )
}
