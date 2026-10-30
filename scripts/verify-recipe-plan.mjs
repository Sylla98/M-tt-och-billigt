#!/usr/bin/env node
// scripts/verify-recipe-plan.mjs
// Verifierar ETT recept i det lokala receptbiblioteket (se RECEPTFLÖDE.md, 2.5).
// Kräver ingen API-nyckel och ändrar inga filer.
//
// Kör: npm run verify:recipe -- <recept-id> [vuxna] [barn] [period] [budget] [rätter] [kostval]
//   period:  "1 vecka" | "2 veckor" | "1 månad"      (standard: "1 månad")
//   budget:  kr                                       (standard: 100000, så att budgetbytet inte
//            väljer bort receptet; ange en egen budget för att testa ett realistiskt hushåll)
//   rätter:  5 | 7 | 10 | 14                          (standard: 14)
//   kostval: kommaseparerat, t.ex. vegetariskt,familjevanligt (standard: inga)
// Exempel: npm run verify:recipe -- en-riktigt-god-kottfarssas 2 1 "1 månad" 4000 14
//
// Vad skriptet gör
//  1. Genererar planer med den RIKTIGA /api/meal-plan-handlern tills receptet ingår.
//  2. Räknar OBEROENDE om mängder och inköp: summerar varje ingrediens över alla
//     tillagningstillfällen i planen, räknar ut förpackningar och kronor direkt ur
//     prislistan (REFERENCE_PRICES) och jämför rad för rad med appens inköpslista
//     och totalsumma. Samma sak görs för planen utan receptet.
//  3. Redovisar prisunderlag per ingrediens: referenspris, "prissätts som annan
//     produkt" och SAKNAT PRISUNDERLAG (appen använder då ett generiskt kategoripris
//     som inte är ett verifierat pris).
//  4. Kör appens Byt rätt-beräkning åt båda håll. Den delar kod med själva bytet och
//     visar därför bara att förhandsvisning och byte är konsekventa. Rätt kostnad
//     styrs av steg 2: skillnaden jämförs även mot de oberoende totalsummorna.
//
// Delas medvetet med appen: prislistan (REFERENCE_PRICES, GENERIC_CATEGORY_PRICES) och
// produktmatchningen (findReferenceProduct, normalizeIngredientName). Skriptet visar vilken
// produkt varje ingrediens matchar, men att priserna i sig är rimliga kräver underlag och
// kontrolleras inte. Skafferifunktionen ("Har hemma") testas inte.
//
// Avslutskod 1 vid FEL (okänt id, bildfil saknas/fel bildväg, mängd eller kostnad
// avviker från den oberoende uträkningen, en ingrediens saknar inköpsrad, Byt rätt-
// skillnaden stämmer inte).
// PRISUNDERLAG och ATT BEDÖMA ger avslutskod 0 men ska redovisas.
// '@/'-aliaset laddas via --import (se package.json: verify:recipe).

import fs from 'node:fs'

const root = process.cwd()
const { POST } = await import(`${root}/src/app/api/meal-plan/route.js`)
const sel = await import(`${root}/src/utils/selectRecipes.js`)
const { RECIPES } = await import(`${root}/src/data/recipes.js`)
const { REFERENCE_PRICES, GENERIC_CATEGORY_PRICES } = await import(`${root}/src/data/referencePrices.js`)
const { findReferenceProduct, normalizeIngredientName } = await import(`${root}/src/utils/referencePricing.js`)
const { getIngredientRule } = await import(`${root}/src/utils/ingredientRules.js`)
const { scaleIngredient } = await import(`${root}/src/utils/portionScaling.js`)
const { formatPlanCostDelta } = await import(`${root}/src/utils/formatPlanCostDelta.js`)

const [id, adults = 2, children = 1, duration = '1 månad', budget = 100000, dishes = 14, foodTypesArg = ''] = process.argv.slice(2)
if (!id) {
  console.error('Användning: npm run verify:recipe -- <recept-id> [vuxna] [barn] [period] [budget] [rätter] [kostval]')
  process.exit(2)
}

const errors = []
const notes = []
const recipe = RECIPES.find((r) => r.id === id)
if (!recipe) {
  console.error(`Okänt recept-id: ${id}`)
  process.exit(1)
}
const input = {
  adults: +adults,
  children: +children,
  duration,
  budget: +budget,
  foodTypes: foodTypesArg ? foodTypesArg.split(',') : [],
  pantry: '',
  numberOfDishes: +dishes,
}

// ── Hjälpfunktioner (egen uträkning, inte appens prismotor) ─────────────────
const G = { g: 1, kg: 1000 }
const ML = { ml: 1, cl: 10, dl: 100, l: 1000 }
const SPOON = ['msk', 'tsk', 'krm']
// Svenska måttsatsen: skedmått är exakta VOLYMmått (1 krm = 1 ml, 1 tsk = 5 ml, 1 msk = 15 ml).
// De kan jämföras med varandra men aldrig räknas om till gram eller antal (ingen densitet).
const SPOON_ML = { krm: 1, tsk: 5, msk: 15 }
const famOf = (u) => (u in G ? 'vikt' : u in ML ? 'volym' : u in SPOON_ML ? 'sked' : u === 'st' || !u ? 'antal' : `annat:${u}`)
/** Mängd i familjens gemensamma enhet (g, ml, skedmått som ml-ekvivalent, st). */
const amt = (q, u) => q * (u in G ? G[u] : u in ML ? ML[u] : u in SPOON_ML ? SPOON_ML[u] : 1)
const baseOf = (q, u) => (u in G ? { fam: 'vikt', unit: 'g', v: q * G[u] } : u in ML ? { fam: 'volym', unit: 'ml', v: q * ML[u] } : SPOON.includes(u) ? { fam: 'sked', unit: u, v: q } : { fam: 'antal', unit: u || 'st', v: q })
const GENERIC_KEY = { meat: 'protein', dairy: 'mejeri', vegetables: 'gronsak', canned: 'konserv', pasta: 'torrvara', pantry: 'krydda' }
const r1 = (n) => Math.round(n * 10) / 10
const norm = normalizeIngredientName

/** Oberoende uträkning av en inköpsrad: förpackningar, kronor och en läsbar formel. */
function expectedBuy(name, categoryKey, req) {
  const product = findReferenceProduct(name)
  if (!product) {
    const price = GENERIC_CATEGORY_PRICES[GENERIC_KEY[categoryKey] || 'ovrigt'].estimatedPrice
    return { cost: price, text: `generiskt kategoripris (${GENERIC_CATEGORY_PRICES[GENERIC_KEY[categoryKey] || 'ovrigt'].label}) ${price} kr`, generic: true, product: null }
  }
  if (product.purchaseType === 'weight') {
    const kg = req.fam === 'vikt' ? req.v / 1000 : req.fam === 'antal' ? (req.v * 150) / 1000 : 0.5
    const how = req.fam === 'vikt' ? `${req.v} g` : req.fam === 'antal' ? `${req.v} st × 150 g (schablon)` : 'skedmått → 0,5 kg (minsta köp)'
    return { cost: kg * product.estimatedPricePerUnit, text: `${how} = ${r1(kg)} kg × ${product.estimatedPricePerUnit} kr/kg`, product, kg: r1(kg) }
  }
  const pk = baseOf(product.packageQuantity, product.packageUnit)
  const pkgText = `${product.packageQuantity} ${product.packageUnit}`
  if (req.fam === 'sked') return { cost: product.estimatedPackagePrice, text: `skedmått → 1 förp (${pkgText}) × ${product.estimatedPackagePrice} kr`, product, packages: 1 }
  if (req.fam === pk.fam) {
    const packages = Math.max(1, Math.ceil(req.v / pk.v))
    return { cost: packages * product.estimatedPackagePrice, text: `${req.v} ${req.unit} ÷ ${pkgText}/förp → ${packages} förp × ${product.estimatedPackagePrice} kr`, product, packages }
  }
  return { cost: product.estimatedPackagePrice, text: `enhetsfamiljerna matchar inte (${req.unit} mot ${product.packageUnit}) → 1 förp (${pkgText}) × ${product.estimatedPackagePrice} kr`, product, packages: 1 }
}

/**
 * Räknar om en hel plan (recept som byggts av appen) utan appens prismotor:
 * mängd per rad = summa över alla tillfällen, kostnad direkt ur prislistan.
 * Returnerar { total, rows } och fyller `errors`/`notes`.
 */
function independentCheck(label, planLike) {
  // Summera varje ingrediens över alla tillfällen, per (normaliserat namn, enhetsfamilj).
  const occ = new Map() // `${namn}|${familj}` → { names, v, byUnit }
  for (const r of planLike.recipes) {
    for (const ing of r.ingredients) {
      const key = `${norm(ing.name)}|${famOf(ing.unit)}`
      const e = occ.get(key) || { names: new Set(), v: 0, byUnit: {} }
      e.names.add(ing.name)
      e.v += amt(ing.quantity, ing.unit)
      e.byUnit[ing.unit] = (e.byUnit[ing.unit] || 0) + ing.quantity
      occ.set(key, e)
    }
  }
  let total = 0
  const rows = []
  const rowsPerName = new Map()
  for (const [categoryKey, cat] of Object.entries(planLike.shoppingList)) {
    for (const it of cat.items) {
      const fam = famOf(it.requiredUnit)
      const key = `${norm(it.displayName)}|${fam}`
      const e = occ.get(key)
      const reqAmt = amt(it.requiredQuantity, it.requiredUnit)
      rowsPerName.set(norm(it.displayName), [...(rowsPerName.get(norm(it.displayName)) || []), it.displayName])
      if (!e) {
        errors.push(`${label}: raden "${it.displayName}" (${it.requiredQuantity} ${it.requiredUnit}) hör inte till något recept i planen`)
      } else if (Math.abs(e.v - reqAmt) > 0.01) {
        const parts = Object.entries(e.byUnit).map(([u, q]) => `${r1(q)} ${u}`).join(' + ')
        errors.push(`${label}: "${it.displayName}" ska enligt recepten vara ${parts} men inköpslistan säger ${it.requiredQuantity} ${it.requiredUnit} (mängd tappad eller felräknad)`)
      }
      if (e && e.names.size > 1) notes.push(`${label}: ${[...e.names].join(' + ')} slås ihop till en rad "${it.displayName}" (samma normaliserade namn)`)
      const exp = expectedBuy(it.displayName, categoryKey, baseOf(it.requiredQuantity, it.requiredUnit))
      if (Math.abs(exp.cost - it.lineCost) > 0.01) errors.push(`${label}: "${it.displayName}" kostar ${it.lineCost} kr i appen men ${exp.cost} kr enligt oberoende uträkning (${exp.text})`)
      if (exp.packages != null && it.packagesRequired !== exp.packages) errors.push(`${label}: "${it.displayName}" antal förpackningar ${it.packagesRequired} i appen mot ${exp.packages} i uträkningen`)
      if (!!exp.generic !== !!it.isGenericEstimate) errors.push(`${label}: "${it.displayName}" generiskt pris-flagga avviker (appen ${!!it.isGenericEstimate}, uträkning ${!!exp.generic})`)
      total += exp.cost
      rows.push({ it, exp, req: baseOf(it.requiredQuantity, it.requiredUnit), key })
    }
  }
  // Täckning: skafferi är alltid tomt här, så VARJE (namn, enhetsfamilj) i planens recept ska ha en inköpsrad.
  const rowKeys = new Set(rows.map((x) => x.key))
  for (const [key, e] of occ) {
    if (!rowKeys.has(key)) errors.push(`${label}: ingrediensen "${[...e.names].join(' / ')}" (${Object.entries(e.byUnit).map(([u, q]) => `${r1(q)} ${u}`).join(' + ')}) finns i planens recept men saknar inköpsrad (kostnaden saknas i totalsumman)`)
  }
  // Samma vara på flera rader (olika enhetsfamiljer utan säker omräkning): mängderna bevaras, men
  // priset kan räknas som flera inköp av samma produkt.
  for (const [name, list] of rowsPerName) {
    if (list.length > 1) notes.push(`${label}: "${name}" ligger på ${list.length} rader (${list.join(' | ')}) eftersom enheterna inte kan räknas om till varandra utan påhittad densitet. Kontrollera om det är samma produkt (kostnaden kan då räknas som flera inköp)`)
  }
  const totalRounded = Math.round(total)
  if (totalRounded !== planLike.pricing.estimatedTotalCost) errors.push(`${label}: totalsumman är ${planLike.pricing.estimatedTotalCost} kr i appen men ${totalRounded} kr enligt oberoende uträkning`)
  return { total: totalRounded, rows }
}

// ── 1. Recept och bildfil ───────────────────────────────────────────────────
console.log(`RECEPT: ${recipe.id} – ${recipe.name} (baseServings ${recipe.baseServings}, ${recipe.ingredients.length} ingredienser, ${recipe.instructions.length} steg)`)
if (recipe.image !== `/recipe-images/${recipe.id}.jpg`) errors.push(`image är "${recipe.image}", konventionen är "/recipe-images/${recipe.id}.jpg"`)
const imagePath = `${root}/public${recipe.image}`
if (!fs.existsSync(imagePath)) {
  errors.push(`bildfilen saknas: public${recipe.image} (appen visar då bara en textplatshållare)`)
} else {
  const kb = Math.round(fs.statSync(imagePath).size / 1000)
  console.log(`BILD: public${recipe.image} finns (${kb} KB). Mått, skärpa och beskärning kontrolleras i webbläsare.`)
  if (kb > 500) notes.push(`bilden är ${kb} KB (riktvärde ca 500 KB)`)
}

// ── 2. Genererad plan med receptet ──────────────────────────────────────────
let plan
for (let n = 1; n <= 200 && !plan; n++) {
  const res = await POST(new Request('http://localhost/api/meal-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${n >> 8}.${n & 255}` },
    body: JSON.stringify(input),
  }))
  const body = await res.json()
  if (!res.ok) {
    console.error(`\nPlanen kunde inte skapas (${res.status}): ${body.error}`)
    process.exit(1)
  }
  if (body.recipes.some((r) => sel.getBaseRecipeId(r.id) === id)) plan = body
}
if (!plan) {
  console.error('\nReceptet valdes inte av 200 genererade planer. Möjliga skäl: för låg budget (appen byter då ut dyra recept mot billigare), kostval som utesluter receptet eller för få rätter. Prova högre budget, andra kostval (7:e argumentet) eller fler rätter.')
  process.exit(1)
}
const slots = [...new Set(plan.recipes.map((r) => sel.getBaseRecipeId(r.id)))]
console.log(`\nHUSHÅLL/PERIOD/BUDGET: ${JSON.stringify(input)}`)
console.log('PLAN (recept ×tillfällen (portioner)):', slots.map((b) => {
  const o = plan.recipes.filter((r) => sel.getBaseRecipeId(r.id) === b)
  return `${b} ×${o.length} (${o.map((r) => r.servings).join('/')})`
}).join(', '))
console.log(`TOTALSUMMA: ${plan.pricing.estimatedTotalCost} kr (budget ${plan.pricing.budget}, ${plan.pricing.isWithinBudget ? 'inom' : 'över'} budget), ${plan.totalServings} portioner`)

// ── 3. Oberoende uträkning av hela planen ───────────────────────────────────
const check = independentCheck('plan', plan)
console.log(`OBEROENDE TOTALSUMMA (mängder summerade över alla tillfällen, kronor ur prislistan): ${check.total} kr ${check.total === plan.pricing.estimatedTotalCost ? '✔ = appens totalsumma' : '✘ ≠ appens totalsumma'}`)

// ── 4. Receptets ingredienser: mängd, skalning, inköp, prisunderlag ─────────
const myOcc = plan.recipes.filter((r) => sel.getBaseRecipeId(r.id) === id)
const ownBase = recipe.ingredients.map((i) => i.name)
console.log(`\nINGREDIENSER – receptet lagas ${myOcc.length} gång(er) i planen (${myOcc.map((r) => r.servings).join(' + ')} portioner):`)
const noPrice = []
const sharedProduct = []
for (const ing of recipe.ingredients) {
  const perOcc = myOcc.map((o) => o.ingredients.find((x) => x.name === ing.name))
  const qtys = perOcc.map((x) => x.quantity)
  // Skalningskontroll: linjärt skalade varor ska följa mängd × portioner ÷ baseServings inom avrundningen.
  const rule = getIngredientRule(ing.name, ing.unit)
  myOcc.forEach((o, k) => {
    // Egen härledning av skalningen (konstanterna 6 portioner och halv takt dupliceras medvetet;
    // ändras de i ingredientRules.js ska de ändras här också).
    const linear = o.servings / recipe.baseServings
    const factor = rule.isDampened ? (o.servings <= 6 ? linear : 6 / recipe.baseServings + ((o.servings - 6) / recipe.baseServings) * 0.5) : linear
    const exact = ing.quantity * factor
    if (rule.isCountable) {
      const gran = rule.countRule?.granularity ?? 1
      const want = Math.max(gran, Math.round(exact / gran) * gran)
      if (Math.abs(qtys[k] - want) > 1e-9) errors.push(`${ing.name}: ${qtys[k]} st för ${o.servings} portioner, förväntat ${want} st (räknebar, steg ${gran})`)
    } else {
      const step = SPOON.includes(ing.unit) ? 0.5 : exact >= 100 ? 10 : 0.1
      if (Math.abs(qtys[k] - exact) > step / 2 + 1e-9) errors.push(`${ing.name}: ${qtys[k]} ${ing.unit} för ${o.servings} portioner, förväntat ca ${r1(exact)} (${rule.isDampened ? 'dämpad' : 'linjär'} skalning)`)
    }
  })
  const own = qtys.reduce((a, b) => a + b, 0)
  const row = check.rows.find((x) => x.key === `${norm(ing.name)}|${famOf(ing.unit)}`)
  if (!row) {
    notes.push(`${ing.name}: finns inte som inköpsrad (borttagen eller sammanslagen)`)
    continue
  }
  const decimals = ing.unit === 'st' && !rule.isCountable && qtys.some((q) => !Number.isInteger(q))
  if (decimals) notes.push(`${ing.name}: styckevara som inte är räknebar skalas med decimaler (${qtys.join(' + ')} st) – använd g eller bedöm`)
  const dl = [4, 7, 11].map((p) => scaleIngredient(ing, recipe.baseServings, p).quantity).join(' / ')
  const share = !SPOON.includes(ing.unit) && Math.abs(amt(row.it.requiredQuantity, row.it.requiredUnit) - amt(own, ing.unit)) > 0.01 ? ` (receptets andel ${r1(own)} ${ing.unit}; resten från andra recept)` : ''
  console.log(`  ${ing.name} [${ing.unit}/${ing.category}] vid 4/7/11 portioner: ${dl} ${ing.unit}${decimals ? '  ⚠ decimaler' : ''}`)
  console.log(`     i planen: ${qtys.join(' + ')} ${ing.unit}; hela planen behöver ${row.it.requiredQuantity} ${row.it.requiredUnit}${share}`)
  console.log(`     inköp: ${row.exp.text} = ${Math.round(row.exp.cost)} kr ${Math.abs(row.exp.cost - row.it.lineCost) < 0.01 ? '✔ = appens rad' : '✘ appens rad: ' + row.it.lineCost + ' kr'}`)
  if (!row.exp.product) noPrice.push({ name: ing.name, kr: row.exp.cost, text: row.exp.text })
  else if (norm(row.exp.product.displayName) !== norm(ing.name)) sharedProduct.push(`${ing.name} → ${row.exp.product.displayName} (${row.exp.product.purchaseType === 'weight' ? `${row.exp.product.estimatedPricePerUnit} kr/kg` : `${row.exp.product.packageQuantity} ${row.exp.product.packageUnit}, ${row.exp.product.estimatedPackagePrice} kr`})`)
}
const planGeneric = check.rows.filter((r) => r.exp.generic && !ownBase.some((n) => norm(n) === norm(r.it.displayName))).map((r) => r.it.displayName)

// ── 5. Byt rätt: konsekvens (delad kod) + oberoende kontroll ────────────────
console.log('\nBYT RÄTT – kostnadsskillnad för hela planen:')
const reference = RECIPES.find((r) => r.id === slots.find((s) => s !== id))
const alt = sel.selectSwapAlternatives({
  foodTypes: plan.foodTypes,
  excludeIds: slots,
  pantryTerms: sel.parsePantryTerms(plan.pantry),
  budgetPerServing: plan.pricing.budget / plan.totalServings,
  referenceRecipe: reference,
})[0].recipe
const delta = (occurrences, replaced, next, currentTotal) => sel.calculateSwapCostDelta({
  occurrences, replacedBaseId: replaced, newRecipeId: next, pantryText: plan.pantry,
  budget: plan.pricing.budget, currentTotalCost: currentTotal,
})
const out = delta(plan.recipes, id, alt.id, plan.pricing.estimatedTotalCost)
const without = sel.rebuildPlanData(sel.buildSwapOccurrenceSpecs(plan.recipes, id, alt.id), plan.pantry, plan.pricing.budget)
const back = delta(without.recipes, alt.id, id, without.pricing.estimatedTotalCost)
console.log(`  ut ${id} → in ${alt.id}: ${formatPlanCostDelta(out)}`)
console.log(`  ut ${alt.id} → in ${id}: ${formatPlanCostDelta(back)} (plan utan receptet: ${without.pricing.estimatedTotalCost} kr)`)
const sum = without.pricing.estimatedTotalCost + back
console.log(`  konsekvens (delad kod): ${without.pricing.estimatedTotalCost} ${back < 0 ? '−' : '+'} ${Math.abs(back)} = ${sum} kr ${sum === plan.pricing.estimatedTotalCost ? '✔' : '✘'} – visar bara att förhandsvisning och byte räknar lika`)
if (sum !== plan.pricing.estimatedTotalCost) errors.push(`Byt rätt: ${without.pricing.estimatedTotalCost} + ${back} = ${sum}, planens totalsumma är ${plan.pricing.estimatedTotalCost}`)
const checkWithout = independentCheck(`plan utan receptet (${alt.id} i stället)`, without)
const indepDelta = check.total - checkWithout.total
console.log(`  oberoende kontroll: ${check.total} kr (med) − ${checkWithout.total} kr (utan) = ${indepDelta} kr, appens skillnad vid inbyte av receptet = ${back} kr ${indepDelta === back ? '✔' : '✘'}`)
if (indepDelta !== back) errors.push(`Byt rätt-skillnaden ${back} kr stämmer inte med oberoende uträkning (${indepDelta} kr)`)

// ── Sammanfattning ──────────────────────────────────────────────────────────
console.log('\n── Sammanfattning ──')
console.log(errors.length ? `FEL (${errors.length}):` : 'Inga fel.')
for (const e of errors) console.log(`  ✘ ${e}`)
console.log('\nPRISUNDERLAG')
if (noPrice.length) {
  console.log(`  ⚠⚠ SAKNAT PRISUNDERLAG (${noPrice.length}): ingen referensprodukt i src/data/referencePrices.js. Appen räknar med ett generiskt kategoripris, INTE ett verifierat pris:`)
  for (const n of noPrice) console.log(`     - ${n.name}: ${n.text}`)
} else {
  console.log('  Alla receptets ingredienser har en referensprodukt.')
}
if (sharedProduct.length) {
  console.log(`  Prissätts som annan produkt (antagande som ska redovisas, bedöm om det är rimligt):`)
  for (const s of sharedProduct) console.log(`     - ${s}`)
}
if (planGeneric.length) console.log(`  Övriga rader i planen med generiskt pris (inte receptets): ${planGeneric.join(', ')}`)
console.log(notes.length ? `\nATT BEDÖMA/REDOVISA (${notes.length}):` : '\nInget annat att bedöma.')
for (const n of [...new Set(notes)]) console.log(`  ⚠ ${n}`)
console.log('\nKvar att göra manuellt: webbläsarkontroll (kort, receptvy, Byt rätt-miniatyr på mobil och desktop), validate:recipes, test:swap samt innehållsgranskning av ingredienslista mot steg.')
if (errors.length) process.exitCode = 1
