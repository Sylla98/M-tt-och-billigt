'use client'
import { useState, useEffect, useRef } from 'react'
import RecipeCard from './RecipeCard'
import ShoppingList from './ShoppingList'
import RecipeSwapSheet from './RecipeSwapSheet'
import RecipeDetailModal from './RecipeDetailModal'
import { RECIPES } from '@/data/recipes'
import { rebuildPlanData } from '@/utils/selectRecipes'
import { trackEvent } from '@/utils/analytics'

// Samma brytpunkt som receptgridens 2-kolumnsläge (`lg:grid-cols-2` nedan)
// – "desktop" i det här sammanhanget betyder specifikt "griden visar två
// kolumner", eftersom DET är scenariot där inline-expansion tidigare
// flyttade grannkortet. Börjar som false (mobilt/inline-beteende) för att
// undvika hydreringsmissmatch server/klient; uppdateras direkt efter mount.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mql.matches)
    const handler = (e) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function ResultView({ data, onReset, onUpdateResult }) {
  const {
    recipes = [],
    shoppingList = {},
    freshItemsTips = [],
    totalServings = 0,
    numberOfDays = 14,
    childFriendly = false,
    pricing = null,
    foodTypes = [],
    pantry = '',
    pantryItemsUsed = [],
  } = data

  // Ett recept kan förekomma flera gånger som separata tillagningstillfällen
  // (se route.js batchlogik) – då får senare tillfällen ett id på formen
  // "receptid-tillfalle-2". Central hjälpfunktion för att hitta det
  // ursprungliga receptid:t, återanvänd nedan istället för att upprepa
  // samma regex på flera ställen.
  const getBaseRecipeId = (id) => (id || '').replace(/-tillfalle-\d+$/, '')

  // Slår ihop alla tillagningstillfällen av samma recept till ETT kort.
  // Inköpslistan är opåverkad och räknar fortfarande alla tillfällen.
  const uniqueRecipes = (() => {
    const order = []
    const map = new Map()
    for (const r of recipes) {
      const baseId = getBaseRecipeId(r.id)
      if (!map.has(baseId)) {
        map.set(baseId, { ...r, id: baseId, servingsList: [r.servings] })
        order.push(baseId)
      } else {
        map.get(baseId).servingsList.push(r.servings)
      }
    }
    return order.map((id) => {
      const entry = map.get(id)
      return { ...entry, occurrenceCount: entry.servingsList.length }
    })
  })()

  const cost = pricing ? Math.round(pricing.estimatedTotalCost) : null
  const diff = pricing ? Math.round(Math.abs(pricing.budgetDifference)) : null
  const withinBudget = pricing?.isWithinBudget

  // Vilka receptkort som är öppna hålls här (inte inne i RecipeCard) så att
  // ResultView kan avgöra hur RADEN de tillhör ska layoutas – se
  // openRecipeIds-resonemanget vid receptgriden nedan. Detta är ENDAST
  // mobilens/1-kolumnslägets inline-expansion – helt orört av desktopfixen
  // nedan.
  const [openRecipeIds, setOpenRecipeIds] = useState(() => new Set())
  const toggleRecipe = (id) => {
    setOpenRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id) // stängning – inget event
      } else {
        next.add(id)
        trackEvent('recipe_opened') // faktisk öppning, inte bara rendering
      }
      return next
    })
  }

  // ── Desktop: receptdetalj som fristående modal ──────────────────────────
  // Se RecipeDetailModal.js för varför. isDesktop avgör ENDAST vilken av de
  // två helt separata kodvägarna en klick-handling routas till – RecipeCard
  // ändras inte alls, och openRecipeIds (mobilens state) rörs aldrig här.
  const isDesktop = useIsDesktop()
  const [desktopModalRecipe, setDesktopModalRecipe] = useState(null)
  const lastTriggerRef = useRef(null)

  const openDesktopModal = (recipe) => {
    lastTriggerRef.current = document.activeElement
    trackEvent('recipe_opened')
    setDesktopModalRecipe(recipe)
  }

  // Säkerhetsnät om fönstret skulle ändra storlek över brytpunkten medan
  // modalen är öppen (ovanligt, men billigt att skydda mot).
  useEffect(() => {
    if (!isDesktop && desktopModalRecipe) setDesktopModalRecipe(null)
  }, [isDesktop, desktopModalRecipe])

  // Grupperar recepten i rader om två – samma ordning som tidigare 2-kolumns-
  // griden gav, men nu kan varje rad själv välja layout (se nedan).
  const recipeRows = []
  for (let i = 0; i < uniqueRecipes.length; i += 2) {
    recipeRows.push(uniqueRecipes.slice(i, i + 2))
  }

  // ── "Byt rätt" ────────────────────────────────────────────────────────────
  // swapTarget = den unika receptplats (från uniqueRecipes) som användaren
  // för närvarande försöker byta ut, eller null om dialogen är stängd.
  const [swapTarget, setSwapTarget] = useState(null)

  const planRecipeIds = uniqueRecipes.map((r) => r.id)
  const budgetPerServing = pricing && totalServings > 0 ? pricing.budget / totalServings : null
  const swapReferenceRecipe = swapTarget ? RECIPES.find((r) => r.id === swapTarget.id) : null

  const handleSwapSelect = (newRecipeId) => {
    if (!swapTarget || !pricing) return

    // Planen beskrivs helt av (baseId, servings) per tillagningstillfälle –
    // byt bara ut de tillfällen som tillhörde den gamla receptplatsen,
    // behåll ALLA andra exakt som de är (inklusive deras portionsantal).
    const occurrenceSpecs = recipes.map((r) => {
      const baseId = getBaseRecipeId(r.id)
      return { baseId: baseId === swapTarget.id ? newRecipeId : baseId, servings: r.servings }
    })

    const rebuilt = rebuildPlanData(occurrenceSpecs, pantry, pricing.budget)
    onUpdateResult(rebuilt)
    setSwapTarget(null)
    // Skickas HÄR – efter ett genomfört byte, inte när Byt rätt-dialogen
    // bara öppnas (det sker i onSwapRequest ovan, som inte skickar något
    // event).
    trackEvent('recipe_swapped')
  }

  const summaryParts = [
    `${numberOfDays} dagar`,
    `${uniqueRecipes.length} recept`,
    cost != null ? `ca ${cost.toLocaleString('sv-SE')} kr` : null,
  ].filter(Boolean)

  return (
    // Resultatsidan är bredare än onboardingen: upp till 1100 px på desktop,
    // en kolumn på mobil.
    <div className="w-full max-w-[1100px] mx-auto">
      {/* Sammanfattning – smalare läsbredd än receptgriden för bättre balans */}
      <div className="max-w-[660px] mb-8 md:mb-10">
        <header className="mb-4 animate-slide-up">
          <h1 className="font-display font-semibold text-[1.75rem] md:text-3xl text-ink leading-tight mb-1.5">
            Din matplan
          </h1>
          <p className="text-ink-light text-[0.9375rem]">
            {summaryParts.join(' · ')}
          </p>
          {childFriendly && (
            <p className="text-meta text-forest font-bold mt-1">Familjevänliga recept</p>
          )}
        </header>

        {/* Budget – produktens kärnlöfte och sidans tydliga tyngdpunkt.
            Ljus, NEUTRAL yta (samma card/off-white-token som övriga rena
            komponentytor) – tidigare smörgul bakgrund kändes för mycket som
            en dekorativ funktionsyta för en central, precis produktsiffra.
            Statusen (under/över budget) bär själv sin färg via en tonad
            pill, så hierarkin förblir tydlig utan att hela blocket färgas. */}
        {pricing && (
          <div className="rounded-2xl bg-surface border border-line px-5 py-5 md:px-7 md:py-6 animate-slide-up-delay-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <div className="text-xs text-ink-light mb-1">Uppskattad inköpskostnad</div>
                <div className="text-3xl md:text-4xl font-black text-ink tabular-nums">
                  ca {cost.toLocaleString('sv-SE')} kr
                </div>
              </div>
              <div
                className={`text-sm font-bold px-3 py-1.5 rounded-full
                  ${withinBudget ? 'text-forest bg-forest-light' : 'text-rust bg-rust-light'}`}
              >
                {withinBudget
                  ? `${diff.toLocaleString('sv-SE')} kr kvar`
                  : `${diff.toLocaleString('sv-SE')} kr över budget`}
              </div>
            </div>
            <p className="text-xs text-ink-light/80 mt-3.5 pt-3.5 border-t border-line">
              {totalServings} portioner planerade · uppskattning utifrån generella svenska matpriser
            </p>
          </div>
        )}
      </div>

      {/* Recept – en kolumn på mobil, två på desktop.
          Recepten grupperas i rader om två. Så länge INGET kort i en rad är
          öppet ligger raden i en vanlig 2-kolumnsgrid. Så snart ETT kort i
          raden öppnas (oavsett vänster eller höger) växlar just den raden
          till en enkel vertikal stapel – annars försöker CSS Grids
          auto-placering trycka in det spännande kortet på en NY rad när det
          inte får plats i den nuvarande, vilket lämnar ett tomt hål där
          kortet låg och känns trasigt. Med den här uppdelningen stannar
          expansionen kvar på sin egen plats och övriga rader påverkas inte
          alls. */}
      <section className="animate-slide-up-delay-2">
        <h2 className="text-lg font-bold text-ink mb-4">Dina recept</h2>
        <div className="space-y-4 md:space-y-5">
          {recipeRows.map((row, rowIndex) => {
            // På desktop ska griden ALDRIG byta till stapel-layout – recept
            // öppnas i en fristående modal (se nedan) som inte påverkar
            // griden alls. Detta skydd håller layouten stabil även i det
            // osannolika fallet att openRecipeIds råkar innehålla kvarvarande
            // id:n från innan fönstret var brett (se resize-säkerhetsnätet
            // ovan för själva modal-stängningen).
            const rowHasOpenCard = !isDesktop && row.some((r) => openRecipeIds.has(r.id))
            const rowClass = rowHasOpenCard
              ? 'flex flex-col gap-4 md:gap-5'
              : 'grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-start'

            return (
              <div key={row[0]?.id || rowIndex} className={rowClass}>
                {row.map((recipe, i) => (
                  <RecipeCard
                    key={recipe.id || i}
                    recipe={recipe}
                    index={rowIndex * 2 + i}
                    showFamilyFriendlyBadge={childFriendly}
                    open={isDesktop ? false : openRecipeIds.has(recipe.id)}
                    onToggle={() => (isDesktop ? openDesktopModal(recipe) : toggleRecipe(recipe.id))}
                    onSwapRequest={() => setSwapTarget(recipe)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </section>

      {/* Inköpslista */}
      <section className="mt-12 md:mt-14 pt-8 border-t border-line">
        <ShoppingList
          shoppingList={shoppingList}
          freshItemsTips={freshItemsTips}
          totalCost={pricing?.estimatedTotalCost ?? null}
        />
      </section>

      {/* Feedback – enbart knappen, ingen extra rubrik/text. Aprikos som
          fyllnadsfärg – ger en personlig, varm touch åt just detta steg,
          skild från den skogsgröna primära handlingen (Generera matplan). */}
      <section className="mt-12 pt-8 border-t border-line">
        <div className="max-w-[660px] text-center">
          <a
            href="https://forms.gle/M5PvhoAFESmbyxZh7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-terracotta
                       hover:bg-terracotta/80 text-ink font-bold
                       py-2.5 px-6 rounded-lg text-sm min-h-[44px]
                       transition-colors duration-150"
          >
            Lämna feedback
          </a>
        </div>
      </section>

      {/* Ny plan */}
      <div className="mt-8 pb-4">
        <button
          onClick={onReset}
          className="text-ink-light hover:text-forest transition-colors text-sm
                     underline underline-offset-4 py-2"
        >
          Skapa en ny matplan
        </button>
      </div>

      <RecipeSwapSheet
        open={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        currentRecipe={swapTarget}
        foodTypes={foodTypes}
        excludeIds={planRecipeIds}
        pantryTerms={pantryItemsUsed}
        budgetPerServing={budgetPerServing}
        referenceRecipe={swapReferenceRecipe}
        onSelect={handleSwapSelect}
      />

      {/* Villkorad montering är avgörande: modalens useEffects (bl.a. den
          som låser document.body.style.overflow) körs vid MONTERING/
          AVMONTERING. Utan detta villkor renderas komponenten alltid,
          direkt när resultatsidan visas – oavsett enhet och oavsett om
          något recept någonsin öppnats – vilket låste scroll globalt och
          permanent. Nu monteras den bara medan ett recept faktiskt är valt,
          och avmonteras (cleanup körs, overflow återställs) vid stängning. */}
      {desktopModalRecipe && (
        <RecipeDetailModal
          recipe={desktopModalRecipe}
          onClose={() => setDesktopModalRecipe(null)}
          returnFocusRef={lastTriggerRef}
        />
      )}
    </div>
  )
}
