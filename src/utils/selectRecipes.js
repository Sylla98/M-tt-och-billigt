// ─── Lokal receptmatchning ───────────────────────────────────────────────────
// Filtrerar, poängsätter och väljer recept ur det lokala biblioteket helt
// utan externa anrop. Skalar sedan ingredienser och bygger den sammanslagna
// inköpslistan. Ingen AI används i detta flöde.

import { RECIPES } from '@/data/recipes'
import { findReferenceProduct, normalizeIngredientName, priceShoppingListWithReference } from '@/utils/referencePricing'
import { scaleIngredient } from '@/utils/portionScaling'

// ── Kostnadsuppskattning per recept ─────────────────────────────────────────
// Proportionell uppskattning (mängd × pris per enhet) – används endast för
// poängsättning och budgetbyten. Den slutliga totalen räknas alltid från den
// riktiga inköpslistan med hela förpackningar.
const WEIGHT_TO_GRAMS = { g: 1, kg: 1000 }
const VOLUME_TO_ML = { ml: 1, cl: 10, dl: 100, l: 1000 }

function estimateIngredientCost(ing) {
  const product = findReferenceProduct(ing.name)
  if (!product) return 10 // konservativ schablon för okänd vara

  const u = (ing.unit || '').toLowerCase()

  if (product.purchaseType === 'weight') {
    let grams = null
    if (u in WEIGHT_TO_GRAMS) grams = ing.quantity * WEIGHT_TO_GRAMS[u]
    else if (u === 'st') grams = ing.quantity * 150
    if (grams != null) return (grams / 1000) * product.estimatedPricePerUnit
    return 5
  }

  // Förpackad vara: proportionell andel av förpackningen
  const pkgU = (product.packageUnit || '').toLowerCase()
  let ratio = null
  if (u in WEIGHT_TO_GRAMS && pkgU in WEIGHT_TO_GRAMS) {
    ratio = (ing.quantity * WEIGHT_TO_GRAMS[u]) / (product.packageQuantity * WEIGHT_TO_GRAMS[pkgU])
  } else if (u in VOLUME_TO_ML && pkgU in VOLUME_TO_ML) {
    ratio = (ing.quantity * VOLUME_TO_ML[u]) / (product.packageQuantity * VOLUME_TO_ML[pkgU])
  } else if (u === 'st' && pkgU === 'st') {
    ratio = ing.quantity / product.packageQuantity
  } else if (u === 'msk' || u === 'tsk' || u === 'krm') {
    ratio = 0.1 // liten andel av en förpackning
  }
  if (ratio == null) ratio = 0.5
  return ratio * product.estimatedPackagePrice
}

export function estimateRecipeCostPerServing(recipe) {
  const total = recipe.ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing), 0)
  return total / recipe.baseServings
}

// ── Filtrering ───────────────────────────────────────────────────────────────
export function filterByDiet(recipes, foodTypes) {
  // Vegetariskt är ett hårt filter – kött/fisk får ALDRIG slinka igenom
  if (foodTypes.includes('vegetariskt')) {
    return recipes.filter((r) => r.dietTypes.includes('vegetarisk'))
  }
  // Kött & grönt: recept med kött/fisk-protein
  if (foodTypes.includes('kott-gront')) {
    return recipes.filter((r) => r.proteinType !== 'vegetariskt')
  }
  // Blandkost/övrigt: hela biblioteket
  return recipes
}

// ── Poängsättning ────────────────────────────────────────────────────────────
export function scoreRecipe(recipe, { foodTypes, pantryTerms, budgetPerServing }) {
  let score = 50

  const wantsFamilyFriendly = foodTypes.includes('familjevanligt')
  if (wantsFamilyFriendly) {
    if (recipe.familyFriendly) score += 20
    if (recipe.activeTimeMinutes <= 25 && recipe.totalTimeMinutes <= 40) score += 10
  }

  if (foodTypes.includes('somrigt') && recipe.tags.includes('somrig')) score += 15
  if (foodTypes.includes('proteinrikt') && recipe.proteinType !== 'vegetariskt') score += 10

  // Skafferivaror: recept som använder det användaren redan har får bonus
  let pantryMatches = 0
  for (const term of pantryTerms) {
    if (recipe.ingredients.some((ing) => normalizeIngredientName(ing.name).includes(term))) {
      pantryMatches++
    }
  }
  score += Math.min(pantryMatches * 8, 24)

  // Låg budget: billiga recept prioriteras. Tröskel ~14 kr/portion i råvarukostnad.
  const costPerServing = estimateRecipeCostPerServing(recipe)
  if (budgetPerServing != null && budgetPerServing < 14) {
    // Ju billigare receptet är relativt tröskeln, desto högre bonus (0–15 p)
    const cheapness = Math.max(0, 14 - costPerServing)
    score += Math.min(15, Math.round(cheapness * 2))
  }

  return score
}

// ── Urval med variation ──────────────────────────────────────────────────────
const MAX_SAME_PROTEIN = 2
const MAX_SAME_CARB = 2

/**
 * Väljer `count` recept ur poolen med kontrollerad slumpning:
 * bland kandidater vars poäng ligger inom 10 poäng från bästa kvarvarande
 * väljs slumpmässigt. Variationsregler (max 2 per protein-/kolhydrattyp)
 * upprätthålls när alternativ finns, men släpps om de skulle blockera valet.
 */
function pickWithVariation(scored, count) {
  const selected = []
  const proteinCount = {}
  const carbCount = {}
  const remaining = [...scored]

  while (selected.length < count && remaining.length > 0) {
    remaining.sort((a, b) => b.score - a.score)
    const bestScore = remaining[0].score
    const band = remaining.filter((c) => c.score >= bestScore - 10)

    // Kandidater som inte bryter variationsreglerna
    const variationOk = band.filter(
      (c) =>
        (proteinCount[c.recipe.proteinType] || 0) < MAX_SAME_PROTEIN &&
        (carbCount[c.recipe.carbohydrateType] || 0) < MAX_SAME_CARB
    )

    // Om reglerna blockerar alla i bandet: prova hela remaining, annars släpp reglerna
    let pool = variationOk
    if (pool.length === 0) {
      pool = remaining.filter(
        (c) =>
          (proteinCount[c.recipe.proteinType] || 0) < MAX_SAME_PROTEIN &&
          (carbCount[c.recipe.carbohydrateType] || 0) < MAX_SAME_CARB
      )
    }
    if (pool.length === 0) pool = band // reglerna släpps – bättre än att misslyckas

    const chosen = pool[Math.floor(Math.random() * pool.length)]
    selected.push(chosen)
    proteinCount[chosen.recipe.proteinType] = (proteinCount[chosen.recipe.proteinType] || 0) + 1
    carbCount[chosen.recipe.carbohydrateType] = (carbCount[chosen.recipe.carbohydrateType] || 0) + 1
    remaining.splice(remaining.indexOf(chosen), 1)
  }

  return { selected, remaining }
}

// ── Skalning ─────────────────────────────────────────────────────────────────
// Skalningen delegeras helt till portionScaling.js/ingredientRules.js, som
// avgör per ingrediens om den ska räknas i antal, dampas vid stora
// portionstal, eller skalas normalt linjärt. Se dessa filer för detaljerna.
export function scaleRecipe(recipe, targetServings) {
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map((ing) =>
      scaleIngredient(ing, recipe.baseServings, targetServings)
    ),
  }
}

// ── Inköpslista: slå ihop ingredienser över alla recept ─────────────────────
function toBase(quantity, unit) {
  const u = (unit || '').toLowerCase()
  if (u in WEIGHT_TO_GRAMS) return { value: quantity * WEIGHT_TO_GRAMS[u], unit: 'g' }
  if (u in VOLUME_TO_ML) return { value: quantity * VOLUME_TO_ML[u], unit: 'ml' }
  return { value: quantity, unit: u || 'st' }
}

/**
 * Slår ihop samma ingrediens från alla skalade recept till en rad per vara.
 * Skafferivaror (som användaren redan har) utesluts helt ur listan.
 * Returnerar platta rader: { displayName, searchTerm, quantity, unit, category }
 */
export function buildShoppingItems(scaledRecipes, pantryText) {
  const pantryTerms = parsePantryTerms(pantryText)
  const merged = new Map() // normaliserat namn → rad

  for (const recipe of scaledRecipes) {
    for (const ing of recipe.ingredients) {
      const normName = normalizeIngredientName(ing.name)

      // Har användaren varan hemma? Hoppa över.
      const inPantry = pantryTerms.some(
        (t) => normName.includes(t) || t.includes(normName)
      )
      if (inPantry) continue

      const base = toBase(ing.quantity, ing.unit)
      const key = normName

      if (merged.has(key)) {
        const row = merged.get(key)
        if (row.unit === base.unit) {
          row.quantity += base.value
        } else {
          // olika enhetsfamiljer (t.ex. msk + g) – behåll den större posten,
          // lägg skedmått som minsta möjliga tillägg (försumbart för köp)
          if (base.unit === 'g' || base.unit === 'ml') {
            row.quantity = base.value + row.quantity // rå summering – båda små
            row.unit = base.unit
          }
        }
      } else {
        merged.set(key, {
          displayName: ing.name,
          searchTerm: normName,
          quantity: base.value,
          unit: base.unit,
          category: ing.category || 'pantry',
        })
      }
    }
  }

  return [...merged.values()]
}

export function parsePantryTerms(pantryText) {
  return (pantryText || '')
    .split(/[,;\n]+/)
    .map((s) => normalizeIngredientName(s))
    .filter((s) => s.length >= 2)
}

// ── Huvudfunktion ────────────────────────────────────────────────────────────
/**
 * Väljer recept efter användarens val.
 * Returnerar { ok: true, recipes } eller { ok: false, error }.
 */
export function selectRecipes({ foodTypes, numberOfDishes, pantry, budget, requiredServings }) {
  let pool = filterByDiet(RECIPES, foodTypes || [])

  // Familjevänligt ska vara ett HÅRT filter, inte bara en poängbonus –
  // annars kan icke-familjevänliga recept ändå väljas om de vinner på
  // andra poäng (variation, budget). Faller tillbaka till hela poolen bara
  // om det inte skulle finnas tillräckligt många familjevänliga alternativ
  // för det begärda antalet rätter (så att en giltig begäran aldrig
  // avvisas i onödan).
  if ((foodTypes || []).includes('familjevanligt')) {
    const familyFriendlyPool = pool.filter((r) => r.familyFriendly)
    if (familyFriendlyPool.length >= numberOfDishes) {
      pool = familyFriendlyPool
    }
  }

  if (pool.length < numberOfDishes) {
    return {
      ok: false,
      error:
        `Receptbiblioteket har just nu bara ${pool.length} rätter som passar dina val. ` +
        `Prova med färre rätter eller en annan kosttyp.`,
    }
  }

  const pantryTerms = parsePantryTerms(pantry)
  const budgetPerServing = requiredServings > 0 ? budget / requiredServings : null

  const scored = pool.map((recipe) => ({
    recipe,
    score: scoreRecipe(recipe, { foodTypes: foodTypes || [], pantryTerms, budgetPerServing }),
    costPerServing: estimateRecipeCostPerServing(recipe),
  }))

  const { selected, remaining } = pickWithVariation(scored, numberOfDishes)

  if (selected.length < numberOfDishes) {
    return {
      ok: false,
      error: 'Det gick inte att sätta ihop tillräckligt många passande rätter. Prova andra val.',
    }
  }

  return { ok: true, selected, remaining }
}

/**
 * Budgetbyte: om planens uppskattade kostnad överstiger budgeten, byt ut det
 * dyraste valda receptet mot det billigaste opasserade alternativet.
 * Högst `maxAttempts` byten – ingen oändlig loop.
 */
export function swapForBudget(selected, remaining, maxAttempts = 3) {
  const swaps = []
  let attempts = 0

  while (attempts < maxAttempts && remaining.length > 0) {
    // dyraste valda
    const sortedSel = [...selected].sort((a, b) => b.costPerServing - a.costPerServing)
    const expensive = sortedSel[0]
    // billigaste kvarvarande som är billigare än den dyra
    const sortedRem = [...remaining].sort((a, b) => a.costPerServing - b.costPerServing)
    const cheap = sortedRem[0]

    if (!cheap || cheap.costPerServing >= expensive.costPerServing) break

    selected.splice(selected.indexOf(expensive), 1, cheap)
    remaining.splice(remaining.indexOf(cheap), 1)
    remaining.push(expensive)
    swaps.push({ out: expensive.recipe.name, in: cheap.recipe.name })
    attempts++
  }

  return swaps
}

// ── Inköpslistekategorier ───────────────────────────────────────────────────
// Flyttad hit (oförändrad) från route.js så att både den vanliga
// genereringen OCH "Byt rätt"-funktionen använder EXAKT samma kategorisering
// – en enda source of truth istället för två kopior som kan glida isär.
const CATEGORY_DEFS = {
  meat:       { label: 'Kött & chark',          emoji: '🥩' },
  dairy:      { label: 'Mejeri & ägg',          emoji: '🧀' },
  vegetables: { label: 'Grönsaker & frukt',     emoji: '🧅' },
  canned:     { label: 'Konserver & torrvaror', emoji: '🥫' },
  pasta:      { label: 'Pasta, ris & bröd',     emoji: '🍚' },
  pantry:     { label: 'Skafferi',              emoji: '🫙' },
}

export function groupItemsByCategory(flatItems) {
  const grouped = {}
  for (const key of Object.keys(CATEGORY_DEFS)) {
    grouped[key] = { label: CATEGORY_DEFS[key].label, emoji: CATEGORY_DEFS[key].emoji, items: [] }
  }
  for (const item of flatItems) {
    const key = CATEGORY_DEFS[item.category] ? item.category : 'pantry'
    grouped[key].items.push(item)
  }
  for (const key of Object.keys(grouped)) {
    if (grouped[key].items.length === 0) delete grouped[key]
  }
  return grouped
}

// ── Färskvarutips ────────────────────────────────────────────────────────────
// Också flyttad hit oförändrad, av samma skäl som ovan.
export function buildFreshTips(recipes) {
  const tips = []
  const usesOnion = recipes.some((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('lök')))
  const freezables = recipes.filter((r) => r.freezerFriendly).length
  if (usesOnion) tips.push('Lök och vitlök håller länge i rumstemperatur – köp allt på en gång.')
  if (freezables > 0) tips.push(`${freezables} av rätterna går bra att frysa in – laga dubbel sats och spara.`)
  tips.push('Färskvaror som grädde och crème fraiche håller längst om de köps nyligen datummärkta.')
  return tips
}

// ── Skalade recept -> API-/frontend-format ──────────────────────────────────
// Flyttad hit oförändrad från route.js:s tidigare inline-IIFE. Ger varje
// tillagningstillfälle rätt id (receptid, eller receptid-tillfalle-N för
// upprepningar) i den ordning recepten faktiskt förekommer i planen.
export function buildRecipeOccurrences(scaledRecipes) {
  const occurrenceCount = {}
  return scaledRecipes.map((r) => {
    occurrenceCount[r.id] = (occurrenceCount[r.id] || 0) + 1
    const n = occurrenceCount[r.id]
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
}

// ─── "Byt rätt" ─────────────────────────────────────────────────────────────
// Två funktioner för att byta ut EN receptplats i en redan genererad plan,
// utan att skapa en ny plan. Återanvänder filterByDiet/scoreRecipe/
// scaleRecipe/buildShoppingItems/groupItemsByCategory/buildFreshTips ovan –
// ingen logik dupliceras, bara en tunn koppling specifik för bytesflödet.

/**
 * Väljer alternativa recept för en receptplats som ska bytas ut. Samma
 * kosttyp-/familjevänligt-filter som den vanliga planeringen (hårt filter),
 * men rangordnar ALLA giltiga kandidater (istället för att bara plocka ut
 * några) så att anroparen kan "bläddra" vidare i en stabil, redan beräknad
 * lista – se RecipeSwapSheet.js för hur "Visa andra förslag" använder
 * detta utan att redan visade förslag kan komma tillbaka.
 *
 * Pris och tid är MEDVETET sekundära signaler (litet, begränsat avdrag) –
 * kostval/familjevänligt/skafferi väger betydligt tyngre via scoreRecipe.
 */
export function selectSwapAlternatives({ foodTypes, excludeIds = [], budgetPerServing = null, pantryTerms = [], referenceRecipe = null }) {
  let pool = filterByDiet(RECIPES, foodTypes || [])

  if ((foodTypes || []).includes('familjevanligt')) {
    const familyFriendlyPool = pool.filter((r) => r.familyFriendly)
    if (familyFriendlyPool.length > 0) pool = familyFriendlyPool
  }

  pool = pool.filter((r) => !excludeIds.includes(r.id))

  const scored = pool.map((recipe) => {
    let score = scoreRecipe(recipe, { foodTypes: foodTypes || [], pantryTerms, budgetPerServing })

    if (referenceRecipe) {
      const costDiff = Math.abs(estimateRecipeCostPerServing(recipe) - estimateRecipeCostPerServing(referenceRecipe))
      const timeDiff = Math.abs((recipe.totalTimeMinutes || 0) - (referenceRecipe.totalTimeMinutes || 0))
      score -= Math.min(8, costDiff * 0.4)
      score -= Math.min(6, timeDiff * 0.15)
    }

    return { recipe, score, costPerServing: estimateRecipeCostPerServing(recipe) }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => ({ recipe: s.recipe, costPerServing: s.costPerServing }))
}

/**
 * Bygger om den skalade receptlistan, inköpslistan och priserna för HELA
 * planen utifrån en lista av (baseId, servings)-par – det enda en
 * receptplats behöver beskrivas av. Samma pipeline som route.js använder
 * vid generering (scaleRecipe -> buildShoppingItems -> groupItemsByCategory
 * -> priceShoppingListWithReference), så resultatet blir identiskt
 * strukturerat.
 */
export function rebuildPlanData(occurrenceSpecs, pantryText, budget) {
  const scaled = occurrenceSpecs.map(({ baseId, servings }) => {
    const recipe = RECIPES.find((r) => r.id === baseId)
    return scaleRecipe(recipe, servings)
  })

  const items = buildShoppingItems(scaled, pantryText)
  const grouped = groupItemsByCategory(items)
  const priced = priceShoppingListWithReference(grouped)

  const totalServings = scaled.reduce((sum, r) => sum + r.servings, 0)
  const estimatedTotalCost = priced.estimatedTotalCost
  const budgetDifference = estimatedTotalCost - budget
  const isWithinBudget = estimatedTotalCost <= budget

  return {
    recipes: buildRecipeOccurrences(scaled),
    shoppingList: priced.shoppingList,
    freshItemsTips: buildFreshTips(scaled),
    totalServings,
    pricing: { budget, estimatedTotalCost, budgetDifference, isWithinBudget },
  }
}
