// ─── Ingrediensregler ────────────────────────────────────────────────────────
// Central plats för att avgöra HUR en ingrediens ska skalas och presenteras.
// All logik som skiljer "en styckvara" från "en krydda" från "en basvara"
// hör hemma här, så att skalning (portionScaling.js) och receptvy
// (RecipeCard.js) kan återanvända samma regler istället för att gissa var
// för sig.
//
// Tre skalningstyper:
//  - 'count'    → räknas i antal (lök, vitlök, morot, ägg, buljong ...)
//  - 'dampened' → skalas långsammare vid stora portionstal (kryddor, olja,
//                 buljong, starka smaksättare)
//  - 'linear'   → skalas normalt proportionellt (ris, pasta, kött, grönsaker)
//
// OBS: en ingrediens kan vara BÅDE 'count' OCH dampened (t.ex. vitlök och
// buljongtärningar) – därför är detta två separata flaggor, inte en enda typ.

function norm(name) {
  return (name || '').toLowerCase().trim()
}

// ── Räknebara ingredienser: exakta fraser, inte generiska böjningsregler ────
// Svenska plural- och adjektivböjningar (t.ex. "gul lök" → "gula lökar") är
// oregelbundna nog att en ordbok är tydligare och säkrare än en algoritm.
const COUNT_RULES = [
  { match: ['gul lök'], singular: 'gul lök', plural: 'gula lökar', granularity: 1 },
  { match: ['rödlök'], singular: 'rödlök', plural: 'rödlökar', granularity: 1 },
  { match: ['schalottenlök'], singular: 'schalottenlök', plural: 'schalottenlökar', granularity: 1 },
  { match: ['vitlök'], singular: 'vitlöksklyfta', plural: 'vitlöksklyftor', granularity: 1, dampened: true },
  { match: ['morot', 'morötter'], singular: 'morot', plural: 'morötter', granularity: 1 },
  { match: ['paprika'], singular: 'paprika', plural: 'paprikor', granularity: 1 },
  { match: ['citron'], singular: 'citron', plural: 'citroner', granularity: 0.5 },
  { match: ['lime'], singular: 'lime', plural: 'lime', granularity: 0.5 },
  { match: ['ägg'], singular: 'ägg', plural: 'ägg', granularity: 1 },
  { match: ['zucchini'], singular: 'zucchini', plural: 'zucchini', granularity: 0.5 },
  { match: ['aubergine'], singular: 'aubergine', plural: 'auberginer', granularity: 0.5 },
  { match: ['purjolök'], singular: 'purjolök', plural: 'purjolökar', granularity: 0.5 },
]

// Buljongtärningar hanteras separat eftersom namnet varierar med smak
// ("Grönsaksbuljong", "Kycklingbuljong", "Köttbuljong") men mönstret
// (lägg till "-tärning"/"-tärningar") är detsamma för alla.
function isBouillon(name) {
  return norm(name).includes('buljong')
}

// ── Dampade ingredienser: kryddor, olja, starka smaksättare ─────────────────
// Dessa skalas fortfarande linjärt upp till 6 portioner, men långsammare
// därutöver (se dampenedFactor). Vitlök och buljong är redan markerade
// `dampened: true` i COUNT_RULES ovan och behöver inte upprepas här.
const DAMPENED_KEYWORDS = [
  'salt', 'peppar', 'curry', 'paprikapulver', 'oregano', 'spiskummin', 'gurkmeja',
  'kanel', 'chili', 'garam masala', 'masala', 'olja', 'soja', 'sambal', 'senap',
  'ingefära',
]

function isDampenedByKeyword(name) {
  const n = norm(name)
  return DAMPENED_KEYWORDS.some((kw) => n.includes(kw))
}

/**
 * Avgör hur en ingrediens ska skalas och presenteras.
 * @returns {{ isCountable: boolean, isDampened: boolean, countRule: object|null, isBouillon: boolean }}
 */
export function getIngredientRule(name, unit) {
  const n = norm(name)
  const u = (unit || '').toLowerCase().trim()

  // Räknebara ingredienser kräver att enheten faktiskt är 'st' i grunddata –
  // annars skulle t.ex. "Paprikapulver" (enhet tsk) av misstag matcha
  // "paprika" (enhet st) och tolkas som en räknebar grönsak.
  if (u === 'st') {
    if (isBouillon(n)) {
      return { isCountable: true, isDampened: true, countRule: null, isBouillon: true }
    }
    const rule = COUNT_RULES.find((r) => r.match.some((m) => n.includes(m)))
    if (rule) {
      return { isCountable: true, isDampened: !!rule.dampened, countRule: rule, isBouillon: false }
    }
  }

  return { isCountable: false, isDampened: isDampenedByKeyword(n), countRule: null, isBouillon: false }
}

// ── Avrundning av styckevaror ────────────────────────────────────────────────
// Avrundar till närmaste praktiska mängd (inte alltid uppåt), men aldrig
// till 0 om ursprungsmängden var större än 0.
export function roundCountable(value, granularity = 1) {
  if (value <= 0) return 0
  const rounded = Math.round(value / granularity) * granularity
  return Math.max(granularity, rounded)
}

// ── Svensk pluralisering ─────────────────────────────────────────────────────
function formatSwedishNumber(n) {
  const rounded = Math.round(n * 10) / 10
  return rounded.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

/**
 * Formaterar en räknebar ingrediens till naturlig svenska för receptvyn.
 * T.ex. formatCountableIngredient('Gul lök', 2) → "2 gula lökar"
 *       formatCountableIngredient('Grönsaksbuljong', 1) → "1 grönsaksbuljongtärning"
 */
export function formatCountableIngredient(name, quantity) {
  const n = norm(name)

  if (isBouillon(n)) {
    const singular = `${n}tärning`
    const plural = `${n}tärningar`
    return quantity === 1 ? `1 ${singular}` : `${formatSwedishNumber(quantity)} ${plural}`
  }

  const rule = COUNT_RULES.find((r) => r.match.some((m) => n.includes(m)))
  if (!rule) return `${formatSwedishNumber(quantity)} ${name}`.trim()

  const form = quantity === 1 ? rule.singular : rule.plural
  return `${formatSwedishNumber(quantity)} ${form}`
}

// ── Dampad skalning för kryddor, buljong, olja, starka smaksättare ─────────
// Princip: linjär skalning upp till TRÖSKEL portioner, därefter växer
// mängden i halva takten. Håller kryddmängder rimliga även för stora
// matplaner utan att recepten känns underkryddade vid normala storlekar.
const DAMPING_THRESHOLD_SERVINGS = 6
const DAMPING_RATE = 0.5

export function dampenedFactor(targetServings, baseServings) {
  if (targetServings <= DAMPING_THRESHOLD_SERVINGS) {
    return targetServings / baseServings
  }
  const linearPart = DAMPING_THRESHOLD_SERVINGS / baseServings
  const excessServings = targetServings - DAMPING_THRESHOLD_SERVINGS
  const dampedPart = (excessServings / baseServings) * DAMPING_RATE
  return linearPart + dampedPart
}

// ── Svenska köksenheter för vätskor i receptvyn ──────────────────────────────
// Skiljer sig medvetet från inköpslistans formatQuantity (som stannar vid
// kg/l-gränsen) – i receptvyn vill vi hellre se "2,5 dl" än "250 ml".
// Gäller bara de vätskor som normalt mäts i dl i ett svenskt kök.
const DL_LIQUID_KEYWORDS = ['grädde', 'mjölk', 'kokosmjölk', 'vatten', 'buljong']

export function shouldShowAsDl(name, unit) {
  const u = (unit || '').toLowerCase()
  if (u !== 'ml') return false
  const n = norm(name)
  return DL_LIQUID_KEYWORDS.some((kw) => n.includes(kw))
}

/**
 * Konverterar ml → dl för receptvyn (endast under 1000 ml – därutöver är
 * liter naturligare, vilket redan hanteras av den generella formatQuantity).
 */
export function toRecipeViewLiquid(name, quantity, unit) {
  if (!shouldShowAsDl(name, unit)) return { quantity, unit }
  if (quantity >= 1000) return { quantity, unit } // låt formatQuantity visa liter som vanligt
  return { quantity: quantity / 100, unit: 'dl' }
}
