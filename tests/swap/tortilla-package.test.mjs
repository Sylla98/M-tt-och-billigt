// Regressionstest: tortillabröd i inköpslistan (testarfynd 2026-11-19: "0,8 tortillabröd").
// Förut stod "Tortillabröd 1 st" i recepten och betydde en hel förpackning. Skalningen gav decimaler
// (0,8 / 1,8 / 3,6 st) som visades som antal bröd. Nu anger recepten antal bröd (8 st per 4 portioner),
// och produkten Tortillabröd (8 st per förpackning, verifierat på produktsidan) har en inköpsenhet, så
// listan visar hela förpackningar: "Tortillabröd – 1 förpackning (8 st)".
//
// Kör med: npm run test:swap

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { rebuildPlanData } = await import('../../src/utils/selectRecipes.js')
const { RECIPES } = await import('../../src/data/recipes.js')
const { REFERENCE_PRICES } = await import('../../src/data/referencePrices.js')
const { buildDisplay } = await import('../../src/utils/shoppingDisplay.js')

const TORTILLA_RECIPES = RECIPES.filter((r) => r.ingredients.some((i) => i.name === 'Tortillabröd')).map((r) => r.id)
const PRODUCT = REFERENCE_PRICES.find((p) => p.key === 'tortillabrod')

function tortillaLine(specs) {
  const plan = rebuildPlanData(specs, '', 100000)
  const lines = Object.values(plan.shoppingList).flatMap((c) => c.items).filter((i) => i.displayName === 'Tortillabröd')
  assert.equal(lines.length, 1, 'exakt en inköpsrad för tortillabröd')
  return lines[0]
}

describe('tortillabröd i inköpslistan', () => {
  test('fyra recept använder tortillabröd, angivet som antal bröd (8 st per 4 portioner)', () => {
    assert.equal(TORTILLA_RECIPES.length, 4)
    for (const id of TORTILLA_RECIPES) {
      const ing = RECIPES.find((r) => r.id === id).ingredients.find((i) => i.name === 'Tortillabröd')
      assert.deepEqual([ing.quantity, ing.unit], [8, 'st'], id)
    }
    assert.equal(PRODUCT.packageQuantity, 8)
    assert.equal(PRODUCT.packageUnit, 'st')
  })

  const cases = [
    ['3 portioner', [3], 6, 1, 'Tortillabröd – 1 förpackning (8 st)'],
    ['4 portioner', [4], 8, 1, 'Tortillabröd – 1 förpackning (8 st)'],
    ['5 portioner', [5], 10, 2, 'Tortillabröd – 2 förpackningar (à 8 st)'],
    ['två tillagningar 7 + 7', [7, 7], 28, 4, 'Tortillabröd – 4 förpackningar (à 8 st)'],
  ]
  for (const id of ['vuxen-fisktaco-chililime', 'kycklingtacos-majs-bonor', 'krispiga-potatistacos-bonor-vitloksyoghurt', 'vegetariska-quesadillas-bonor-majs-ost']) {
    for (const [label, servings, need, packs, text] of cases) {
      test(`${id}, ${label}: hela förpackningar, inga decimaler, kostnad = förpackningar × pris`, () => {
        const line = tortillaLine(servings.map((s) => ({ baseId: id, servings: s })))
        assert.equal(line.requiredQuantity, need)
        assert.equal(line.packagesRequired, packs)
        assert.equal(line.lineCost, packs * PRODUCT.estimatedPackagePrice)
        assert.equal(buildDisplay(line).name, text)
        assert.doesNotMatch(buildDisplay(line).name, /\d,\d/)
      })
    }
  }

  test('alla fyra recept i samma plan slås ihop till en rad med hela förpackningar', () => {
    const line = tortillaLine([
      { baseId: 'vuxen-fisktaco-chililime', servings: 7 },
      { baseId: 'kycklingtacos-majs-bonor', servings: 8 },
      { baseId: 'krispiga-potatistacos-bonor-vitloksyoghurt', servings: 6 },
      { baseId: 'vegetariska-quesadillas-bonor-majs-ost', servings: 7 },
    ])
    assert.equal(line.requiredQuantity, 56)
    assert.equal(line.packagesRequired, 7)
    assert.equal(line.lineCost, 7 * PRODUCT.estimatedPackagePrice)
    assert.equal(buildDisplay(line).name, 'Tortillabröd – 7 förpackningar (à 8 st)')
  })
})
