// Tester för "Har hemma" (skafferi): en skafferiterm tar bara bort varor som den matchar på hela ord
// eller via ett uttryckligt alias (pantryTermMatches i src/utils/selectRecipes.js), inte på godtyckliga
// delsträngar. Fynd 2026-11-19: fältets egen exempeltext "Ris, pasta, kryddor, olja" tog bort
// Harissapasta och Röd currypasta, "salt" tog bort Salta jordnötter, "majs" Majsstärkelse och "sallad"
// Salladslök.
//
// Kör med: npm run test:swap

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const sel = await import('../../src/utils/selectRecipes.js')
const { normalizeIngredientName } = await import('../../src/utils/referencePricing.js')

const lines = (plan) => Object.values(plan.shoppingList).flatMap((c) => c.items)
const names = (plan) => lines(plan).map((i) => i.displayName)
const rowSum = (plan) => Math.round(lines(plan).reduce((s, i) => s + i.lineCost, 0))

/** Bygger planen utan och med skafferi och kontrollerar exakt vilka rader som försvinner och totalsumman. */
function check(recipeId, pantry, expectedRemoved) {
  const specs = [{ baseId: recipeId, servings: 7 }]
  const without = sel.rebuildPlanData(specs, '', 100000)
  const withPantry = sel.rebuildPlanData(specs, pantry, 100000)
  const removed = names(without).filter((n) => !names(withPantry).includes(n)).sort()
  assert.deepEqual(removed, [...expectedRemoved].sort(), `${recipeId}, skafferi "${pantry}"`)
  // Totalsumman är exakt summan av de kvarvarande raderna, och sjunker med exakt de borttagna radernas kostnad.
  assert.equal(withPantry.pricing.estimatedTotalCost, rowSum(withPantry))
  const exact = (plan) => lines(plan).reduce((s, i) => s + i.lineCost, 0)
  const removedCost = lines(without).filter((i) => removed.includes(i.displayName)).reduce((s, i) => s + i.lineCost, 0)
  assert.ok(Math.abs(exact(without) - removedCost - exact(withPantry)) < 1e-6, 'övriga rader och deras kostnad är oförändrade')
}

describe('"Har hemma": inga godtyckliga delsträngar', () => {
  test('fältets exempeltext "Ris, pasta, kryddor, olja" tar inte bort Harissapasta', () =>
    check('harissakyckling-couscous', 'Ris, pasta, kryddor, olja', ['Olivolja']))
  test('"pasta" tar inte bort Röd currypasta', () => check('thailandsk-fiskcurry-kokosmjolk', 'pasta', []))
  test('"ris" tar bort riset men inte Harissapasta', () => {
    check('thailandsk-fiskcurry-kokosmjolk', 'ris', ['Ris'])
    check('harissakyckling-couscous', 'ris', [])
  })
  test('"salt" tar bort Salt men inte Salta jordnötter', () => check('currykyckling-kokosmjolk-mangochutney', 'salt', ['Salt']))
  test('"majs" tar inte bort Majsstärkelse', () => check('kycklingwok-nudlar', 'majs', []))
  test('"sallad" tar inte bort Salladslök (men väl salladen)', () => check('currykyckling-kokosmjolk-mangochutney', 'sallad', ['Romansallad']))
  test('"ost" tar inte bort Ostronsås, "mjöl" inte Mjölk/Kokosmjölk, "lök" inte Vitlök', () => {
    check('kycklingwok-nudlar', 'ost', [])
    check('currykyckling-kokosmjolk-mangochutney', 'mjöl', [])
    check('kycklingwok-nudlar', 'lök', [])
    check('kottfarslimpa-potatis-sas', 'lök', ['Gul lök'])
  })
})

describe('"Har hemma": varan tas bort när användaren anger rätt vara', () => {
  test('uttryckligt namn', () => {
    check('harissakyckling-couscous', 'harissapasta', ['Harissapasta'])
    check('harissakyckling-couscous', 'harissa', ['Harissapasta'])
    check('thailandsk-fiskcurry-kokosmjolk', 'röd currypasta', ['Röd currypasta'])
    check('thailandsk-fiskcurry-kokosmjolk', 'currypasta', ['Röd currypasta'])
    check('currykyckling-kokosmjolk-mangochutney', 'salta jordnötter', ['Salta jordnötter'])
    check('currykyckling-kokosmjolk-mangochutney', 'jordnötter', ['Salta jordnötter'])
    check('kycklingwok-nudlar', 'majsstärkelse', ['Majsstärkelse'])
    check('kycklingwok-nudlar', 'maizena', ['Majsstärkelse'])
    check('currykyckling-kokosmjolk-mangochutney', 'salladslök', ['Salladslök'])
  })
  test('vanliga avsedda matchningar fungerar fortfarande (hela ord, singular/plural och alias)', () => {
    check('kycklingwok-nudlar', 'olja, soja', ['Rapsolja', 'Sojasås'])
    check('linsbolognese', 'tomater, olja, lök', ['Krossade tomater', 'Rapsolja', 'Gul lök'])
    check('kottfarslimpa-potatis-sas', 'grädde, smör, mjöl, peppar', ['Matlagningsgrädde', 'Smör', 'Vetemjöl', 'Svartpeppar'])
    check('kycklinglar-i-ugn', 'parmesan, grädde, buljong, chili, vinäger, sallad', ['Parmesan', 'Vispgrädde', 'Kycklingbuljong', 'Chiliflakes', 'Vinäger', 'Grönsallad'])
    check('klassisk-kalops', 'morot, peppar, lagerblad', ['Morötter', 'Vitpeppar', 'Lagerblad'])
    check('kottfarslimpa-potatis-sas', 'fond, soja, ägg, potatis', ['Kalvfond', 'Sojasås', 'Ägg', 'Potatis'])
  })
  test('skiljetecken stör inte: "Ris, pasta.", "ris/pasta", "gul lök.", "ägg!"', () => {
    check('thailandsk-fiskcurry-kokosmjolk', 'Ris, pasta.', ['Ris'])
    check('linsbolognese', 'ris/pasta', ['Pasta'])
    check('kottfarslimpa-potatis-sas', 'gul lök., ägg!', ['Gul lök', 'Ägg'])
    check('harissakyckling-couscous', 'ris/pasta.', [])
  })
  test('specifik vara hemma tar bort receptets allmänna namn (uttryckliga alias)', () => {
    check('kycklinglar-i-ugn', 'parmesanost', ['Parmesan'])
    check('thailandsk-fiskcurry-kokosmjolk', 'strösocker, jasminris', ['Socker', 'Ris'])
    check('kottfarslimpa-potatis-sas', 'lättmjölk, havssalt', ['Mjölk', 'Salt'])
    check('kycklingtacos-majs-bonor', 'tortilla', ['Tortillabröd'])
  })
  test('skafferitermen och ingrediensen normaliseras lika ("riven ost", versaler, mellanslag)', () => {
    assert.equal(sel.pantryTermMatches(normalizeIngredientName(' Riven OST '), normalizeIngredientName('Parmesanost')), true)
    assert.equal(sel.pantryTermMatches(normalizeIngredientName('pasta'), normalizeIngredientName('Harissapasta')), false)
  })
})
