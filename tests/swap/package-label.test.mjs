// Tester för den generella regeln om inköpsenhet i inköpslistan (Elis önskemål 2026-11-03):
// en produkt kan ha packageLabel { singular, plural } i referencePrices.js, och inköpslistan visar då
// antal förpackningar med den enheten, t.ex. "1 kruka färsk basilika" / "2 krukor färsk basilika".
//
// OBS: ingen verifierad produkt för färsk basilika (gram per kruka, pris) finns i referencePrices.js.
// Alla värden nedan (30 g per kruka, 40 kr) är TESTVÄRDEN som läggs in tillfälligt i minnet eller i en
// kopia av koden. De är varken förslag eller referenspriser.
//
// Kör med: npm run test:swap  (kräver alias-laddaren för '@/'-importer)

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
const { priceShoppingListWithReference } = await import('../../src/utils/referencePricing.js')
const { packageCountName } = await import('../../src/utils/shoppingDisplay.js')
const { buildShoppingItems, groupItemsByCategory, rebuildPlanData } = sel

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEST_ID = 'test-kruka'
const FRESH = { name: 'Färsk basilika', quantity: 10, unit: 'g', category: 'vegetables', priceKey: 'farsk-basilika' }
const TEST_RECIPE = {
  id: TEST_ID, name: 'TESTRECEPT', description: 'test', baseServings: 4, dietTypes: ['blandkost'], familyFriendly: true, activeTimeMinutes: 10,
  totalTimeMinutes: 20, tags: [], proteinType: 'vegetariskt', carbohydrateType: 'pasta', freezerFriendly: false, servedWith: '', fridgeStorage: '',
  freezerStorage: '', ingredients: [{ name: 'Pasta', quantity: 400, unit: 'g', category: 'pasta' }, FRESH], instructions: ['a', 'b'], image: '/recipe-images/test.jpg',
}
const TEST_PRODUCT = { key: 'farsk-basilika', displayName: 'TESTPRODUKT', aliases: [], packageQuantity: 30, packageUnit: 'g', estimatedPackagePrice: 40, purchaseType: 'package', packageLabel: { singular: 'kruka', plural: 'krukor' } }
const rec = (...ings) => ({ ingredients: ings.map(([name, quantity, unit, category = 'pantry', priceKey]) => ({ name, quantity, unit, category, ...(priceKey ? { priceKey } : {}) })) })
const allItems = (plan) => Object.values(plan.shoppingList).flatMap((c) => c.items)

function withProduct(fn, product = TEST_PRODUCT) {
  const real = REFERENCE_PRICES.filter((x) => x.key === product.key)
  for (const r of real) REFERENCE_PRICES.splice(REFERENCE_PRICES.indexOf(r), 1)
  REFERENCE_PRICES.push(product)
  try { return fn() } finally { REFERENCE_PRICES.splice(REFERENCE_PRICES.indexOf(product), 1); REFERENCE_PRICES.push(...real) }
}
const priced = (ings, pantry = '') => Object.values(priceShoppingListWithReference(groupItemsByCategory(buildShoppingItems([rec(...ings)], pantry))).shoppingList).flatMap((c) => c.items)

describe('packageCountName: texten i inköpslistan', () => {
  const item = (n, label = { singular: 'kruka', plural: 'krukor' }) => ({ displayName: 'Färsk basilika', packagesRequired: n, ...(label ? { packageLabel: label } : {}) })
  test('1 → singular, 2 och fler → plural, namnet först och sedan antal (med tankstreck)', () => {
    assert.equal(packageCountName(item(1)), 'Färsk basilika – 1 kruka')
    assert.equal(packageCountName(item(2)), 'Färsk basilika – 2 krukor')
    assert.equal(packageCountName(item(3)), 'Färsk basilika – 3 krukor')
  })
  test('ingen inköpsenhet eller okänt antal förpackningar → null (raden visas som förut)', () => {
    assert.equal(packageCountName(item(2, null)), null)
    assert.equal(packageCountName({ displayName: 'X', packageLabel: { singular: 'a', plural: 'b' }, packagesRequired: null }), null)
    assert.equal(packageCountName(null), null)
    assert.equal(packageCountName({}), null)
  })
  test('generell regel: gäller vilken enhet en produkt anger (t.ex. knippe/knippen)', () => {
    assert.equal(packageCountName({ displayName: 'Dill', packagesRequired: 2, packageLabel: { singular: 'knippe', plural: 'knippen' } }), 'Dill – 2 knippen')
  })
})

describe('prissatta rader bär inköpsenheten', () => {
  test('antal förpackningar följer mängden: 7 g och 30 g → 1 kruka, 30,1 g och 60 g → 2 krukor, 61 g → 3 krukor', () => {
    withProduct(() => {
      for (const [g, n, text] of [[7, 1, 'Färsk basilika – 1 kruka'], [30, 1, 'Färsk basilika – 1 kruka'], [30.1, 2, 'Färsk basilika – 2 krukor'], [60, 2, 'Färsk basilika – 2 krukor'], [61, 3, 'Färsk basilika – 3 krukor']]) {
        const [row] = priced([['Färsk basilika', g, 'g', 'vegetables', 'farsk-basilika']])
        assert.equal(row.packagesRequired, n, `${g} g`)
        assert.equal(row.lineCost, n * 40)
        assert.deepEqual(row.packageLabel, { singular: 'kruka', plural: 'krukor' })
        assert.equal(packageCountName(row), text, `${g} g`)
      }
    })
  })

  test('inköpsenheten följer med i alla tre förpackningsgrenar (samma familj, skedmått, familj som inte matchar)', () => {
    withProduct(() => {
      for (const [q, u] of [[45, 'g'], [2, 'msk'], [2, 'dl']]) {
        const [row] = priced([['Färsk basilika', q, u, 'vegetables', 'farsk-basilika']])
        assert.deepEqual(row.packageLabel, { singular: 'kruka', plural: 'krukor' }, `${q} ${u}`)
        assert.ok(packageCountName(row))
      }
    })
  })

  test('produkter utan inköpsenhet och generiska rader får inget packageLabel (radens form är oförändrad)', () => {
    const [dried] = priced([['Torkad basilika', 1, 'tsk', 'pantry', 'torkad-basilika']])
    assert.ok(!('packageLabel' in dried))
    const [generic] = priced([['Färsk basilika', 10, 'g', 'vegetables', 'farsk-basilika']])
    if (!REFERENCE_PRICES.some((p) => p.key === 'farsk-basilika')) {
      assert.equal(generic.isGenericEstimate, true)
      assert.ok(!('packageLabel' in generic), 'ingen produkt → ingen kruka och ingen gissad mängd')
    }
    for (const row of priced([['Spaghetti', 500, 'g', 'pasta'], ['Potatis', 1, 'kg', 'vegetables']])) assert.ok(!('packageLabel' in row), row.displayName)
  })

  test('hela planen (testrecept 2 × 7 portioner = 35 g): 2 krukor; torkad basilika påverkas inte', () => {
    RECIPES.push(TEST_RECIPE)
    try {
      withProduct(() => {
        const plan = rebuildPlanData([{ baseId: TEST_ID, servings: 7 }, { baseId: TEST_ID, servings: 7 }, { baseId: 'ugnsbakad-gnocchi-mozzarella', servings: 7 }], '', 4000)
        const fresh = allItems(plan).find((i) => i.displayName === 'Färsk basilika')
        assert.equal(fresh.requiredQuantity, 35)
        assert.equal(packageCountName(fresh), 'Färsk basilika – 2 krukor')
        const dried = allItems(plan).find((i) => i.displayName === 'Torkad basilika')
        assert.ok(!('packageLabel' in dried))
        const sum = Math.round(allItems(plan).reduce((s, i) => s + i.lineCost, 0))
        assert.equal(sum, plan.pricing.estimatedTotalCost)
      })
    } finally { RECIPES.splice(RECIPES.indexOf(TEST_RECIPE), 1) }
  })

  test('behovet summeras över HELA planen innan det avrundas uppåt till hela krukor, och kostnaden följer samma antal', () => {
    RECIPES.push(TEST_RECIPE)
    try {
      withProduct(() => {
        // 3 tillagningar à 7 portioner = 3 × 17,5 g = 52,5 g. Per tillfälle avrundat uppåt vore det 3 krukor (30 g/kruka);
        // summerat först blir det 52,5 / 30 = 1,75 → 2 krukor.
        const specs = [1, 2, 3].map(() => ({ baseId: TEST_ID, servings: 7 }))
        const plan = rebuildPlanData(specs, '', 4000)
        const fresh = allItems(plan).find((i) => i.displayName === 'Färsk basilika')
        assert.equal(fresh.requiredQuantity, 52.5)
        assert.equal(fresh.packagesRequired, Math.ceil(52.5 / 30))
        assert.equal(fresh.packagesRequired, 2)
        assert.equal(packageCountName(fresh), 'Färsk basilika – 2 krukor')
        assert.equal(fresh.lineCost, fresh.packagesRequired * 40, 'kostnaden bygger på samma antal krukor som listan visar')
        // Gränsfall (2,5 g per portion, 30 g per TESTkruka): 12 portioner = 30 g → 1, 13 = 32,5 g → 2, 24 = 60 g → 2, 25 = 62,5 g → 3
        for (const [servings, krukor] of [[4, 1], [12, 1], [13, 2], [24, 2], [25, 3]]) {
          const p = rebuildPlanData([{ baseId: TEST_ID, servings }], '', 4000)
          const row = allItems(p).find((i) => i.displayName === 'Färsk basilika')
          assert.equal(row.packagesRequired, krukor, `${servings} portioner = ${row.requiredQuantity} g`)
          assert.equal(row.lineCost, krukor * 40)
        }
      })
    } finally { RECIPES.splice(RECIPES.indexOf(TEST_RECIPE), 1) }
  })

  test('"Har hemma": färsk basilika hemma tar bort kruk-raden, torkad hemma lämnar den', () => {
    RECIPES.push(TEST_RECIPE)
    try {
      withProduct(() => {
        const specs = [{ baseId: TEST_ID, servings: 7 }, { baseId: 'ugnsbakad-gnocchi-mozzarella', servings: 7 }]
        const names = (p) => allItems(rebuildPlanData(specs, p, 4000)).map((i) => i.displayName).filter((n) => /basilika/i.test(n)).sort()
        assert.deepEqual(names(''), ['Färsk basilika', 'Torkad basilika'])
        assert.deepEqual(names('färsk basilika'), ['Torkad basilika'])
        assert.deepEqual(names('torkad basilika'), ['Färsk basilika'])
      })
    } finally { RECIPES.splice(RECIPES.indexOf(TEST_RECIPE), 1) }
  })
})

// ── Valideraren och verifieringsskriptet, mot kopior av koden ───────────────
const TORKAD_LINE = "      { name: 'Torkad basilika', quantity: 0.5, unit: 'tsk', category: 'pantry', priceKey: 'torkad-basilika' },\n"
const FRESH_LINE = "      { name: 'Färsk basilika', quantity: 10, unit: 'g', category: 'vegetables', priceKey: 'farsk-basilika' },\n"
const PRODUCT_LINE = "  { key: 'farsk-basilika', displayName: 'TESTPRODUKT', aliases: [], packageQuantity: 30, packageUnit: 'g', estimatedPackagePrice: 40, purchaseType: 'package', packageLabel: { singular: 'kruka', plural: 'krukor' } },\n"

function makeCopy({ withFreshRecipe = false, withFreshProduct = false, badLabel = false, dropLabelInRows = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'label-copy-'))
  fs.cpSync(path.join(repo, 'src'), path.join(dir, 'src'), { recursive: true })
  fs.cpSync(path.join(repo, 'scripts'), path.join(dir, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'tests', 'swap'), { recursive: true })
  for (const f of ['alias-hooks.mjs', 'register-alias.mjs']) fs.copyFileSync(path.join(repo, 'tests', 'swap', f), path.join(dir, 'tests', 'swap', f))
  fs.symlinkSync(path.join(repo, 'public'), path.join(dir, 'public'))
  const patch = (file, from, to) => {
    const f = path.join(dir, file)
    const code = fs.readFileSync(f, 'utf8')
    const out = code.replace(from, to)
    assert.notEqual(out, code, `kunde inte ändra ${file} i kopian`)
    fs.writeFileSync(f, out)
  }
  if (withFreshRecipe) patch('src/data/recipes.js', TORKAD_LINE, TORKAD_LINE + FRESH_LINE)
  if (withFreshProduct) patch('src/data/referencePrices.js', '  { key: \'rodcurrypasta\',', PRODUCT_LINE + '  { key: \'rodcurrypasta\',')
  if (badLabel) patch('src/data/referencePrices.js', "  { key: 'rodcurrypasta',", "  { key: 'trasig-etikett', displayName: 'X', aliases: ['x'], packageQuantity: 1, packageUnit: 'st', estimatedPackagePrice: 1, purchaseType: 'package', packageLabel: { singular: 'kruka' } },\n  { key: 'rodcurrypasta',")
  if (dropLabelInRows) patch('src/utils/referencePricing.js', '        ...(result.packageLabel ? { packageLabel: result.packageLabel } : {}),\n', '')
  return dir
}
const run = (dir, args) => spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', timeout: 120000 })
const verify = (dir) => run(dir, ['--import', './tests/swap/register-alias.mjs', 'scripts/verify-recipe-plan.mjs', 'en-riktigt-god-kottfarssas'])
const noFreshProduct = !REFERENCE_PRICES.some((p) => p.key === 'farsk-basilika')

describe('valideraren och verifieringsskriptet kontrollerar inköpsenheten', () => {
  test('validate:recipes: ofullständigt packageLabel är ett fel (kopia med trasig produkt)', () => {
    const dir = makeCopy({ badLabel: true })
    try {
      const r = run(dir, ['--experimental-default-type=module', 'scripts/validate-recipes.mjs'])
      assert.equal(r.status, 1)
      assert.match(r.stdout + r.stderr, /produkt "trasig-etikett": packageLabel måste vara \{ singular, plural \}/)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })

  test('verify:recipe: färsk basilika med kruk-produkt: inga fel och ingen saknad prisunderlag för färsk basilika', { skip: !noFreshProduct && 'färsk-produkt finns nu' }, () => {
    const dir = makeCopy({ withFreshRecipe: true, withFreshProduct: true })
    try {
      const r = verify(dir)
      assert.equal(r.status, 0, r.stdout.slice(-1500))
      assert.match(r.stdout, /Inga fel\./)
      assert.doesNotMatch(r.stdout, /Färsk basilika: priceKey "farsk-basilika" saknar produkt/)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })

  test('verify:recipe upptäcker om appen tappar inköpsenheten på raden', { skip: !noFreshProduct && 'färsk-produkt finns nu' }, () => {
    const dir = makeCopy({ withFreshRecipe: true, withFreshProduct: true, dropLabelInRows: true })
    try {
      const r = verify(dir)
      assert.equal(r.status, 1, 'avslutskod 1')
      assert.match(r.stdout, /"Färsk basilika" ska ha inköpsenhet .*kruka.* men raden har \(ingen\)/)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
