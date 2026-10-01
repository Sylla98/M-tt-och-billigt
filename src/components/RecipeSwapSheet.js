'use client'
import { useState, useEffect, useMemo } from 'react'
import { selectSwapAlternatives } from '@/utils/selectRecipes'
import { getRecipeImage, FALLBACK_IMAGE } from '@/utils/getRecipeImage'

const PAGE_SIZE = 3

function AlternativeThumb({ recipe }) {
  const [imgState, setImgState] = useState('primary')
  const primaryImage = recipe.image || getRecipeImage(recipe)
  const imageSrc = imgState === 'primary' ? primaryImage : FALLBACK_IMAGE

  return (
    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-cream">
      {imgState !== 'none' ? (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          onError={() => setImgState((s) => (s === 'primary' ? 'fallback' : 'none'))}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center px-1">
          <span className="text-[9px] text-ink-light/70 text-center leading-tight">{recipe.name}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Byt-rätt-dialog: bottom sheet på mobil, centrerad modal på desktop.
 * Samma komponent, bara responsiva klasser skiljer presentationen.
 */
export default function RecipeSwapSheet({
  open,
  onClose,
  currentRecipe,   // { id: baseId, title }
  foodTypes,
  excludeIds,      // alla receptid:n som redan finns i planen (inkl. currentRecipe)
  pantryTerms,
  budgetPerServing,
  referenceRecipe, // fullständigt receptobjekt för currentRecipe, för pris-/tidnärhet
  onSelect,        // (newRecipeId) => void
}) {
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  const [entered, setEntered] = useState(false)
  const [selecting, setSelecting] = useState(false)

  // Nollställ "sessionen" varje gång dialogen öppnas för ett nytt recept.
  useEffect(() => {
    if (open) {
      setShownCount(PAGE_SIZE)
      setSelecting(false)
    }
  }, [open, currentRecipe?.id])

  // Enkel in-transition (bara mjuk uppåtglidning/fade in – ingen animerad
  // stängning, för stabilitetens skull).
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
  }, [open])

  // Låser bakgrundsscroll medan dialogen är öppen.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  // Esc stänger dialogen.
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const rankedAlternatives = useMemo(() => {
    if (!open) return []
    return selectSwapAlternatives({
      foodTypes,
      excludeIds,
      budgetPerServing,
      pantryTerms,
      referenceRecipe,
    })
  }, [open, currentRecipe?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const visible = rankedAlternatives.slice(0, shownCount)
  const hasMore = rankedAlternatives.length > shownCount

  const handlePick = (recipeId) => {
    if (selecting) return // skydd mot dubbelklick/snabba tryck (edge case F)
    setSelecting(true)
    onSelect(recipeId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Bakgrund – tonas ned, stänger vid klick utanför */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-ink/45 transition-opacity duration-300
                    ${entered ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Sheet (mobil) / modal (desktop) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-surface w-full md:max-w-md md:mx-4 md:rounded-2xl
                    rounded-t-2xl max-h-[85vh] overflow-y-auto
                    transition-all duration-300
                    ${entered
                      ? 'translate-y-0 md:opacity-100 md:scale-100'
                      : 'translate-y-full md:translate-y-0 md:opacity-0 md:scale-95'}`}
      >
        {/* Dekorativt handtag – vanlig visuell konvention för bottom sheets */}
        <div aria-hidden="true" className="md:hidden w-10 h-1 rounded-full bg-line mx-auto mt-3 mb-1" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2 id="swap-sheet-title" className="text-lg font-semibold text-ink leading-tight">
              Byt ut recept
            </h2>
            <button
              onClick={onClose}
              aria-label="Stäng"
              className="flex-shrink-0 w-9 h-9 -mr-1.5 -mt-1 flex items-center justify-center
                         rounded-lg text-ink-light/70 hover:text-ink hover:bg-cream
                         transition-colors text-lg leading-none
                         [-webkit-tap-highlight-color:transparent]"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          {currentRecipe?.title && (
            <p className="text-sm text-ink-light mb-4">
              Ersätter <span className="font-medium text-ink">{currentRecipe.title}</span>
            </p>
          )}

          {visible.length === 0 ? (
            <p className="text-sm text-ink-light py-6 text-center">
              Vi hittade inga andra recept som passar dina val just nu.
            </p>
          ) : (
            <div className="space-y-2.5">
              {visible.map(({ recipe, costPerServing }) => (
                <button
                  key={recipe.id}
                  onClick={() => handlePick(recipe.id)}
                  disabled={selecting}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-line
                             hover:border-forest/40 active:bg-cream/60 transition-colors
                             text-left disabled:opacity-50 disabled:pointer-events-none
                             min-h-[76px]
                             [-webkit-tap-highlight-color:transparent]"
                >
                  <AlternativeThumb recipe={recipe} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink leading-snug">
                      {recipe.name}
                    </div>
                    <div className="text-meta text-ink-light/70 mt-0.5">
                      {recipe.totalTimeMinutes} min · ca {Math.round(costPerServing)} kr/portion
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasMore && (
            <button
              onClick={() => setShownCount((c) => c + PAGE_SIZE)}
              className="mt-3 w-full text-center text-sm font-medium text-ink
                         hover:underline underline-offset-4 min-h-[44px]
                         [-webkit-tap-highlight-color:transparent]"
            >
              Visa andra förslag
            </button>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-sm text-ink-light/70
                       hover:text-ink transition-colors min-h-[44px]
                       [-webkit-tap-highlight-color:transparent]"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  )
}
