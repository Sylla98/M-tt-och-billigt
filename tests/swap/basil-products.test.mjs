// Tester för att färsk och torkad basilika är SEPARATA produkter i prismatchningen,
// kopplade uttryckligt med priceKey (inte via namnnormalisering), samt för de
// redaktionella receptvalen: Färsk basilika 10 g per 4 portioner i
// en-riktigt-god-kottfarssas och "Torkad basilika" i ugnsbakad-gnocchi-mozzarella.
//
// Kör med: npm run test:swap  (kräver alias-laddaren för '@/'-importer)
//
// OBS: ingen verifierad förpackningsstorlek eller pris för färsk basilika finns i
// referencePrices.js. Testprodukten nedan (key 'farsk-basilika', 20 g, 99 kr) är bara ett
// TESTVÄRDE som läggs in tillfälligt i minnet för att pröva förpackningsräkningen. Den är
// varken ett förslag eller ett referenspris och tas bort efter varje test.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sel = await import('../../src/utils/selectRecipes.js')
const { RECIPES } = await import('../../src/data/recipes.js')
const { REFERENCE_PRICES } = await import('../../src/data/referencePrices.js')
const pricing = await import('../../src/utils/referencePricing.js')
const { scaleIngredient } = await import('../../src/utils/portionScaling.js')
const { buildShoppingItems, rebuildPlanData, calculateSwapCostDelta, buildSwapOccurrenceSpecs, groupItemsByCategory } = sel
const { resolveReferenceProduct, priceShoppingListWithReference } = pricing

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const recipe = (id) => RECIPES.find((r) => r.id === id)
const KOTTFARS = 'en-riktigt-god-kottfarssas'
const GNOCCHI = 'ugnsbakad-gnocchi-mozzarella'
const rec = (...ingredients) => ({ ingredients: ingredients.map(([name, quantity, unit, category = 'pantry', priceKey]) => ({ name, quantity, unit, category, ...(priceKey ? { priceKey } : {}) })) })
const roundHalf = (v) => Math.round(v * 2) / 2
const allItems = (plan) => Object.values(plan.shoppingList).flatMap((c) => c.items)
const rowSum = (plan) => Math.round(allItems(plan).reduce((s, i) => s + i.lineCost, 0))

/** Lägger tillfälligt in en TESTprodukt för färsk basilika och tar bort den igen. */
function withTestFreshProduct(fn, product = {}) {
  const p = { key: 'farsk-basilika', displayName: 'TESTPRODUKT färsk basilika', aliases: ['testprodukt-ingen-namnmatchning'], packageQuantity: 20, packageUnit: 'g', estimatedPackagePrice: 99, purchaseType: 'package', ...product }
  REFERENCE_PRICES.push(p)
  try { return fn(p) } finally { REFERENCE_PRICES.splice(REFERENCE_PRICES.indexOf(p), 1) }
}

describe('redaktionella receptval är pinnade', () => {
  test('en-riktigt-god-kottfarssas: färsk basilika 10 g per 4 portioner, torkad kvar i tsk, båda med priceKey', () => {
    const r = recipe(KOTTFARS)
    const fresh = r.ingredients.find((i) => i.name === 'Färsk basilika')
    const dried = r.ingredients.find((i) => i.name === 'Torkad basilika')
    assert.deepEqual({ ...fresh }, { name: 'Färsk basilika', quantity: 10, unit: 'g', category: 'vegetables', priceKey: 'farsk-basilika' })
    assert.deepEqual({ ...dried }, { name: 'Torkad basilika', quantity: 0.5, unit: 'tsk', category: 'pantry', priceKey: 'torkad-basilika' })
    assert.equal(r.baseServings, 4)
    const text = r.instructions.join(' ')
    assert.match(text, /Blanda ner det mesta i såsen och spara resten till servering/)
    assert.match(text, /den sparade basilikan/)
  })

  test('ugnsbakad-gnocchi-mozzarella: "Basilika" är förtydligad till "Torkad basilika" (ingrediens och steg)', () => {
    const r = recipe(GNOCCHI)
    assert.deepEqual({ ...r.ingredients.find((i) => /basilika/i.test(i.name)) }, { name: 'Torkad basilika', quantity: 1, unit: 'tsk', category: 'pantry', priceKey: 'torkad-basilika' })
    assert.ok(r.instructions.some((s) => /torkad basilika/.test(s)))
    assert.ok(!RECIPES.some((x) => x.ingredients.some((i) => i.name === 'Basilika')), 'ingen oförtydligad "Basilika" kvar i biblioteket')
  })

  test('alla basilika-ingredienser i biblioteket har en uttrycklig priceKey', () => {
    const rows = RECIPES.flatMap((r) => r.ingredients.filter((i) => /basilika/i.test(i.name)).map((i) => [i.name, i.priceKey]))
    assert.deepEqual(rows.sort(), [['Färsk basilika', 'farsk-basilika'], ['Torkad basilika', 'torkad-basilika'], ['Torkad basilika', 'torkad-basilika']])
  })
})

describe('prismatchning: priceKey har företräde och faller aldrig tillbaka på namn', () => {
  test('torkad basilika kopplas till torkad-basilika-produkten (kryddburk)', () => {
    const p = resolveReferenceProduct({ priceKey: 'torkad-basilika', name: 'Torkad basilika' })
    assert.equal(p.key, 'torkad-basilika')
    assert.equal(p.displayName, 'Torkad basilika')
  })

  test('färsk basilika får ALDRIG den torkade produkten, varken med eller utan färsk-produkt i listan', () => {
    const noProduct = resolveReferenceProduct({ priceKey: 'farsk-basilika', name: 'Färsk basilika' })
    // Så länge ingen verifierad färsk-produkt finns: null (ingen fallback till namnmatchning). Finns den: bara den.
    assert.ok(noProduct === null || noProduct.key === 'farsk-basilika', 'aldrig den torkade produkten')
    withTestFreshProduct((p) => {
      assert.equal(resolveReferenceProduct({ priceKey: 'farsk-basilika', name: 'Färsk basilika' }), p)
      assert.notEqual(resolveReferenceProduct({ priceKey: 'farsk-basilika', name: 'Färsk basilika' }).key, 'torkad-basilika')
    })
  })

  test('kopplingen beror inte på namnet: valfritt namn med priceKey ger rätt produkt', () => {
    withTestFreshProduct((p) => {
      for (const name of ['Färsk basilika', 'Basilika', 'Torkad basilika', 'Basilikaörten', 'Något helt annat']) {
        assert.equal(resolveReferenceProduct({ priceKey: 'farsk-basilika', name }), p, name)
      }
    })
  })

  test('utan priceKey gäller namnmatchningen som förut (oförändrat beteende för övriga varor)', () => {
    assert.equal(resolveReferenceProduct({ name: 'Basilika' }).key, 'torkad-basilika')
    assert.equal(resolveReferenceProduct({ name: 'Köttfärs' }).key, 'kottfars')
    assert.equal(resolveReferenceProduct({ name: 'Nötfärs' }).key, 'kottfars')
    assert.equal(resolveReferenceProduct({ name: 'Finns inte alls' }), null)
  })

  const freshProductExists = REFERENCE_PRICES.some((p) => p.key === 'farsk-basilika')
  test('saknad produkt: färsk basilika får generiskt kategoripris och flaggas som saknat prisunderlag', { skip: freshProductExists && 'färsk-produkt finns nu i referencePrices.js' }, () => {
    const plan = rebuildPlanData([{ baseId: KOTTFARS, servings: 7 }], '', 4000)
    const fresh = allItems(plan).find((i) => i.displayName === 'Färsk basilika')
    assert.equal(fresh.isGenericEstimate, true, 'generiskt pris syns i data (inte ett referenspris)')
    assert.equal(fresh.priceKey, 'farsk-basilika')
    const dried = allItems(plan).find((i) => i.displayName === 'Torkad basilika')
    assert.equal(dried.isGenericEstimate, false)
    assert.equal(dried.unitPrice, REFERENCE_PRICES.find((p) => p.key === 'torkad-basilika').estimatedPackagePrice, 'torkad: burkens pris')
    assert.notEqual(fresh.lineCost, dried.lineCost, 'färsk prissätts inte som torkad')
  })
})

describe('skalning och sammanräkning', () => {
  test('Färsk basilika 10 g per 4 portioner skalas linjärt: 4→10, 7→17,5, 8→20, 11→27,5, 14→35 g', () => {
    const fresh = recipe(KOTTFARS).ingredients.find((i) => i.name === 'Färsk basilika')
    const got = [4, 7, 8, 11, 14].map((p) => scaleIngredient(fresh, 4, p).quantity)
    assert.deepEqual(got, [10, 17.5, 20, 27.5, 35])
    assert.equal(scaleIngredient(fresh, 4, 7).priceKey, 'farsk-basilika', 'priceKey följer med skalningen')
  })

  test('Torkad basilika skalas i halva teskedar', () => {
    const dried = recipe(KOTTFARS).ingredients.find((i) => i.name === 'Torkad basilika')
    for (const p of [4, 7, 8, 11, 14]) assert.equal(scaleIngredient(dried, 4, p).quantity, roundHalf((0.5 * p) / 4), `${p} portioner`)
  })

  test('flera tillagningar summeras per produkt: 2 × köttfärssås à 7 port = 35 g färsk; torkad summeras med gnocchins', () => {
    const plan = rebuildPlanData([{ baseId: KOTTFARS, servings: 7 }, { baseId: KOTTFARS, servings: 7 }, { baseId: GNOCCHI, servings: 7 }], '', 4000)
    const fresh = allItems(plan).filter((i) => i.displayName === 'Färsk basilika')
    assert.equal(fresh.length, 1)
    assert.deepEqual([fresh[0].requiredQuantity, fresh[0].requiredUnit], [35, 'g'])
    const driedRows = allItems(plan).filter((i) => i.priceKey === 'torkad-basilika')
    assert.equal(driedRows.length, 1, 'torkad basilika från båda recepten slås ihop till en rad')
    const want = plan.recipes.flatMap((r) => r.ingredients).filter((i) => i.name === 'Torkad basilika').reduce((s, i) => s + i.quantity, 0)
    assert.equal(driedRows[0].requiredQuantity, want)
    assert.equal(driedRows[0].requiredUnit, 'tsk')
    assert.equal(want, 1 + 1 + roundHalf((1 * 7) / 4), '0,5 tsk × 7/4 → 1, två gånger, plus gnocchins 1 tsk × 7/4 → 2')
  })

  test('olika produkter slås aldrig ihop, även med samma namn, enhet och enhetsfamilj', () => {
    const items = buildShoppingItems([rec(['Färsk basilika', 10, 'g', 'vegetables', 'farsk-basilika'], ['Torkad basilika', 5, 'g', 'pantry', 'torkad-basilika']), rec(['Färsk basilika', 7.5, 'g', 'vegetables', 'farsk-basilika'])])
    assert.equal(items.length, 2)
    assert.deepEqual(items.map((i) => [i.displayName, i.quantity, i.priceKey]).sort(), [['Färsk basilika', 17.5, 'farsk-basilika'], ['Torkad basilika', 5, 'torkad-basilika']])
  })
})

describe('förpackningsantal (med en TESTprodukt på 20 g)', () => {
  const rows = (g) => groupItemsByCategory(buildShoppingItems([rec(['Färsk basilika', g, 'g', 'vegetables', 'farsk-basilika'])]))
  const line = (g) => allItemsOf(priceShoppingListWithReference(rows(g)).shoppingList)[0]
  const allItemsOf = (list) => Object.values(list).flatMap((c) => c.items)

  test('hela förpackningar uppåt, med gränsfall: 7 g och 20 g → 1, 20,1 g och 35 g → 2, 40,1 g → 3', () => {
    withTestFreshProduct(() => {
      for (const [g, packages] of [[7, 1], [20, 1], [20.1, 2], [35, 2], [40, 2], [40.1, 3]]) {
        const l = line(g)
        assert.equal(l.packagesRequired, packages, `${g} g`)
        assert.equal(l.lineCost, packages * 99, `${g} g`)
        assert.equal(l.isGenericEstimate, false)
        assert.equal(l.packageAmount, 20)
      }
    })
  })

  test('hela planen (35 g färsk): 2 förpackningar, torkad basilika påverkas inte av färsk-produkten', () => {
    const before = rebuildPlanData([{ baseId: KOTTFARS, servings: 7 }, { baseId: KOTTFARS, servings: 7 }], '', 4000)
    const driedBefore = allItems(before).find((i) => i.displayName === 'Torkad basilika')
    withTestFreshProduct(() => {
      const plan = rebuildPlanData([{ baseId: KOTTFARS, servings: 7 }, { baseId: KOTTFARS, servings: 7 }], '', 4000)
      const fresh = allItems(plan).find((i) => i.displayName === 'Färsk basilika')
      assert.equal(fresh.requiredQuantity, 35)
      assert.equal(fresh.packagesRequired, 2)
      assert.equal(fresh.lineCost, 198)
      assert.deepEqual(allItems(plan).find((i) => i.displayName === 'Torkad basilika'), driedBefore)
      assert.equal(rowSum(plan), plan.pricing.estimatedTotalCost)
    })
  })
})

describe('skafferi ("Har hemma"): färsk och torkad hålls åtskilda', () => {
  const specs = [{ baseId: KOTTFARS, servings: 7 }, { baseId: GNOCCHI, servings: 7 }]
  const names = (pantry) => allItems(rebuildPlanData(specs, pantry, 4000)).map((i) => i.displayName).filter((n) => /basilika/i.test(n)).sort()

  test('utan skafferi finns båda', () => assert.deepEqual(names(''), ['Färsk basilika', 'Torkad basilika']))
  test('"torkad basilika" hemma tar bara bort den torkade (i båda recepten)', () => {
    assert.deepEqual(names('torkad basilika'), ['Färsk basilika'])
    assert.deepEqual(names('Torkade basilika, ris'), ['Färsk basilika'])
  })
  test('"färsk basilika" hemma tar bara bort den färska', () => {
    assert.deepEqual(names('färsk basilika'), ['Torkad basilika'])
    assert.deepEqual(names('färska basilika'), ['Torkad basilika'])
  })
  test('"basilika" utan färsk/torkad tar som förut bort båda (dokumenterat val)', () => assert.deepEqual(names('basilika'), []))
  test('orelaterat skafferi påverkar inte basilikan', () => assert.deepEqual(names('ris, olja'), ['Färsk basilika', 'Torkad basilika']))
  test('varor utan priceKey påverkas inte av färsk/torkad-regeln: "färska ärtor" hemma tar som förut bort Frysta ärtor', () => {
    const items = buildShoppingItems([rec(['Frysta ärtor', 300, 'g', 'vegetables'])], 'färska ärtor')
    assert.deepEqual(items, [])
  })
  test('mängder bevaras för det som är kvar', () => {
    const plan = rebuildPlanData(specs, 'torkad basilika', 4000)
    const fresh = allItems(plan).find((i) => i.displayName === 'Färsk basilika')
    assert.deepEqual([fresh.requiredQuantity, fresh.requiredUnit], [17.5, 'g'])
  })
})

describe('Byt rätt med färsk och torkad basilika', () => {
  const specs = [{ baseId: KOTTFARS, servings: 7 }, { baseId: GNOCCHI, servings: 7 }, { baseId: 'kramig-tomatpasta', servings: 7 }]
  for (const withProduct of [false, true]) {
    for (const pantry of ['', 'torkad basilika', 'färsk basilika']) {
      test(`kostnadsskillnad = skillnad i oberoende radsummor (färsk-produkt i listan: ${withProduct}, skafferi "${pantry}")`, () => {
        const run = () => {
          const plan = rebuildPlanData(specs, pantry, 4000)
          assert.equal(rowSum(plan), plan.pricing.estimatedTotalCost)
          for (const out of [KOTTFARS, GNOCCHI]) {
            for (const next of ['kikartscurry', 'kottbullar-potatis-graddsas']) {
              const delta = calculateSwapCostDelta({ occurrences: plan.recipes, replacedBaseId: out, newRecipeId: next, pantryText: pantry, budget: 4000, currentTotalCost: plan.pricing.estimatedTotalCost })
              const swapped = rebuildPlanData(buildSwapOccurrenceSpecs(plan.recipes, out, next), pantry, 4000)
              assert.equal(delta, rowSum(swapped) - rowSum(plan), `${out} → ${next}`)
              const stillFresh = allItems(swapped).some((i) => i.displayName === 'Färsk basilika')
              assert.equal(stillFresh, out !== KOTTFARS && pantry !== 'färsk basilika', 'färsk basilika följer receptet som innehåller den')
              const stillDried = allItems(swapped).some((i) => i.displayName === 'Torkad basilika')
              assert.equal(stillDried, pantry !== 'torkad basilika', 'torkad basilika finns kvar så länge något recept i planen har den')
            }
          }
        }
        withProduct ? withTestFreshProduct(run) : run()
      })
    }
  }
})

describe('valideraren och verifieringsskriptet', () => {
  test('validate:recipes: inga fel, och saknad produkt för priceKey "farsk-basilika" är en varning (inte fel)', { skip: REFERENCE_PRICES.some((p) => p.key === 'farsk-basilika') && 'färsk-produkt finns nu' }, () => {
    const r = spawnSync(process.execPath, ['--experimental-default-type=module', 'scripts/validate-recipes.mjs'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout.slice(-800) + r.stderr.slice(-300))
    assert.match(r.stdout, /Alla recept är giltiga/)
    assert.match(r.stdout, /priceKey "farsk-basilika" men ingen produkt/)
  })

  test('verify:recipe för köttfärssåsen: inga fel och SAKNAT PRISUNDERLAG för Färsk basilika redovisas', { skip: REFERENCE_PRICES.some((p) => p.key === 'farsk-basilika') && 'färsk-produkt finns nu' }, () => {
    const r = spawnSync(process.execPath, ['--import', './tests/swap/register-alias.mjs', 'scripts/verify-recipe-plan.mjs', KOTTFARS], { cwd: repo, encoding: 'utf8', timeout: 120000 })
    assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-300))
    assert.match(r.stdout, /Inga fel\./)
    assert.match(r.stdout, /SAKNAT PRISUNDERLAG[\s\S]*Färsk basilika: priceKey "farsk-basilika" saknar produkt/)
  })

  test('verify:recipe upptäcker om appen prissätter färsk basilika som torkad (priceKey ignoreras i en kopia)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-basil-'))
    try {
      fs.cpSync(path.join(repo, 'src'), path.join(dir, 'src'), { recursive: true })
      fs.cpSync(path.join(repo, 'scripts'), path.join(dir, 'scripts'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'tests', 'swap'), { recursive: true })
      for (const f of ['alias-hooks.mjs', 'register-alias.mjs']) fs.copyFileSync(path.join(repo, 'tests', 'swap', f), path.join(dir, 'tests', 'swap', f))
      fs.symlinkSync(path.join(repo, 'public'), path.join(dir, 'public'))
      const file = path.join(dir, 'src', 'utils', 'referencePricing.js')
      const code = fs.readFileSync(file, 'utf8')
      const broken = code.replace("if (priceKey) return REFERENCE_PRICES.find((p) => p.key === priceKey) || null", 'if (false) return null')
      assert.notEqual(broken, code, 'kunde inte införa felet i kopian')
      fs.writeFileSync(file, broken)
      const r = spawnSync(process.execPath, ['--import', './tests/swap/register-alias.mjs', 'scripts/verify-recipe-plan.mjs', KOTTFARS], { cwd: dir, encoding: 'utf8', timeout: 120000 })
      assert.equal(r.status, 1, 'avslutskod 1')
      assert.match(r.stdout, /"Färsk basilika" kostar 18 kr i appen men 25 kr enligt oberoende uträkning/)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
