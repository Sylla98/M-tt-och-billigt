// Regressionstester för inköpslistans sammanslagning av ingredienser med olika
// enheter (buildShoppingItems i src/utils/selectRecipes.js).
//
// Fel som testerna skyddar mot: ingredienser med samma namn men olika enheter
// (t.ex. Salt i tsk och krm, Oregano i tsk och msk, Färsk basilika i st och
// Torkad basilika i tsk) slogs ihop till en rad där den ena mängden tappades
// bort, eller där g och ml summerades som om de vore samma sak.
//
// Regler som testas: bara EXAKTA omräkningar får summeras (g/kg, ml/cl/dl/l och
// skedmått krm/tsk/msk, där 1 krm = 1 ml, 1 tsk = 5 ml, 1 msk = 15 ml). Mellan
// familjer (skedmått ↔ vikt, antal ↔ skedmått, vikt ↔ volym) finns ingen säker
// omräkning, så mängderna bevaras på separata rader. Inga densiteter eller
// styckevikter hittas på.
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
const { normalizeIngredientName: norm } = await import('../../src/utils/referencePricing.js')
const { buildShoppingItems, rebuildPlanData, calculateSwapCostDelta, buildSwapOccurrenceSpecs } = sel

// ── Egen, oberoende mängdräkning för testerna ───────────────────────────────
const FACTOR = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000, krm: 1, tsk: 5, msk: 15, st: 1 }
const familyOf = (u) => (['g', 'kg'].includes(u) ? 'vikt' : ['ml', 'cl', 'dl', 'l'].includes(u) ? 'volym' : ['krm', 'tsk', 'msk'].includes(u) ? 'sked' : 'antal')
const amount = (q, u) => q * FACTOR[u]
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.001, `${msg}: ${a} ≠ ${b}`)

/** Förväntade summor per (normaliserat namn, familj) ur recept i planens format. */
function expectedSums(recipes, pantryTerms = []) {
  const m = new Map()
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const n = norm(ing.name)
      if (pantryTerms.some((t) => n.includes(t) || t.includes(n))) continue
      const key = `${n}|${familyOf(ing.unit)}`
      m.set(key, (m.get(key) || 0) + amount(ing.quantity, ing.unit))
    }
  }
  return m
}

/** Kontrollerar att inköpsraderna bevarar ALLA mängder: inga tappade, inga extra, inga felsummerade. */
function assertQuantitiesPreserved(items, recipes, pantryTerms = [], label = '') {
  const want = expectedSums(recipes, pantryTerms)
  const got = new Map()
  for (const it of items) {
    const unit = it.unit ?? it.requiredUnit // råa rader (buildShoppingItems) eller prissatta rader (planen)
    const key = `${norm(it.displayName)}|${familyOf(unit)}`
    assert.ok(!got.has(key), `${label}: två rader för ${key}`)
    got.set(key, amount(it.quantity ?? it.requiredQuantity, unit))
  }
  assert.deepEqual([...got.keys()].sort(), [...want.keys()].sort(), `${label}: raduppsättningen avviker (tappad eller extra rad)`)
  for (const [key, v] of want) near(got.get(key), v, `${label}: ${key}`)
  assert.equal(new Set(items.map((i) => i.displayName)).size, items.length, `${label}: dubbla visningsnamn (används som nyckel i listan)`)
}

const rec = (...ingredients) => ({ ingredients: ingredients.map(([name, quantity, unit, category = 'pantry']) => ({ name, quantity, unit, category })) })
const rowOf = (items, name) => items.filter((i) => i.displayName === name)

describe('exakta omräkningar summeras', () => {
  test('vikt: g och kg → gram. volym: ml, dl och l → ml', () => {
    const items = buildShoppingItems([rec(['Mjöl', 500, 'g', 'pasta'], ['Mjölk', 2, 'dl', 'dairy']), rec(['Mjöl', 1, 'kg', 'pasta'], ['Mjölk', 500, 'ml', 'dairy'])])
    assert.deepEqual(rowOf(items, 'Mjöl').map((r) => [r.quantity, r.unit]), [[1500, 'g']])
    assert.deepEqual(rowOf(items, 'Mjölk').map((r) => [r.quantity, r.unit]), [[700, 'ml']])
  })

  test('skedmått: alla sex ingredienser från felrapporten bevarar båda mängderna exakt', () => {
    // [namn, första receptet, andra receptet, förväntad rad]
    const cases = [
      ['Salt', [1.5, 'krm'], [9, 'tsk'], [46.5, 'krm']],        // 1,5 krm + 9 tsk = 46,5 ml
      ['Kanel', [1, 'tsk'], [1.5, 'krm'], [1.3, 'tsk']],        // 1 tsk + 1,5 krm = 6,5 ml = 1,3 tsk
      ['Oregano', [1, 'tsk'], [1.5, 'msk'], [5.5, 'tsk']],      // 1 tsk + 1,5 msk = 27,5 ml = 5,5 tsk
      ['Paprikapulver', [1.5, 'tsk'], [5, 'msk'], [16.5, 'tsk']],
      ['Dijonsenap', [1.5, 'msk'], [1.5, 'tsk'], [2, 'msk']],   // 22,5 ml + 7,5 ml = 30 ml = 2 msk
    ]
    for (const [name, [q1, u1], [q2, u2], [wantQ, wantU]] of cases) {
      const items = buildShoppingItems([rec([name, q1, u1]), rec([name, q2, u2])])
      assert.equal(items.length, 1, `${name}: en rad`)
      assert.equal(items[0].unit, wantU, `${name}: radens enhet`)
      near(items[0].quantity, wantQ, name)
      assert.ok(!('exactMl' in items[0]), 'interna hjälpfält ska inte följa med')
    }
  })

  test('ordningen spelar ingen roll för den totala mängden', () => {
    const a = buildShoppingItems([rec(['Salt', 1.5, 'krm']), rec(['Salt', 9, 'tsk'])])[0]
    const b = buildShoppingItems([rec(['Salt', 9, 'tsk']), rec(['Salt', 1.5, 'krm'])])[0]
    near(amount(a.quantity, a.unit), 46.5, 'krm först')
    near(amount(b.quantity, b.unit), 46.5, 'tsk först')
    assert.equal(b.unit, 'tsk')
    near(b.quantity, 9.3, 'tsk först, i tsk')
  })

  test('avrundningsfel växer inte med antalet sammanslagningar (3 msk + 1 tsk + 1 tsk = 55 ml)', () => {
    const [row] = buildShoppingItems([rec(['Oregano', 3, 'msk']), rec(['Oregano', 1, 'tsk']), rec(['Oregano', 1, 'tsk'])])
    assert.equal(row.unit, 'msk')
    near(row.quantity * 15, 55, 'exakt summa')
  })
})

describe('mängder utan säker omräkning bevaras på separata rader', () => {
  test('Färsk basilika (st) och Torkad basilika (tsk): båda bevaras, ingen summeras eller tappas', () => {
    const items = buildShoppingItems([rec(['Torkad basilika', 1, 'tsk'], ['Färsk basilika', 1.8, 'st', 'vegetables'])])
    assert.deepEqual(items.map((i) => [i.displayName, i.quantity, i.unit]).sort(), [['Färsk basilika', 1.8, 'st'], ['Torkad basilika', 1, 'tsk']])
  })

  test('skedmått och vikt: Smör 100 g + 2 msk → två rader, inget summeras och ingen densitet används', () => {
    const items = buildShoppingItems([rec(['Smör', 100, 'g', 'dairy']), rec(['Smör', 2, 'msk', 'dairy'])])
    assert.deepEqual(items.map((i) => [i.quantity, i.unit]).sort(), [[100, 'g'], [2, 'msk']])
  })

  test('vikt och volym: 300 g och 2 dl → 300 g och 200 ml (ingen g+ml-summa)', () => {
    const items = buildShoppingItems([rec(['Grädde', 300, 'g', 'dairy']), rec(['Grädde', 2, 'dl', 'dairy'])])
    assert.deepEqual(items.map((i) => [i.quantity, i.unit]).sort(), [[200, 'ml'], [300, 'g']])
  })

  test('identiskt namn i två familjer får olika visningsnamn (listan använder namnet som nyckel)', () => {
    const items = buildShoppingItems([rec(['Basilika', 2, 'st', 'vegetables']), rec(['Basilika', 3, 'tsk'])])
    assert.equal(items.length, 2)
    assert.notEqual(items[0].displayName, items[1].displayName)
    assert.ok(items.every((i) => norm(i.displayName) === 'basilika'), 'prismatchning på samma normaliserade namn')
  })

  test('egenskapstest: slumpade kombinationer av enheter bevarar varje mängd (300 fall)', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    const pick = (a) => a[Math.floor(rnd() * a.length)]
    const names = ['Smör', 'Salt', 'Basilika', 'Mjölk', 'Äpple']
    const units = ['g', 'kg', 'ml', 'cl', 'dl', 'l', 'krm', 'tsk', 'msk', 'st']
    for (let i = 0; i < 300; i++) {
      const recipes = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () =>
        rec(...Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => [pick(names), (1 + Math.floor(rnd() * 20)) / 2, pick(units), 'pantry'])))
      assertQuantitiesPreserved(buildShoppingItems(recipes), recipes, [], `fall ${i}`)
    }
  })
})

describe('skafferi ("Har hemma") påverkar blandade enheter rätt', () => {
  const recipes = [
    rec(['Salt', 1.5, 'krm'], ['Torkad basilika', 1, 'tsk'], ['Kanel', 1, 'tsk']),
    rec(['Salt', 9, 'tsk'], ['Färsk basilika', 1.8, 'st', 'vegetables'], ['Kanel', 1.5, 'krm']),
  ]
  test('skafferiträff utesluter ALLA rader för varan, oavsett enhet', () => {
    const items = buildShoppingItems(recipes, 'salt')
    assert.deepEqual(items.map((i) => i.displayName).sort(), ['Färsk basilika', 'Kanel', 'Torkad basilika'])
    assertQuantitiesPreserved(items, recipes, ['salt'], 'salt hemma')
  })
  test('basilika hemma utesluter både färsk och torkad, men inget annat', () => {
    const items = buildShoppingItems(recipes, 'basilika')
    assert.deepEqual(items.map((i) => i.displayName).sort(), ['Kanel', 'Salt'])
    assertQuantitiesPreserved(items, recipes, ['basilika'], 'basilika hemma')
  })
  test('skafferi som inte berör varorna ändrar ingenting; mängderna är samma som utan skafferi', () => {
    assert.deepEqual(buildShoppingItems(recipes, 'mjöl'), buildShoppingItems(recipes, ''))
  })
})

describe('hela receptbiblioteket och en riktig plan (rebuildPlanData)', () => {
  // De sex ingredienserna från felrapporten kräver dessa recept tillsammans.
  const IDS = ['en-riktigt-god-kottfarssas', 'pannkakor-klassiska', 'marockansk-kycklinggryta-citron-oliver', 'kycklingshawarma-bulgur-yoghurtsas', 'grekisk-citronkyckling-ugn-potatis', 'ungersk-gulasch', 'kycklingstroganoff-ris', 'kycklingsallad-spenat-apple-parmesan']
  const specs = IDS.map((baseId) => ({ baseId, servings: 7 }))

  test('planen exercerar verkligen blandade enheter för alla sex ingredienser (annars är testet tomt)', () => {
    const plan = rebuildPlanData(specs, '', 4000)
    for (const n of ['salt', 'kanel', 'oregano', 'paprikapulver', 'dijonsenap', 'basilika']) {
      const units = new Set(plan.recipes.flatMap((r) => r.ingredients).filter((i) => norm(i.name) === n).map((i) => i.unit))
      assert.ok(units.size > 1, `${n} har bara enheten ${[...units]} i planen, så testet skyddar inget längre. Välj recept som blandar enheter`)
    }
  })

  for (const pantry of ['', 'salt, kanel', 'basilika', 'olja, ris, lök']) {
    test(`inköpslistan bevarar alla mängder, skafferi "${pantry}"`, () => {
      const plan = rebuildPlanData(specs, pantry, 4000)
      const items = Object.values(plan.shoppingList).flatMap((c) => c.items)
      assertQuantitiesPreserved(items, plan.recipes, sel.parsePantryTerms(pantry), `plan, skafferi "${pantry}"`)
      const sum = items.reduce((s, i) => s + i.lineCost, 0)
      assert.equal(Math.round(sum), plan.pricing.estimatedTotalCost, 'totalsumman = summan av raderna')
    })
  }

  test('alla 60 recept i en och samma plan: inga mängder tappas', () => {
    const plan = rebuildPlanData(RECIPES.map((r) => ({ baseId: r.id, servings: 7 })), '', 100000)
    assertQuantitiesPreserved(Object.values(plan.shoppingList).flatMap((c) => c.items), plan.recipes, [], 'hela biblioteket')
  })

  test('bevarad mängd prissätts: Färsk basilika (st) får en egen rad med kostnad, i stället för att försvinna', () => {
    const plan = rebuildPlanData(specs, '', 4000)
    const items = Object.values(plan.shoppingList).flatMap((c) => c.items)
    const fresh = items.find((i) => i.displayName === 'Färsk basilika')
    assert.ok(fresh, 'rad för Färsk basilika finns')
    assert.equal(fresh.requiredUnit, 'st')
    assert.equal(fresh.packagesRequired, Math.ceil(fresh.requiredQuantity), 'hela förpackningar uppåt')
    assert.ok(fresh.lineCost > 0)
    assert.ok(items.some((i) => i.displayName === 'Torkad basilika'), 'torkad basilika kvar som egen rad')
  })

  test('Byt rätt: kostnadsskillnaden är exakt skillnaden mellan oberoende radsummor, med och utan skafferi', () => {
    const rowSum = (plan) => Math.round(Object.values(plan.shoppingList).flatMap((c) => c.items).reduce((s, i) => s + i.lineCost, 0))
    for (const pantry of ['', 'salt, basilika']) {
      const plan = rebuildPlanData(specs, pantry, 4000)
      assert.equal(rowSum(plan), plan.pricing.estimatedTotalCost)
      for (const next of ['kottbullar-potatis-graddsas', 'kikartscurry']) {
        const delta = calculateSwapCostDelta({ occurrences: plan.recipes, replacedBaseId: 'en-riktigt-god-kottfarssas', newRecipeId: next, pantryText: pantry, budget: 4000, currentTotalCost: plan.pricing.estimatedTotalCost })
        const swapped = rebuildPlanData(buildSwapOccurrenceSpecs(plan.recipes, 'en-riktigt-god-kottfarssas', next), pantry, 4000)
        assert.equal(delta, rowSum(swapped) - rowSum(plan), `skafferi "${pantry}", byte mot ${next}`)
        assertQuantitiesPreserved(Object.values(swapped.shoppingList).flatMap((c) => c.items), swapped.recipes, sel.parsePantryTerms(pantry), `efter byte mot ${next}`)
      }
    }
  })
})

// ── Verifieringsskriptet ska upptäcka den gamla felaktiga sammanslagningen ──
// Den gamla (felaktiga) implementationen återskapas i en tillfällig KOPIA av koden,
// och scripts/verify-recipe-plan.mjs körs mot den. Originalfilerna rörs inte.
const OLD_BUILD_SHOPPING_ITEMS = `export function buildShoppingItems(scaledRecipes, pantryText) {
  const pantryTerms = parsePantryTerms(pantryText)
  const merged = new Map()
  for (const recipe of scaledRecipes) {
    for (const ing of recipe.ingredients) {
      const normName = normalizeIngredientName(ing.name)
      const inPantry = pantryTerms.some((t) => normName.includes(t) || t.includes(normName))
      if (inPantry) continue
      const u = (ing.unit || '').toLowerCase()
      const base = u in WEIGHT_TO_GRAMS ? { value: ing.quantity * WEIGHT_TO_GRAMS[u], unit: 'g' }
        : u in VOLUME_TO_ML ? { value: ing.quantity * VOLUME_TO_ML[u], unit: 'ml' } : { value: ing.quantity, unit: u || 'st' }
      const key = normName
      if (merged.has(key)) {
        const row = merged.get(key)
        if (row.unit === base.unit) row.quantity += base.value
        else if (base.unit === 'g' || base.unit === 'ml') { row.quantity = base.value + row.quantity; row.unit = base.unit }
      } else {
        merged.set(key, { displayName: ing.name, searchTerm: normName, quantity: base.value, unit: base.unit, category: ing.category || 'pantry' })
      }
    }
  }
  return [...merged.values()]
}
`

describe('verifieringsskriptet (npm run verify:recipe)', () => {
  const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

  function runScriptIn(dir, recipeId) {
    return spawnSync(process.execPath, ['--import', './tests/swap/register-alias.mjs', 'scripts/verify-recipe-plan.mjs', recipeId], { cwd: dir, encoding: 'utf8', timeout: 120000 })
  }
  function makeCopy({ breakIt }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-copy-'))
    fs.cpSync(path.join(repo, 'src'), path.join(dir, 'src'), { recursive: true })
    fs.cpSync(path.join(repo, 'scripts'), path.join(dir, 'scripts'), { recursive: true })
    fs.mkdirSync(path.join(dir, 'tests', 'swap'), { recursive: true })
    for (const f of ['alias-hooks.mjs', 'register-alias.mjs']) fs.copyFileSync(path.join(repo, 'tests', 'swap', f), path.join(dir, 'tests', 'swap', f))
    fs.symlinkSync(path.join(repo, 'public'), path.join(dir, 'public'))
    if (breakIt) {
      const file = path.join(dir, 'src', 'utils', 'selectRecipes.js')
      const code = fs.readFileSync(file, 'utf8')
      const start = code.indexOf('export function buildShoppingItems')
      const end = code.indexOf('export function parsePantryTerms')
      assert.ok(start > 0 && end > start, 'kunde inte hitta buildShoppingItems i kopian')
      fs.writeFileSync(file, code.slice(0, start) + OLD_BUILD_SHOPPING_ITEMS + '\n' + code.slice(end))
    }
    return dir
  }

  test('rättad kod: inga fel (kontroll att testet inte felar av annat skäl)', () => {
    const dir = makeCopy({ breakIt: false })
    try {
      const r = runScriptIn(dir, 'en-riktigt-god-kottfarssas')
      assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-500))
      assert.match(r.stdout, /Inga fel\./)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })

  test('gammal felaktig sammanslagning: skriptet ger avslutskod 1 och pekar ut tappad mängd och saknad rad', () => {
    const dir = makeCopy({ breakIt: true })
    try {
      const r = runScriptIn(dir, 'en-riktigt-god-kottfarssas')
      assert.equal(r.status, 1, 'avslutskod 1 vid tappad mängd')
      assert.match(r.stdout, /mängd tappad eller felräknad/)
      assert.match(r.stdout, /"Färsk basilika" .* saknar inköpsrad/)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
