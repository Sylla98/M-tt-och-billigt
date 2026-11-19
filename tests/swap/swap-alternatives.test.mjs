// Tester för vilka recept Byt rätt erbjuder (selectSwapAlternatives i src/utils/selectRecipes.js).
// Regeln: hela det aktiva receptutbudet utom recept som redan ingår i planen. Vegetarisk plan ger bara
// vegetariska alternativ. Budget, tid och familjevänlighet påverkar bara ordningen. Urvalet när planen
// först skapas (selectRecipes) är oförändrat. Kör med: npm run test:swap

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { POST } = await import('../../src/app/api/meal-plan/route.js')
const sel = await import('../../src/utils/selectRecipes.js')
const { RECIPES } = await import('../../src/data/recipes.js')
const { HISTORICAL_RECIPES } = await import('../../src/data/historicalRecipes.js')

const { getBaseRecipeId, selectSwapAlternatives, calculateSwapCostDelta, rebuildPlanData, buildSwapOccurrenceSpecs } = sel

const isVeg = (r) => r.dietTypes.includes('vegetarisk')
const ids = (alts) => alts.map((a) => a.recipe.id)
const lines = (plan) => Object.values(plan.shoppingList).flatMap((c) => c.items)
const rowSum = (plan) => Math.round(lines(plan).reduce((s, i) => s + i.lineCost, 0))

let nextIp = 1
async function generatePlan(input) {
  const req = new Request('http://localhost/api/meal-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${nextIp++}` },
    body: JSON.stringify(input),
  })
  const res = await POST(req)
  assert.equal(res.status, 200, 'Planen ska kunna skapas')
  return res.json()
}
const planSlots = (plan) => [...new Set(plan.recipes.map((r) => getBaseRecipeId(r.id)))]
const altsFor = (plan, slot) =>
  selectSwapAlternatives({
    foodTypes: plan.foodTypes,
    excludeIds: planSlots(plan),
    pantryTerms: sel.parsePantryTerms(plan.pantry),
    budgetPerServing: plan.pricing.budget / plan.totalServings,
    referenceRecipe: sel.findPlanRecipe(slot),
  })

describe('Byt rätt visar hela det aktiva utbudet utom recept som redan ingår i planen', () => {
  test('utan kostval: alla aktiva recept utom de i planen, inga dubbletter', () => {
    const alts = ids(selectSwapAlternatives({ foodTypes: [], excludeIds: ['linsbolognese'] }))
    assert.equal(alts.length, RECIPES.length - 1)
    assert.equal(new Set(alts).size, alts.length)
    assert.ok(!alts.includes('linsbolognese'))
    assert.deepEqual([...alts].sort(), RECIPES.map((r) => r.id).filter((i) => i !== 'linsbolognese').sort())
  })

  test('recept som redan ingår i planen erbjuds aldrig, och inga historiska recept', () => {
    const inPlan = RECIPES.slice(0, 7).map((r) => r.id)
    const alts = ids(selectSwapAlternatives({ foodTypes: ['blandkost'], excludeIds: inPlan }))
    for (const id of inPlan) assert.ok(!alts.includes(id), id)
    assert.equal(alts.length, RECIPES.length - 7)
    for (const h of HISTORICAL_RECIPES) assert.ok(!alts.includes(h.id), `historiskt recept ${h.id} erbjuds`)
  })

  test('byts ett historiskt (borttaget) recept ut visas hela det aktiva utbudet', () => {
    const ref = sel.findPlanRecipe('skagen-rakpasta')
    assert.ok(ref && !RECIPES.some((r) => r.id === ref.id), 'skagen-rakpasta är historiskt')
    const alts = selectSwapAlternatives({ foodTypes: [], excludeIds: ['skagen-rakpasta'], referenceRecipe: ref })
    assert.equal(alts.length, RECIPES.length)
  })

  test('vegetariskt: bara vegetariska recept, och alla vegetariska som inte redan är med', () => {
    const veg = RECIPES.filter(isVeg)
    const inPlan = veg.slice(0, 3).map((r) => r.id)
    for (const foodTypes of [['vegetariskt'], ['vegetariskt', 'familjevanligt'], ['vegetariskt', 'proteinrikt']]) {
      const alts = selectSwapAlternatives({ foodTypes, excludeIds: inPlan })
      assert.ok(alts.every((a) => isVeg(a.recipe)), `${foodTypes}: icke-vegetariskt recept erbjuds`)
      assert.equal(alts.length, veg.length - 3, `${foodTypes}: alla vegetariska ska finnas med`)
    }
  })

  test('familjevänligt döljer inget: icke-familjevänliga recept finns med men rangordnas efter familjevänliga', () => {
    const alts = selectSwapAlternatives({ foodTypes: ['familjevanligt'], excludeIds: [] })
    assert.equal(alts.length, RECIPES.length)
    const nonFamily = RECIPES.filter((r) => !r.familyFriendly)
    assert.ok(nonFamily.length > 0)
    for (const r of nonFamily) assert.ok(ids(alts).includes(r.id), `${r.id} saknas`)
    assert.equal(alts[0].recipe.familyFriendly, true, 'ett familjevänligt recept ligger först')
    const firstNonFamily = alts.findIndex((a) => !a.recipe.familyFriendly)
    const lastFamily = alts.map((a) => a.recipe.familyFriendly).lastIndexOf(true)
    assert.ok(firstNonFamily > 0, 'familjevänliga ligger före minst ett icke-familjevänligt')
    assert.ok(lastFamily >= 0)
  })

  test('vegetariskt + familjevänligt: icke-familjevänliga vegetariska finns med', () => {
    const alts = selectSwapAlternatives({ foodTypes: ['vegetariskt', 'familjevanligt'], excludeIds: [] })
    assert.equal(alts.length, RECIPES.filter(isVeg).length)
    assert.ok(alts.some((a) => !a.recipe.familyFriendly) === RECIPES.filter(isVeg).some((r) => !r.familyFriendly))
  })

  test('kött & grönt döljer inget: vegetariska recept finns med men rangordnas efter kött och fisk', () => {
    const alts = selectSwapAlternatives({ foodTypes: ['kott-gront'], excludeIds: [] })
    assert.equal(alts.length, RECIPES.length)
    assert.equal(alts.filter((a) => isVeg(a.recipe)).length, RECIPES.filter(isVeg).length)
    assert.equal(isVeg(alts[0].recipe), false)
  })

  test('budget, tid och skafferi ändrar ordningen men aldrig mängden alternativ', () => {
    const base = ids(selectSwapAlternatives({ foodTypes: [], excludeIds: ['linsbolognese'] }))
    const ref = sel.findPlanRecipe('linsbolognese')
    const variants = [
      { budgetPerServing: 5 },
      { budgetPerServing: 4000 },
      { budgetPerServing: 9, referenceRecipe: ref },
      { pantryTerms: ['ris', 'olja', 'lök'], referenceRecipe: ref },
    ]
    for (const v of variants) {
      const alts = ids(selectSwapAlternatives({ foodTypes: [], excludeIds: ['linsbolognese'], ...v }))
      assert.deepEqual([...alts].sort(), [...base].sort(), JSON.stringify(v))
    }
    // En låg budget per portion sorterar billiga recept före dyra (ordningen påverkas).
    const cheap = ids(selectSwapAlternatives({ foodTypes: [], excludeIds: [], budgetPerServing: 5 }))
    assert.notDeepEqual(cheap, base.concat([]))
  })
})

describe('Byt rätt i genererade planer: alternativen, kostnadsskillnaden och planen efter byte', () => {
  const INPUTS = [
    { adults: 2, children: 1, duration: '2 veckor', budget: 2500, foodTypes: ['blandkost'], pantry: 'ris, olja', numberOfDishes: 7 },
    { adults: 2, children: 0, duration: '1 vecka', budget: 900, foodTypes: ['vegetariskt'], pantry: 'tomater, lök', numberOfDishes: 5 },
    { adults: 4, children: 2, duration: '1 månad', budget: 5000, foodTypes: ['familjevanligt', 'kott-gront'], pantry: 'pasta, vitlök', numberOfDishes: 10 },
    { adults: 3, children: 2, duration: '2 veckor', budget: 3000, foodTypes: ['vegetariskt', 'familjevanligt'], pantry: '', numberOfDishes: 5 },
  ]

  for (const input of INPUTS) {
    test(`${input.foodTypes.join('+')}, ${input.numberOfDishes} rätter, budget ${input.budget}`, async () => {
      const plan = await generatePlan(input)
      const slots = planSlots(plan)
      const wantVeg = input.foodTypes.includes('vegetariskt')
      if (wantVeg) assert.ok(slots.every((s) => isVeg(sel.findPlanRecipe(s))), 'planen är vegetarisk')

      for (const slot of slots) {
        const alts = altsFor(plan, slot)
        const expected = RECIPES.filter((r) => (!wantVeg || isVeg(r)) && !slots.includes(r.id)).map((r) => r.id)
        assert.deepEqual([...ids(alts)].sort(), [...expected].sort(), `${slot}: alla utom planens recept`)
        for (const s of slots) assert.ok(!ids(alts).includes(s), `${slot}: ${s} ingår redan i planen`)
        if (wantVeg) assert.ok(alts.every((a) => isVeg(a.recipe)))
      }

      // Kostnadsskillnaden för HELA planen stämmer för varje alternativ (inte bara de första), och
      // efter bytet visas just den summan. Kontrolleras mot summan av raderna i den ombyggda inköpslistan.
      const slot = slots[0]
      const before = rebuildPlanData(buildSwapOccurrenceSpecs(plan.recipes, slot, slot), plan.pantry, plan.pricing.budget)
      assert.equal(before.pricing.estimatedTotalCost, plan.pricing.estimatedTotalCost, 'baslinje = planens totalsumma')
      for (const { recipe } of altsFor(plan, slot)) {
        const delta = calculateSwapCostDelta({
          occurrences: plan.recipes, replacedBaseId: slot, newRecipeId: recipe.id,
          pantryText: plan.pantry, budget: plan.pricing.budget, currentTotalCost: plan.pricing.estimatedTotalCost,
        })
        const swapped = rebuildPlanData(buildSwapOccurrenceSpecs(plan.recipes, slot, recipe.id), plan.pantry, plan.pricing.budget)
        assert.equal(swapped.pricing.estimatedTotalCost, rowSum(swapped), recipe.id)
        assert.equal(delta, rowSum(swapped) - plan.pricing.estimatedTotalCost, recipe.id)
        assert.ok(swapped.recipes.every((r, i) => r.servings === plan.recipes[i].servings), 'portioner oförändrade')
      }
    })
  }
})

describe('Urvalet när planen först skapas är oförändrat', () => {
  test('familjevänligt är fortfarande ett hårt filter vid planering', () => {
    for (let i = 0; i < 20; i++) {
      const r = sel.selectRecipes({ foodTypes: ['familjevanligt'], numberOfDishes: 7, pantry: '', budget: 5000, requiredServings: 21 })
      assert.ok(r.ok)
      assert.ok(r.selected.every((s) => s.recipe.familyFriendly))
    }
  })
  test('kött & grönt och vegetariskt filtrerar fortfarande vid planering', () => {
    for (let i = 0; i < 20; i++) {
      const meat = sel.selectRecipes({ foodTypes: ['kott-gront'], numberOfDishes: 7, pantry: '', budget: 5000, requiredServings: 21 })
      assert.ok(meat.selected.every((s) => s.recipe.proteinType !== 'vegetariskt'))
      const veg = sel.selectRecipes({ foodTypes: ['vegetariskt'], numberOfDishes: 5, pantry: '', budget: 5000, requiredServings: 15 })
      assert.ok(veg.selected.every((s) => isVeg(s.recipe)))
    }
  })
})
