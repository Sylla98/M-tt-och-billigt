'use client'
import { useEffect, useRef } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'
import { getIngredientRule, formatCountableIngredient, toRecipeViewLiquid } from '@/utils/ingredientRules'

/**
 * Receptdetalj som fristående MODAL – används ENDAST på desktop
 * (se ResultView.js: min-width 1024px, samma brytpunkt som receptgridens
 * 2-kolumnsläge, `lg:grid-cols-2`).
 *
 * VARFÖR denna komponent finns:
 * Tidigare öppnades recept på desktop genom att RecipeCard expanderade
 * INLINE i griden. Det orsakade tre problem samtidigt:
 *  1. Hela RADEN bytte layout (grid → vertikal stapel) så snart ETT kort
 *     öppnades, vilket flyttade GRANNKORTET – upplevelsen av att receptet
 *     "öppnades i relation till kortet bredvid".
 *  2. RecipeCard.js:s scrollIntoView-effekt kördes på ALLA skärmstorlekar,
 *     vilket förflyttade sidan vid varje öppning/stängning.
 *  3. Kortets egen höjdförändring var i sig en layoutförskjutning.
 *
 * Den här modalen är en ren overlay (fixed, utanför dokumentflödet) och
 * delar INGEN state eller logik med RecipeCard.js – mobilens
 * inline-expansion i RecipeCard.js är därför helt oberörd och kan aldrig
 * påverkas av något som händer här. Se ResultView.js för hur desktop
 * respektive mobil routas till olika beteenden.
 */
export default function RecipeDetailModal({ recipe, onClose, returnFocusRef }) {
  const closeButtonRef = useRef(null)

  // ── Bevara exakt scrollposition ──────────────────────────────────────
  // Explicit spara/återställ istället för att bara förlita sig på
  // webbläsarens standardbeteende vid overflow:hidden – robust mot
  // eventuella bieffekter av fokusflytt eller scrollbar-bredd som
  // försvinner/kommer tillbaka.
  useEffect(() => {
    const savedScrollY = window.scrollY
    return () => {
      window.scrollTo({ top: savedScrollY, behavior: 'auto' })
    }
  }, [])

  // Låser bakgrundsscroll medan modalen är öppen. Modalens EGET innehåll
  // scrollar internt (overflow-y-auto på dialogrutan nedan) – bara
  // document/body låses.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Fokus in i modalen vid öppning – preventScroll så själva fokusflytten
  // aldrig kan orsaka en webbläsarscroll. Fokus tillbaka till knappen som
  // öppnade modalen vid stängning (samma skäl).
  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true })
    return () => {
      returnFocusRef?.current?.focus?.({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape stänger modalen.
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!recipe) return null

  // ── Samma formatteringslogik som RecipeCard.js:s inline-panel ────────
  // Medvetet duplicerad (inte extraherad till en delad komponent) för att
  // garantera att RecipeCard.js – och därmed mobilbeteendet – förblir
  // exakt oförändrat. Källan för varje regel: ingredientRules.js.
  const title = recipe.title || recipe.name || 'Recept'
  const servings = recipe.servings || recipe.portions || 0
  const time = recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} min` : (recipe.time || '')
  const freezable = recipe.freezerFriendly ?? recipe.freezable ?? false
  const servedWith = recipe.servedWith || ''

  const occurrenceCount = recipe.occurrenceCount || 1
  const servingsList = recipe.servingsList || [servings]
  const minServings = Math.min(...servingsList)
  const maxServings = Math.max(...servingsList)
  const portionsText =
    occurrenceCount <= 1
      ? `${servings} portioner`
      : minServings === maxServings
      ? `${minServings} portioner · laga ${occurrenceCount} gånger`
      : `${minServings}–${maxServings} portioner · laga ${occurrenceCount} gånger`

  const metaParts = [time, portionsText, freezable ? 'kan frysas' : null].filter(Boolean)

  const ingredients = (recipe.ingredients || []).map((ing) => {
    if (typeof ing === 'string') return ing
    const rule = getIngredientRule(ing.name, ing.unit)
    if (rule.isCountable) {
      return formatCountableIngredient(ing.name, ing.quantity)
    }
    const { quantity, unit } = toRecipeViewLiquid(ing.name, ing.quantity, ing.unit)
    const formatted = formatQuantity(quantity, unit || '')
    return formatted ? `${formatted} ${ing.name}`.trim() : ing.name
  })

  const instructions = recipe.instructions || recipe.steps || []

  const storage = recipe.storage ||
    [recipe.fridgeStorage && `Kyl: ${recipe.fridgeStorage}`,
     recipe.freezerStorage && `Frys: ${recipe.freezerStorage}`]
    .filter(Boolean).join(' · ') || ''

  const titleId = `recept-modal-${recipe.id}`

  return (
    <div className="fixed inset-0 z-50 items-center justify-center hidden lg:flex">
      {/* Bakgrund – tydlig men diskret, stänger vid klick utanför */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/45"
      />

      {/* Dialogruta – centrerad, egen intern scroll om receptet är högre
          än viewporten. Påverkar aldrig receptgridens layout, eftersom
          den ligger UTANFÖR dokumentflödet (fixed). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface w-full max-w-2xl mx-4 rounded-2xl
                   max-h-[85vh] overflow-y-auto animate-fade-in-fast"
      >
        <div className="sticky top-0 z-10 bg-surface flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <h3 id={titleId} className="font-display font-semibold text-xl text-ink leading-tight">
            {title}
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Stäng recept"
            className="flex-shrink-0 w-9 h-9 -mr-1.5 -mt-1 flex items-center justify-center
                       rounded-lg text-ink-light hover:text-ink hover:bg-cream
                       transition-colors text-lg leading-none
                       [-webkit-tap-highlight-color:transparent]"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="px-6 pb-6">
          {recipe.description && (
            <p className="text-sm text-ink-light leading-relaxed mb-2.5">
              {recipe.description}
            </p>
          )}

          <p className="text-meta text-ink-light/70">
            {metaParts.join(' · ')}
          </p>
          {servedWith && (
            <p className="text-meta text-ink-light/70 mt-0.5">{servedWith}</p>
          )}

          <div className="grid gap-6 md:grid-cols-12 mt-6 pt-5 border-t border-line">
            <div className="md:col-span-4">
              <h4 className="text-label font-semibold text-ink mb-3 pb-2 border-b border-line">
                Ingredienser
              </h4>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-ink-light leading-snug">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-8">
              <h4 className="text-label font-semibold text-ink mb-3 pb-2 border-b border-line">
                Gör så här
              </h4>
              <ol className="space-y-3.5">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink-light">
                    <span className="flex-shrink-0 w-5 text-forest font-semibold tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="leading-relaxed max-w-[60ch]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {storage && (
            <div className="mt-6 pt-4 border-t border-line">
              <h4 className="text-label font-semibold text-ink mb-1">Förvaring</h4>
              <p className="text-sm text-ink-light">{storage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
