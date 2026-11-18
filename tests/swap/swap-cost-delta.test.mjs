// Tester för "Byt rätt"-kostnadsskillnaden. Kör de RIKTIGA modulerna: planen
// skapas av den riktiga /api/meal-plan-handlern, och skillnaden räknas med
// samma funktioner som ResultView använder. Kör med: npm run test:swap
// (kräver alias-laddaren i tests/swap/register-alias.mjs för '@/'-importer).

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { POST } = await import('../../src/app/api/meal-plan/route.js')
const sel = await import('../../src/utils/selectRecipes.js')
const { RECIPES } = await import('../../src/data/recipes.js')
const { formatPlanCostDelta } = await import('../../src/utils/formatPlanCostDelta.js')

const {
  getBaseRecipeId,
  buildSwapOccurrenceSpecs,
  calculateSwapCostDelta,
  rebuildPlanData,
  selectSwapAlternatives,
  parsePantryTerms,
} = sel

const INPUTS = [
  { adults: 2, children: 1, duration: '2 veckor', budget: 1500, foodTypes: ['blandkost'], pantry: '', numberOfDishes: 5 },
  { adults: 2, children: 0, duration: '1 vecka', budget: 800, foodTypes: ['blandkost'], pantry: 'ris, olja, lök', numberOfDishes: 7 },
  { adults: 4, children: 2, duration: '1 månad', budget: 3000, foodTypes: ['familjevanligt'], pantry: 'pasta, vitlök', numberOfDishes: 10 },
]

let nextIp = 1
async function generatePlan(input) {
  const req = new Request('http://localhost/api/meal-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${nextIp++}` },
    body: JSON.stringify(input),
  })
  const res = await POST(req)
  assert.equal(res.status, 200, 'Planen ska kunna skapas')
  return { input, plan: await res.json() }
}

const plans = []
for (const input of INPUTS) plans.push(await generatePlan(input))

function uniqueSlots(plan) {
  return [...new Set(plan.recipes.map((r) => getBaseRecipeId(r.id)))]
}

function alternativesFor(input, plan, slotId) {
  return selectSwapAlternatives({
    foodTypes: plan.foodTypes,
    excludeIds: uniqueSlots(plan),
    pantryTerms: parsePantryTerms(plan.pantry),
    budgetPerServing: plan.pricing.budget / plan.totalServings,
    referenceRecipe: RECIPES.find((r) => r.id === slotId),
  })
}

describe('baslinje: ombyggnad av nuvarande plan = planens visade totalsumma', () => {
  for (const { input, plan } of plans) {
    test(`${input.duration}, ${input.numberOfDishes} rätter, skafferi "${input.pantry}"`, () => {
      const identitySpecs = plan.recipes.map((r) => ({ baseId: getBaseRecipeId(r.id), servings: r.servings }))
      const rebuilt = rebuildPlanData(identitySpecs, plan.pantry, plan.pricing.budget)
      assert.equal(
        rebuilt.pricing.estimatedTotalCost,
        plan.pricing.estimatedTotalCost,
        'Ombyggnaden måste ge samma totalsumma som den ursprungliga planen, annars är en skillnad missvisande'
      )
    })
  }
})

describe('calculateSwapCostDelta', () => {
  test('skillnaden = ändringen av totalsumman efter ett faktiskt byte, för varje alternativ och varje receptplats', () => {
    let checked = 0
    const seen = { cheaper: 0, dearer: 0, same: 0 }
    for (const { plan } of plans) {
      for (const slotId of uniqueSlots(plan)) {
        for (const { recipe } of alternativesFor(null, plan, slotId).slice(0, 8)) {
          const delta = calculateSwapCostDelta({
            occurrences: plan.recipes,
            replacedBaseId: slotId,
            newRecipeId: recipe.id,
            pantryText: plan.pantry,
            budget: plan.pricing.budget,
            currentTotalCost: plan.pricing.estimatedTotalCost,
          })
          // "Faktiskt byte" = exakt det handleSwapSelect gör.
          const after = rebuildPlanData(buildSwapOccurrenceSpecs(plan.recipes, slotId, recipe.id), plan.pantry, plan.pricing.budget)
          assert.equal(delta, after.pricing.estimatedTotalCost - plan.pricing.estimatedTotalCost)
          assert.ok(Number.isInteger(delta))
          seen[delta < 0 ? 'cheaper' : delta > 0 ? 'dearer' : 'same']++
          checked++
        }
      }
    }
    console.log(`# ${checked} byten jämförda: ${JSON.stringify(seen)}`)
    assert.ok(checked > 100, `Fick bara ${checked} jämförelser`)
    assert.ok(seen.cheaper > 0 && seen.dearer > 0, `Testdatat ska innehålla både billigare och dyrare byten: ${JSON.stringify(seen)}`)
  })

  test('ALLA tillagningstillfällen av den ersatta receptplatsen byts, inga andra rörs', () => {
    let multi = 0
    for (const { plan } of plans) {
      for (const slotId of uniqueSlots(plan)) {
        const occurrencesOfSlot = plan.recipes.filter((r) => getBaseRecipeId(r.id) === slotId)
        const alt = alternativesFor(null, plan, slotId)[0].recipe.id
        const specs = buildSwapOccurrenceSpecs(plan.recipes, slotId, alt)
        assert.equal(specs.length, plan.recipes.length)
        assert.equal(specs.filter((s) => s.baseId === slotId).length, 0, 'Ingen rest av det gamla receptet')
        assert.equal(specs.filter((s) => s.baseId === alt).length, occurrencesOfSlot.length)
        specs.forEach((s, i) => {
          assert.equal(s.servings, plan.recipes[i].servings, 'Portionsantal ska vara oförändrade')
          if (getBaseRecipeId(plan.recipes[i].id) !== slotId) assert.equal(s.baseId, getBaseRecipeId(plan.recipes[i].id))
        })
        if (occurrencesOfSlot.length > 1) multi++
      }
    }
    assert.ok(multi > 0, 'Minst en plan ska ha en receptplats med flera tillagningstillfällen')
  })

  test('skillnaden är inte bara skillnaden i kr/portion: gemensamma råvaror och förpackningar påverkar totalsumman', () => {
    let differs = 0
    let compared = 0
    for (const { plan } of plans) {
      for (const slotId of uniqueSlots(plan)) {
        const slotServings = plan.recipes.filter((r) => getBaseRecipeId(r.id) === slotId).reduce((s, r) => s + r.servings, 0)
        const ref = RECIPES.find((r) => r.id === slotId)
        for (const { recipe, costPerServing } of alternativesFor(null, plan, slotId).slice(0, 5)) {
          const delta = calculateSwapCostDelta({
            occurrences: plan.recipes, replacedBaseId: slotId, newRecipeId: recipe.id,
            pantryText: plan.pantry, budget: plan.pricing.budget, currentTotalCost: plan.pricing.estimatedTotalCost,
          })
          const naive = Math.round((costPerServing - sel.estimateRecipeCostPerServing(ref)) * slotServings)
          compared++
          if (Math.abs(delta - naive) >= 5) differs++
        }
      }
    }
    console.log(`# helplansskillnad avviker >= 5 kr från enkel kr/portion-skillnad i ${differs} av ${compared} byten`)
    assert.ok(differs > 0, `Förväntade att helplansberäkningen avviker från enkel kr/portion-skillnad (${compared} jämförda)`)
  })

  test('beräkningen är snabb nog att göra för de alternativ som visas (alla alternativ för en plats < 1 s)', () => {
    const { plan } = plans[2]
    const slotId = uniqueSlots(plan)[0]
    const alts = alternativesFor(null, plan, slotId)
    const t0 = performance.now()
    for (const { recipe } of alts) {
      calculateSwapCostDelta({
        occurrences: plan.recipes, replacedBaseId: slotId, newRecipeId: recipe.id,
        pantryText: plan.pantry, budget: plan.pricing.budget, currentTotalCost: plan.pricing.estimatedTotalCost,
      })
    }
    const ms = performance.now() - t0
    console.log(`# ${alts.length} alternativ på ${Math.round(ms)} ms (${(ms / alts.length).toFixed(1)} ms/alternativ)`)
    assert.ok(ms < 1000)
  })
})

describe('formatPlanCostDelta', () => {
  test('format enligt specifikationen, med äkta minustecken', () => {
    assert.equal(formatPlanCostDelta(-200), '−200 kr för hela planen')
    assert.equal(formatPlanCostDelta(60), '+60 kr för hela planen')
    assert.equal(formatPlanCostDelta(-1250), '−1 250 kr för hela planen')
  })
  test('noll och ogiltiga värden', () => {
    assert.equal(formatPlanCostDelta(0), 'Ingen skillnad i kostnad för hela planen')
    assert.equal(formatPlanCostDelta(null), null)
    assert.equal(formatPlanCostDelta(undefined), null)
    assert.equal(formatPlanCostDelta(NaN), null)
  })
})
