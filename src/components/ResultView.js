'use client'
import { useState } from 'react'
import RecipeCard from './RecipeCard'
import ShoppingList from './ShoppingList'

export default function ResultView({ data, onReset }) {
  const {
    recipes = [],
    shoppingList = {},
    freshItemsTips = [],
    totalServings = 0,
    numberOfDays = 14,
    childFriendly = false,
    pricing = null,
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
  // openRecipeIds-resonemanget vid receptgriden nedan.
  const [openRecipeIds, setOpenRecipeIds] = useState(() => new Set())
  const toggleRecipe = (id) => {
    setOpenRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Grupperar recepten i rader om två – samma ordning som tidigare 2-kolumns-
  // griden gav, men nu kan varje rad själv välja layout (se nedan).
  const recipeRows = []
  for (let i = 0; i < uniqueRecipes.length; i += 2) {
    recipeRows.push(uniqueRecipes.slice(i, i + 2))
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
          <h1 className="font-display text-[1.75rem] md:text-3xl text-brown leading-tight mb-1.5">
            Din matplan
          </h1>
          <p className="text-brown-light text-[0.9375rem]">
            {summaryParts.join(' · ')}
          </p>
          {childFriendly && (
            <p className="text-meta text-sage font-medium mt-1">Familjevänliga recept</p>
          )}
        </header>

        {/* Budget – produktens kärnlöfte och sidans tyngdpunkt */}
        {pricing && (
          <div
            className={`rounded-xl border px-4 py-4 md:px-5 animate-slide-up-delay-1
              ${withinBudget ? 'border-sage/30 bg-sage/[0.06]' : 'border-ochre/30 bg-ochre/[0.06]'}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <div>
                <div className="text-xs text-brown-light mb-0.5">Uppskattad inköpskostnad</div>
                <div className="text-2xl font-semibold text-brown tabular-nums">
                  ca {cost.toLocaleString('sv-SE')} kr
                </div>
              </div>
              <div className={`text-sm font-semibold ${withinBudget ? 'text-sage' : 'text-ochre'}`}>
                {withinBudget
                  ? `${diff.toLocaleString('sv-SE')} kr under budget`
                  : `${diff.toLocaleString('sv-SE')} kr över budget`}
              </div>
            </div>
            <p className="text-xs text-stone-mid mt-2.5 pt-2.5 border-t border-line">
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
        <h2 className="text-lg font-semibold text-brown mb-4">Dina recept</h2>
        <div className="space-y-4 md:space-y-5">
          {recipeRows.map((row, rowIndex) => {
            const rowHasOpenCard = row.some((r) => openRecipeIds.has(r.id))
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
                    open={openRecipeIds.has(recipe.id)}
                    onToggle={() => toggleRecipe(recipe.id)}
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

      {/* Feedback – enbart knappen, ingen extra rubrik/text. Terrakotta som
          fyllnadsfärg (vanlig CTA, inte status/varning) men måttlig storlek
          så den inte konkurrerar med "Generera matplan". */}
      <section className="mt-12 pt-8 border-t border-line">
        <div className="max-w-[660px] text-center">
          <a
            href="https://forms.gle/M5PvhoAFESmbyxZh7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-terracotta
                       hover:bg-terracotta-dark text-white font-semibold
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
          className="text-brown-light hover:text-terracotta transition-colors text-sm
                     underline underline-offset-4 py-2"
        >
          Skapa en ny matplan
        </button>
      </div>
    </div>
  )
}
