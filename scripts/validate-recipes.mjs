#!/usr/bin/env node
// scripts/validate-recipes.mjs
// Validerar det lokala receptbiblioteket. Kräver ingen API-nyckel.
// Kör: npm run validate:recipes
//
// Importerar de RIKTIGA regel-/skalningsmodulerna (inte en kopia), eftersom
// varken ingredientRules.js eller portionScaling.js använder '@/'-aliaset –
// de går därför att köra direkt med vanlig Node.

import { RECIPES } from '../src/data/recipes.js'
import { REFERENCE_PRICES } from '../src/data/referencePrices.js'
import { getIngredientRule, shouldShowAsDl } from '../src/utils/ingredientRules.js'
import { scaleIngredient } from '../src/utils/portionScaling.js'

const VALID_CATEGORIES = ['meat', 'dairy', 'vegetables', 'canned', 'pasta', 'pantry']
const VALID_UNITS = ['g', 'kg', 'ml', 'l', 'dl', 'cl', 'st', 'msk', 'tsk', 'krm']

// Ingredienser som MÅSTE anges som antal ('st') enligt uppgift 7 – matchat
// mot ingrediensnamnet (inte via getIngredientRule, för att kunna ge ett
// tydligt eget felmeddelande per grupp).
const MUST_BE_COUNT = [
  { label: 'gul lök/rödlök/schalottenlök', match: (n) => ['gul lök', 'rödlök', 'schalottenlök'].some((m) => n.includes(m)) },
  { label: 'vitlök', match: (n) => n.includes('vitlök') },
  { label: 'ägg', match: (n) => n === 'ägg' },
  { label: 'citron/lime', match: (n) => n.includes('citron') || n.includes('lime') },
  { label: 'paprika/morot', match: (n) => n.includes('paprika') && !n.includes('paprikapulver') || n.includes('morot') || n.includes('morötter') },
  { label: 'buljongtärning', match: (n) => n.includes('buljong') },
]

const errors = []
const warnings = []
const seenIds = new Set()
const seenNames = new Set()
const seenImages = new Set()

// Bibliotek-omfattande karta: normaliserat namn → uppsättning enheter som
// använts, för att upptäcka inkompatibla enheter för samma ingrediens
// innan den ens hamnar i en sammanslagen inköpslista (uppgift 11).
const nameToUnits = new Map()

for (const [i, r] of RECIPES.entries()) {
  const label = r.id || r.name || `recept #${i + 1}`

  // ── Grundläggande fält ──────────────────────────────────────────────────
  if (!r.id) errors.push(`${label}: saknar id`)
  else if (seenIds.has(r.id)) errors.push(`${label}: duplicerat id`)
  else seenIds.add(r.id)

  if (!r.name) errors.push(`${label}: saknar namn`)
  else if (seenNames.has(r.name)) errors.push(`${label}: duplicerat receptnamn "${r.name}"`)
  else seenNames.add(r.name)

  if (!(r.baseServings > 0)) errors.push(`${label}: baseServings måste vara > 0`)

  if (!(r.activeTimeMinutes > 0) || r.activeTimeMinutes > 240)
    errors.push(`${label}: orimlig activeTimeMinutes (${r.activeTimeMinutes})`)
  if (!(r.totalTimeMinutes > 0) || r.totalTimeMinutes > 480)
    errors.push(`${label}: orimlig totalTimeMinutes (${r.totalTimeMinutes})`)
  if (r.activeTimeMinutes > r.totalTimeMinutes)
    errors.push(`${label}: aktiv tid (${r.activeTimeMinutes}) överstiger total tid (${r.totalTimeMinutes})`)

  if (!Array.isArray(r.dietTypes) || r.dietTypes.length === 0)
    errors.push(`${label}: minst en dietTypes krävs`)

  // ── Ingredienser ─────────────────────────────────────────────────────────
  if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
    errors.push(`${label}: ingredienser saknas`)
  } else {
    if (r.ingredients.length < 3)
      errors.push(`${label}: orimligt få ingredienser (${r.ingredients.length})`)

    for (const ing of r.ingredients) {
      const n = (ing.name || '').toLowerCase().trim()

      if (!ing.name) errors.push(`${label}: ingrediens saknar namn`)
      if (!(ing.quantity > 0)) errors.push(`${label}: "${ing.name}" har ogiltig mängd (${ing.quantity})`)
      if (!ing.unit) errors.push(`${label}: "${ing.name}" saknar enhet`)
      else if (!VALID_UNITS.includes(ing.unit))
        errors.push(`${label}: "${ing.name}" har ogiltig enhet "${ing.unit}"`)
      if (!ing.category) errors.push(`${label}: "${ing.name}" saknar kategori`)
      else if (!VALID_CATEGORIES.includes(ing.category))
        errors.push(`${label}: "${ing.name}" har ogiltig kategori "${ing.category}"`)

      // Styckevaror ska anges som antal (uppgift 7)
      for (const group of MUST_BE_COUNT) {
        if (group.match(n) && ing.unit !== 'st') {
          errors.push(`${label}: "${ing.name}" (${group.label}) ska anges i "st", inte "${ing.unit}"`)
        }
      }

      // dl-vätskor: kontrollera att presentationsregeln faktiskt känner igen
      // ingrediensen (regressionsskydd om nya grädde/mjölk-varianter läggs
      // till utan att matcha nyckelordslistan i ingredientRules.js)
      if (ing.unit === 'ml' && ['grädde', 'mjölk', 'kokosmjölk', 'vatten'].some((kw) => n.includes(kw))) {
        if (!shouldShowAsDl(ing.name, ing.unit)) {
          errors.push(`${label}: "${ing.name}" borde visas i dl i receptvyn men känns inte igen av ingredientRules.js`)
        }
      }

      // Biblioteksomfattande enhetskonsistens (uppgift 11)
      const normName = n
      const family = unitFamily(ing.unit)
      if (!nameToUnits.has(normName)) nameToUnits.set(normName, new Map())
      const familyMap = nameToUnits.get(normName)
      familyMap.set(family, (familyMap.get(family) || 0) + 1)
    }

    // Vegetariska recept får aldrig innehålla kött/fisk
    if (r.dietTypes?.includes('vegetarisk')) {
      const meatIngredient = r.ingredients.find((ing) => ing.category === 'meat')
      if (meatIngredient) errors.push(`${label}: markerad vegetarisk men innehåller köttvaran "${meatIngredient.name}"`)
      if (['kyckling', 'köttfärs', 'fisk', 'korv'].includes(r.proteinType))
        errors.push(`${label}: markerad vegetarisk men proteinType är "${r.proteinType}"`)
    }
  }

  // ── Instruktioner ────────────────────────────────────────────────────────
  if (!Array.isArray(r.instructions) || r.instructions.length === 0) {
    errors.push(`${label}: instruktioner saknas`)
  } else if (r.instructions.length < 2) {
    errors.push(`${label}: för få instruktionssteg (${r.instructions.length})`)
  }

  // ── Bild ─────────────────────────────────────────────────────────────────
  if (!r.image || !r.image.startsWith('/recipe-images/')) {
    errors.push(`${label}: bildsökväg saknas eller är felaktig`)
  } else if (seenImages.has(r.image)) {
    errors.push(`${label}: duplicerad bildsökväg "${r.image}"`)
  } else {
    seenImages.add(r.image)
  }
}

function unitFamily(unit) {
  const u = (unit || '').toLowerCase()
  if (['g', 'kg'].includes(u)) return 'weight'
  if (['ml', 'l', 'dl', 'cl'].includes(u)) return 'volume'
  if (u === 'st') return 'count'
  if (['msk', 'tsk', 'krm'].includes(u)) return 'spoon'
  return 'unknown'
}

// Flagga ingredienser som förekommer med INKOMPATIBLA enhetsfamiljer i olika
// recept (t.ex. samma vara som ibland gram, ibland styck) – det gör korrekt
// sammanslagning i inköpslistan omöjlig.
for (const [name, familyMap] of nameToUnits.entries()) {
  if (familyMap.size > 1) {
    const families = [...familyMap.keys()].join(', ')
    errors.push(`Ingrediensen "${name}" förekommer med inkompatibla enhetsfamiljer i olika recept: ${families}`)
  }
}

// ── Antalskontroller ─────────────────────────────────────────────────────────
const EXPECTED_TOTAL = 40
const MINIMUM_COUNTS = { vegetarisk: 16, kyckling: 10, 'kött/köttfärs': 7, fisk: 5 }

const total = RECIPES.length
if (total !== EXPECTED_TOTAL) errors.push(`Fel totalantal recept: ${total} (förväntade ${EXPECTED_TOTAL})`)

const vegCount = RECIPES.filter((r) => r.dietTypes?.includes('vegetarisk')).length
const chickenCount = RECIPES.filter((r) => r.proteinType === 'kyckling').length
const meatCount = RECIPES.filter((r) => ['köttfärs', 'korv'].includes(r.proteinType)).length
const fishCount = RECIPES.filter((r) => r.proteinType === 'fisk').length

if (vegCount < MINIMUM_COUNTS.vegetarisk) errors.push(`För få vegetariska: ${vegCount} (kräver minst ${MINIMUM_COUNTS.vegetarisk})`)
if (chickenCount < MINIMUM_COUNTS.kyckling) errors.push(`För få kyckling: ${chickenCount} (kräver minst ${MINIMUM_COUNTS.kyckling})`)
if (meatCount < MINIMUM_COUNTS['kött/köttfärs']) errors.push(`För få kött/köttfärs: ${meatCount} (kräver minst ${MINIMUM_COUNTS['kött/köttfärs']})`)
if (fishCount < MINIMUM_COUNTS.fisk) errors.push(`För få fisk: ${fishCount} (kräver minst ${MINIMUM_COUNTS.fisk})`)

// ── Andelskontroller ──────────────────────────────────────────────────────────
const familyFriendlyCount = RECIPES.filter((r) => r.familyFriendly).length
const familyFriendlyPct = (familyFriendlyCount / total) * 100
if (familyFriendlyPct < 80)
  errors.push(`Endast ${familyFriendlyPct.toFixed(0)}% familjevänliga recept (kräver minst 80%)`)

const quickCount = RECIPES.filter((r) => r.activeTimeMinutes <= 25 && r.totalTimeMinutes <= 40).length
const quickPct = (quickCount / total) * 100
if (quickPct < 75)
  errors.push(`Endast ${quickPct.toFixed(0)}% snabba recept (kräver minst 75%)`)

// ── Rimlighetsgränser per vuxenportion (VARNAR, stoppar inte bygget) ────────
// Ungefärliga riktvärden, inte absoluta kulinariska sanningar – se uppgift 4.
const PORTION_RANGES = {
  ris: [50, 80],
  pastaLike: [70, 100], // pasta, nudlar, lasagneplattor
  potatis: [200, 300],
  protein: [100, 170],
  linserMedRis: [40, 70],
}

for (const r of RECIPES) {
  const perPortion = (ing) => (ing.unit === 'g' ? ing.quantity / r.baseServings : null)
  const ris = r.ingredients.find((i) => i.name === 'Ris')
  const pastaLike = r.ingredients.find((i) => ['Pasta', 'Nudlar', 'Lasagneplattor'].includes(i.name))
  const potatis = r.ingredients.find((i) => i.name === 'Potatis')
  const linser = r.ingredients.find((i) => ['Röda linser', 'Gröna linser'].includes(i.name))
  const protein = r.ingredients.find((i) => i.category === 'meat')

  if (ris) {
    const p = perPortion(ris)
    if (p > PORTION_RANGES.ris[1]) warnings.push(`${r.id}: Ris ${p.toFixed(0)} g/portion (riktvärde ≤${PORTION_RANGES.ris[1]})`)
  }
  if (pastaLike) {
    const p = perPortion(pastaLike)
    if (p != null && p > PORTION_RANGES.pastaLike[1])
      warnings.push(`${r.id}: ${pastaLike.name} ${p.toFixed(0)} g/portion (riktvärde ≤${PORTION_RANGES.pastaLike[1]})`)
  }
  if (potatis) {
    const p = perPortion(potatis)
    if (p > PORTION_RANGES.potatis[1]) warnings.push(`${r.id}: Potatis ${p.toFixed(0)} g/portion (riktvärde ≤${PORTION_RANGES.potatis[1]})`)
  }
  if (protein) {
    const p = perPortion(protein)
    if (p != null && p > PORTION_RANGES.protein[1])
      warnings.push(`${r.id}: ${protein.name} ${p.toFixed(0)} g/portion (riktvärde ≤${PORTION_RANGES.protein[1]})`)
  }
  if (linser) {
    const p = perPortion(linser)
    const limit = ris ? PORTION_RANGES.linserMedRis[1] : Infinity
    if (p > limit) warnings.push(`${r.id}: ${linser.name} ${p.toFixed(0)} g/portion (riktvärde ≤${limit}, serveras med ris)`)
  }
  // Dubbel-bas: två stora baser nära sina tak samtidigt
  if (ris && linser) {
    const risP = perPortion(ris)
    const linserP = perPortion(linser)
    if (risP >= PORTION_RANGES.ris[1] * 0.9 && linserP >= PORTION_RANGES.linserMedRis[1] * 0.9) {
      warnings.push(`${r.id}: BALJVÄXT+RIS – ris ${risP.toFixed(0)} g och linser ${linserP.toFixed(0)} g ligger båda nära sitt tak samtidigt`)
    }
  }
}

// ── Extrema kryddmängder vid stor skalning (varnar) ─────────────────────────
// Skalar varje recept till 18 portioner med DEN RIKTIGA skalningsmotorn och
// kontrollerar att dampade ingredienser (kryddor, olja, buljong) inte blir
// orimligt stora ändå. Taken är kalibrerade mot vad dampenedFactor faktiskt
// producerar för normala grundmängder (t.ex. 2–3 vitlöksklyftor eller
// 1–3 msk soja/olja per 4-portionsrecept ger 6–9 vid 18 portioner, vilket
// är rimligt) – de ska fånga genuina avvikelser, inte vanliga resultat.
const SPICE_CEILINGS = { msk: 10, tsk: 12, st: 10 } // "st" gäller buljongtärningar/vitlök

for (const r of RECIPES) {
  const scaled18 = r.ingredients.map((ing) => scaleIngredient(ing, r.baseServings, 18))
  for (const ing of scaled18) {
    const rule = getIngredientRule(ing.name, ing.unit)
    if (!rule.isDampened) continue
    const ceiling = SPICE_CEILINGS[ing.unit]
    if (ceiling != null && ing.quantity > ceiling) {
      warnings.push(`${r.id}: "${ing.name}" blir ${ing.quantity} ${ing.unit} vid 18 portioner (riktvärde ≤${ceiling} ${ing.unit})`)
    }
  }
}

// ── Enkel prisuppskattning för täckningsrapporten ────────────────────────────
const WEIGHT_TO_GRAMS = { g: 1, kg: 1000 }
const VOLUME_TO_ML = { ml: 1, cl: 10, dl: 100, l: 1000 }

function findRoughProduct(ingredientName) {
  const name = (ingredientName || '').toLowerCase().trim()

  // Exakt matchning först – speglar prioritetsordningen i den riktiga
  // matchningsmotorn (src/utils/referencePricing.js). Utan detta steg kan
  // korta delsträngar råka matcha fel produkt (t.ex. "kikärtor" innehåller
  // delsträngen "ärtor" och skulle annars kunna matcha "Frysta grönsaker").
  for (const product of REFERENCE_PRICES) {
    if (product.aliases.includes(name)) return product
  }

  // Reservlösning: delvis matchning, bara om ingen exakt träff hittades
  for (const product of REFERENCE_PRICES) {
    if (product.aliases.some((a) => name.includes(a) || a.includes(name))) return product
  }
  return null
}

function roughIngredientCost(ing) {
  const product = findRoughProduct(ing.name)
  if (!product) return 10
  const u = (ing.unit || '').toLowerCase()
  if (product.purchaseType === 'weight') {
    let grams = null
    if (u in WEIGHT_TO_GRAMS) grams = ing.quantity * WEIGHT_TO_GRAMS[u]
    else if (u === 'st') grams = ing.quantity * 150
    return grams != null ? (grams / 1000) * product.estimatedPricePerUnit : 5
  }
  const pkgU = (product.packageUnit || '').toLowerCase()
  let ratio = null
  if (u in WEIGHT_TO_GRAMS && pkgU in WEIGHT_TO_GRAMS) ratio = (ing.quantity * WEIGHT_TO_GRAMS[u]) / (product.packageQuantity * WEIGHT_TO_GRAMS[pkgU])
  else if (u in VOLUME_TO_ML && pkgU in VOLUME_TO_ML) ratio = (ing.quantity * VOLUME_TO_ML[u]) / (product.packageQuantity * VOLUME_TO_ML[pkgU])
  else if (u === 'st' && pkgU === 'st') ratio = ing.quantity / product.packageQuantity
  else if (u === 'msk' || u === 'tsk' || u === 'krm') ratio = 0.1
  return (ratio ?? 0.5) * product.estimatedPackagePrice
}

function roughCostPerServing(recipe) {
  const totalCost = recipe.ingredients.reduce((s, ing) => s + roughIngredientCost(ing), 0)
  return totalCost / recipe.baseServings
}

// ── Resultat ───────────────────────────────────────────────────────────────
console.log(`Validerar ${total} recept...`)
console.log()

if (errors.length === 0) {
  console.log('✅ Alla recept är giltiga!')
  console.log()
  console.log(`   Totalt: ${total}`)
  console.log(`   Vegetariska: ${vegCount}`)
  console.log(`   Kyckling: ${chickenCount}`)
  console.log(`   Kött/köttfärs: ${meatCount}`)
  console.log(`   Fisk: ${fishCount}`)
  console.log(`   Familjevänliga: ${familyFriendlyCount}/${total} (${familyFriendlyPct.toFixed(0)}%)`)
  console.log(`   Icke-familjevänliga: ${total - familyFriendlyCount}/${total}`)
  console.log(`   Snabba (≤25 min aktiv, ≤40 total): ${quickCount}/${total} (${quickPct.toFixed(0)}%)`)
} else {
  console.error(`❌ ${errors.length} fel hittades:`)
  for (const e of errors) console.error(`   - ${e}`)
}

if (warnings.length > 0) {
  console.log()
  console.log(`⚠️  ${warnings.length} varning(ar) (stoppar inte bygget):`)
  for (const w of warnings) console.log(`   - ${w}`)
}

// ── Täckningsrapport ──────────────────────────────────────────────────────────
console.log()
console.log('── Täckningsrapport ─────────────────────────────')

const coverage = {
  'Vegetariskt': RECIPES.filter((r) => r.dietTypes?.includes('vegetarisk')),
  'Vegetariskt + familjevänligt': RECIPES.filter((r) => r.dietTypes?.includes('vegetarisk') && r.familyFriendly),
  'Blandkost + familjevänligt': RECIPES.filter((r) => r.dietTypes?.includes('blandkost') && r.familyFriendly),
  'Kött & grönt': RECIPES.filter((r) => r.dietTypes?.includes('kott-gront')),
  'Snabba familjerätter': RECIPES.filter((r) => r.familyFriendly && r.activeTimeMinutes <= 25 && r.totalTimeMinutes <= 40),
  'Lågprisrecept (<14 kr/portion)': RECIPES.filter((r) => roughCostPerServing(r) < 14),
}

for (const [labelText, matches] of Object.entries(coverage)) {
  const count = matches.length
  const warn = count < 10 ? '  ⚠️  färre än 10 kandidater' : ''
  console.log(`   ${labelText}: ${count}${warn}`)
}

const lowPriceNames = coverage['Lågprisrecept (<14 kr/portion)'].map((r) => r.name)
if (lowPriceNames.length > 0) {
  console.log(`   → Lågprisrecept: ${lowPriceNames.join(', ')}`)
}

console.log()
if (errors.length > 0) process.exitCode = 1
