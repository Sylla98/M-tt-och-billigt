// ─── Matplansgenerering: LOKALT RECEPTBIBLIOTEK ─────────────────────────────
// Standardflödet använder INTE Anthropic. Recepten väljs, skalas och
// prissätts helt lokalt (se src/utils/selectRecipes.js). Den gamla
// AI-baserade genereringen finns bevarad i src/legacy/ai-meal-plan-route.js.bak
// men importeras/anropas INTE härifrån.

import { checkRateLimit, getClientIdentifier } from '@/utils/rateLimit'
import { priceShoppingListWithReference } from '@/utils/referencePricing'
import {
  calculateCookingOccurrences,
  distributeBatchSizes,
  rotateRecipes,
} from '@/utils/batchPlanning'
import {
  selectRecipes,
  swapForBudget,
  scaleRecipe,
  buildShoppingItems,
  parsePantryTerms,
} from '@/utils/selectRecipes'

// ─── Portionsberäkning ────────────────────────────────────────────────────────
// Vuxenekvivalent-modell: alla äter samma antal måltider per dag, men ett
// barn räknas som en mindre portion av varje måltid – inte som färre
// måltider.
//
// Mätt & Billigt planerar i nuläget LUNCH + MIDDAG, inte frukost – därför
// mealsPerDay = 2, inte 3. (Tidigare stod den felaktigt på 3, vilket var
// huvudorsaken till att planer blev ~65 portioner istället för ~40.)
//
// Exempel: 2 vuxna + 1 barn = 2,0 + 0,6 = 2,6 vuxenekvivalenter per måltid.
const MEALS_PER_DAY = 2
const CHILD_PORTION_FACTOR = 0.6 // 1 barn ≈ 0,6 vuxenportion
const MARGIN_FACTOR = 1.1        // liten säkerhetsmarginal, appliceras EN gång

// OBS: returnerar ett EXAKT (icke avrundat) portionsbehov. Avrundning sker
// medvetet inte här, utan en enda gång när det totala portionsmålet för
// hela planen bestäms (se totalServingsTarget i POST-handlern) – annars
// staplas flera uppåtavrundningar på varandra och blåser upp mängderna.
function calculateRequiredServings(adults, children, days) {
  const adultEquivalents = adults * 1.0 + children * CHILD_PORTION_FACTOR
  return adultEquivalents * MEALS_PER_DAY * days * MARGIN_FACTOR
}

// Fördelningslogik (tillagningstillfällen, batchstorlekar, receptrotation)
// flyttad till en central, testbar modul – se src/utils/batchPlanning.js.

function durationToDays(duration) {
  if (duration === '1 vecka') return 7
  if (duration === '2 veckor') return 14
  if (duration === '1 månad') return 30
  return 14
}

// ─── Input-validering ─────────────────────────────────────────────────────────
function validateInput(body) {
  const errors = []
  const { adults, children, duration, budget, foodTypes, pantry, numberOfDishes } = body

  if (!Number.isInteger(adults) || adults < 1 || adults > 20) errors.push('Ogiltigt antal vuxna')
  if (!Number.isInteger(children) || children < 0 || children > 20) errors.push('Ogiltigt antal barn')
  if (!['1 vecka', '2 veckor', '1 månad'].includes(duration)) errors.push('Ogiltig period')
  if (!Number.isFinite(budget) || budget < 100 || budget > 100000) errors.push('Ogiltig budget')
  if (!Array.isArray(foodTypes)) errors.push('Ogiltiga matkategorier')
  if (typeof pantry !== 'string' || pantry.length > 500) errors.push('Skafferiet är för långt')
  if (![5, 7, 10, 14].includes(numberOfDishes)) errors.push('Ogiltigt antal rätter')

  return errors
}

// ─── Kategorier för inköpslistan ──────────────────────────────────────────────
const CATEGORY_DEFS = {
  meat:       { label: 'Kött & chark',          emoji: '🥩' },
  dairy:      { label: 'Mejeri & ägg',          emoji: '🧀' },
  vegetables: { label: 'Grönsaker & frukt',     emoji: '🧅' },
  canned:     { label: 'Konserver & torrvaror', emoji: '🥫' },
  pasta:      { label: 'Pasta, ris & bröd',     emoji: '🍚' },
  pantry:     { label: 'Skafferi',              emoji: '🫙' },
}

function groupItemsByCategory(flatItems) {
  const grouped = {}
  for (const key of Object.keys(CATEGORY_DEFS)) {
    grouped[key] = { label: CATEGORY_DEFS[key].label, emoji: CATEGORY_DEFS[key].emoji, items: [] }
  }
  for (const item of flatItems) {
    const key = CATEGORY_DEFS[item.category] ? item.category : 'pantry'
    grouped[key].items.push(item)
  }
  // ta bort tomma kategorier för renare visning
  for (const key of Object.keys(grouped)) {
    if (grouped[key].items.length === 0) delete grouped[key]
  }
  return grouped
}

// ─── Plansammanfattning (lokalt genererad) ────────────────────────────────────
function buildPlanSummary(recipes, days, foodTypes) {
  const proteinTypes = [...new Set(recipes.map((r) => r.proteinType))]
  const styles = []
  if (foodTypes.includes('vegetariskt')) styles.push('helt vegetarisk')
  if (foodTypes.includes('familjevanligt')) styles.push('anpassad för barnfamiljer')
  const styleText = styles.length > 0 ? ` Planen är ${styles.join(' och ')}.` : ''
  return (
    `En varierad matplan för ${days} dagar med ${recipes.length} olika rätter ` +
    `(${proteinTypes.join(', ')}).${styleText} Recepten är valda för att vara enkla, ` +
    `prisvärda och fungera bra som matlådor.`
  )
}

function buildFreshTips(recipes) {
  const tips = []
  const usesOnion = recipes.some((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('lök')))
  const freezables = recipes.filter((r) => r.freezerFriendly).length
  if (usesOnion) tips.push('Lök och vitlök håller länge i rumstemperatur – köp allt på en gång.')
  if (freezables > 0) tips.push(`${freezables} av rätterna går bra att frysa in – laga dubbel sats och spara.`)
  tips.push('Färskvaror som grädde och crème fraiche håller längst om de köps nyligen datummärkta.')
  return tips
}

// ─── Huvud-handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now()

  // Rate limiting – behålls även för det snabba lokala flödet
  const clientId = getClientIdentifier(request)
  const rateLimitResult = checkRateLimit(clientId)
  if (rateLimitResult.limited) {
    console.warn(`[meal-plan] Rate limit överskriden – väntetid ${rateLimitResult.retryAfterSeconds}s`)
    return Response.json(
      { error: 'Du har gjort ovanligt många genereringar på kort tid. Vänta en stund och försök igen.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) } }
    )
  }

  try {
    const body = await request.json()
    const inputErrors = validateInput(body)
    if (inputErrors.length > 0) {
      return Response.json({ error: inputErrors.join(', ') }, { status: 400 })
    }

    const { adults, children, duration, budget, foodTypes, pantry, numberOfDishes } = body
    const days = durationToDays(duration)
    const requiredServings = calculateRequiredServings(adults, children, days)

    // ── 1. Välj recept lokalt ──────────────────────────────────────────────
    const selection = selectRecipes({ foodTypes, numberOfDishes, pantry, budget, requiredServings })
    if (!selection.ok) {
      return Response.json({ error: selection.error }, { status: 422 })
    }

    let { selected, remaining } = selection

    // ── 2. Skala recepten till hushållets behov ────────────────────────────
    // Portionsmålet för HELA perioden avrundas en gång. Sedan skapas så
    // många TILLAGNINGSTILLFÄLLEN som behövs för att täcka det målet med
    // normal batchstorlek (6–8 portioner) – inte en enda jättebatch per
    // valt recept. De unika recepten (sel) roterar för att fylla
    // tillfällena; ett recept kan alltså förekomma flera gånger under en
    // längre period. Se src/utils/batchPlanning.js för detaljerna.
    const totalServingsTarget = Math.round(requiredServings)
    const scaleAndPrice = (sel) => {
      const uniqueRecipes = sel.map((s) => s.recipe)
      const occurrences = calculateCookingOccurrences(totalServingsTarget, uniqueRecipes.length)
      const batchSizes = distributeBatchSizes(totalServingsTarget, occurrences)
      const rotation = rotateRecipes(uniqueRecipes, occurrences)

      const scaled = rotation.map((recipe, i) => scaleRecipe(recipe, batchSizes[i]))
      const items = buildShoppingItems(scaled, pantry)
      const grouped = groupItemsByCategory(items)
      const priced = priceShoppingListWithReference(grouped)
      return { scaled, priced, occurrences, batchSizes }
    }

    let { scaled, priced, occurrences, batchSizes } = scaleAndPrice(selected)

    // ── 3. Budgetbyte: om över budget, byt dyra recept mot billigare ──────
    if (priced.estimatedTotalCost > budget) {
      const swaps = swapForBudget(selected, remaining, 3)
      if (swaps.length > 0) {
        console.log(`[meal-plan] Budgetbyten: ${swaps.map((s) => `${s.out} → ${s.in}`).join(', ')}`)
        ;({ scaled, priced, occurrences, batchSizes } = scaleAndPrice(selected))
      }
    }

    // ── 4. Bygg svar i samma format som frontend förväntar sig ────────────
    // totalServings = summan av det som faktiskt delades ut till
    // tillagningstillfällena, vilket per konstruktion är exakt lika med
    // totalServingsTarget.
    const totalServings = scaled.reduce((sum, r) => sum + r.servings, 0)
    console.log(
      `[meal-plan] Batchplan: ${selected.length} unika recept → ${occurrences} tillagningstillfällen, ` +
      `batchstorlekar [${batchSizes.join(', ')}] (min ${Math.min(...batchSizes)}, max ${Math.max(...batchSizes)})`
    )
    const estimatedTotalCost = priced.estimatedTotalCost
    const budgetDifference = estimatedTotalCost - budget
    const isWithinBudget = estimatedTotalCost <= budget

    const pantryTerms = parsePantryTerms(pantry)
    const pantryItemsUsed = pantryTerms.length > 0 ? pantryTerms : []

    const responseData = {
      planSummary: buildPlanSummary(scaled, days, foodTypes || []),
      numberOfDays: days,
      totalServings,
      requiredServings: Math.round(requiredServings),
      pantryItemsUsed,
      freshItemsTips: buildFreshTips(scaled),
      childFriendly: (foodTypes || []).includes('familjevanligt'),
      recipes: (() => {
        const occurrenceCount = {}
        return scaled.map((r) => {
          occurrenceCount[r.id] = (occurrenceCount[r.id] || 0) + 1
          const n = occurrenceCount[r.id]
          // Om ett recept återkommer får senare tillfällen ett unikt id
          // (för React-nycklar i receptvyn) – själva receptet är oförändrat.
          const id = n > 1 ? `${r.id}-tillfalle-${n}` : r.id
          return {
            id,
            title: r.name,
            description: r.description,
            servings: r.servings,
            cookingTimeMinutes: r.totalTimeMinutes,
            childFriendly: r.familyFriendly,
            freezerFriendly: r.freezerFriendly,
            servedWith: r.servedWith,
            fridgeStorage: r.fridgeStorage,
            freezerStorage: r.freezerStorage,
            ingredients: r.ingredients.map((ing) => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit })),
            instructions: r.instructions,
            image: r.image,
          }
        })
      })(),
      shoppingList: priced.shoppingList,
      pricing: {
        budget,
        estimatedTotalCost,
        budgetDifference,
        isWithinBudget,
      },
    }

    const elapsedMs = Date.now() - startTime
    console.log(`[meal-plan] Lokal matplan skapad på ${elapsedMs} ms – ${scaled.length} recept, ${totalServings} portioner, ${estimatedTotalCost} kr`)

    return Response.json(responseData)
  } catch (err) {
    console.error(`[meal-plan] Oväntat fel: ${err.message}`)
    return Response.json(
      { error: 'Något gick fel. Försök igen.' },
      { status: 500 }
    )
  }
}
