// ─── Referensprissättning ────────────────────────────────────────────────────
// Ersätter den tidigare Primat-integrationen. Matchar AI:ns inköpsvaror mot
// den interna referensprislistan (src/data/referencePrices.js), beräknar
// realistiska inköpsmängder (hela förpackningar / lösvikt) och summerar
// totalkostnaden. AI:n rör aldrig priser – allt räknas här, server-side.

import { REFERENCE_PRICES, GENERIC_CATEGORY_PRICES } from '@/data/referencePrices'

// ── Normalisering ───────────────────────────────────────────────────────────
const NOISE_WORDS = [
  'cirka', 'ca', 'ungefär', 'färsk', 'färska', 'fryst', 'frysta', 'torkad', 'torkade',
  'burk', 'burkar', 'paket', 'påse', 'påsar', 'förpackning', 'förpackningar', 'tub', 'tuber',
  'flaska', 'flaskor', 'stor', 'stora', 'liten', 'små', 'medelstor',
  'ekologisk', 'ekologiska', 'hackad', 'hackade', 'skivad', 'skivade', 'riven', 'rivna',
  'på', 'i', 'med',
]

/**
 * Normaliserar ett ingrediensnamn för matchning: gemener, trimmat,
 * siffror och brusord borttagna, enkel pluralhantering.
 */
export function normalizeIngredientName(raw) {
  let s = (raw || '').toLowerCase().trim()
  // ta bort parenteser med innehåll
  s = s.replace(/\(.*?\)/g, ' ')
  // ta bort siffror (mängdangivelser hör inte hemma i namnet)
  s = s.replace(/\d+([.,]\d+)?/g, ' ')
  // ta bort brusord
  const words = s.split(/\s+/).filter((w) => w && !NOISE_WORDS.includes(w))
  s = words.join(' ').trim()
  return s
}

/** Enkel singularisering av sista ordet (svensk plural -> stam) */
function singularizeLastWord(term) {
  const words = term.split(' ')
  const last = words[words.length - 1]
  let stem = last
  if (last.endsWith('arna') || last.endsWith('erna')) stem = last.slice(0, -4)
  else if (last.endsWith('ar') || last.endsWith('er') || last.endsWith('or')) stem = last.slice(0, -2)
  if (stem !== last && stem.length >= 3) {
    return [...words.slice(0, -1), stem].join(' ')
  }
  return null
}

// ── Aliasmatchning ──────────────────────────────────────────────────────────
/**
 * Hittar en referensprodukt för ett ingrediensnamn/searchTerm.
 * Prioritetsordning:
 *  1. Exakt aliasmatchning på normaliserat namn
 *  2. Delvis säker matchning (alias ingår som helt ord i namnet, eller tvärtom)
 *  3. null (anroparen faller då tillbaka på generiskt kategoripris)
 */
export function findReferenceProduct(rawName) {
  const name = normalizeIngredientName(rawName)
  if (!name) return null

  // 1. Exakt alias
  for (const product of REFERENCE_PRICES) {
    if (product.aliases.includes(name)) return product
  }

  // 1b. Exakt alias efter singularisering
  const singular = singularizeLastWord(name)
  if (singular) {
    for (const product of REFERENCE_PRICES) {
      if (product.aliases.includes(singular)) return product
    }
  }

  // 2. Delvis matchning: aliaset förekommer som helt ord i namnet
  //    ("röd paprika" innehåller "paprika"), eller namnet ingår i ett alias.
  //    Längre alias prioriteras (mer specifika) för att undvika att t.ex.
  //    "lök" vinner över "gul lök".
  const candidates = []
  for (const product of REFERENCE_PRICES) {
    for (const alias of product.aliases) {
      const aliasWords = alias.split(' ')
      const nameWords = name.split(' ')
      const aliasInName = aliasWords.every((w) => nameWords.includes(w))
      const nameInAlias = nameWords.every((w) => aliasWords.includes(w))
      if (aliasInName || nameInAlias) {
        candidates.push({ product, aliasLength: alias.length })
        break
      }
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.aliasLength - a.aliasLength)
    return candidates[0].product
  }

  return null
}

// ── Generiskt kategoripris för okända varor ─────────────────────────────────
const CATEGORY_KEY_TO_GENERIC = {
  meat: 'protein',
  dairy: 'mejeri',
  vegetables: 'gronsak',
  canned: 'konserv',
  pasta: 'torrvara',
  pantry: 'krydda',
}

function getGenericPrice(categoryKey) {
  const genericKey = CATEGORY_KEY_TO_GENERIC[categoryKey] || 'ovrigt'
  return GENERIC_CATEGORY_PRICES[genericKey] || GENERIC_CATEGORY_PRICES.ovrigt
}

// ── Enhetsomvandling ────────────────────────────────────────────────────────
const WEIGHT_TO_GRAMS = { g: 1, kg: 1000 }
const VOLUME_TO_ML = { ml: 1, cl: 10, dl: 100, l: 1000 }

function unitFamily(unit) {
  const u = (unit || '').toLowerCase().trim()
  if (u in WEIGHT_TO_GRAMS) return 'weight'
  if (u in VOLUME_TO_ML) return 'volume'
  if (u === 'st') return 'count'
  if (u === 'msk' || u === 'tsk' || u === 'krm') return 'spoon'
  return 'unknown'
}

function toBaseUnit(quantity, unit) {
  const family = unitFamily(unit)
  const u = (unit || '').toLowerCase().trim()
  if (family === 'weight') return { family, value: quantity * WEIGHT_TO_GRAMS[u] }
  if (family === 'volume') return { family, value: quantity * VOLUME_TO_ML[u] }
  return { family, value: quantity }
}

// ── Radberäkning ────────────────────────────────────────────────────────────
const EMPTY = {
  packagesRequired: null,
  packageAmount: null,
  packageUnit: null,
  unitPrice: null,
  lineCost: null,
  isWeightBased: false,
  purchaseQuantity: null,
  purchaseUnit: null,
  isGenericEstimate: false,
}

/**
 * Beräknar inköpsmängd och radkostnad för en vara.
 * item: { displayName, searchTerm, quantity, unit }
 * Returnerar alltid ett prissatt resultat (referens, eller generisk uppskattning).
 */
function calculateLine(item, categoryKey) {
  const product = findReferenceProduct(item.searchTerm) || findReferenceProduct(item.displayName)
  const required = toBaseUnit(item.quantity, item.unit)

  // ── Ingen känd produkt: generiskt kategoripris ────────────────────────
  if (!product) {
    const generic = getGenericPrice(categoryKey)
    return {
      ...EMPTY,
      packagesRequired: 1,
      unitPrice: generic.estimatedPrice,
      lineCost: generic.estimatedPrice,
      isGenericEstimate: true,
    }
  }

  // ── Lösviktsvara ──────────────────────────────────────────────────────
  if (product.purchaseType === 'weight') {
    // kräver viktenhet; annars behandla som 1 generisk enhet av varan
    if (required.family === 'weight') {
      const kg = required.value / 1000
      const cost = kg * product.estimatedPricePerUnit
      return {
        ...EMPTY,
        unitPrice: product.estimatedPricePerUnit,
        lineCost: cost,
        isWeightBased: true,
        purchaseQuantity: Math.round(kg * 10) / 10,
        purchaseUnit: 'kg',
      }
    }
    if (required.family === 'count') {
      // t.ex. "2 st potatis" – uppskatta ~150 g/st som rimlig standard
      const kg = (required.value * 150) / 1000
      const cost = kg * product.estimatedPricePerUnit
      return {
        ...EMPTY,
        unitPrice: product.estimatedPricePerUnit,
        lineCost: cost,
        isWeightBased: true,
        purchaseQuantity: Math.round(kg * 10) / 10,
        purchaseUnit: 'kg',
      }
    }
    // skedmått/övrigt: minsta rimliga köp – en halv kilo-enhet
    const cost = 0.5 * product.estimatedPricePerUnit
    return {
      ...EMPTY,
      unitPrice: product.estimatedPricePerUnit,
      lineCost: cost,
      isWeightBased: true,
      purchaseQuantity: 0.5,
      purchaseUnit: 'kg',
    }
  }

  // ── Förpackad vara ────────────────────────────────────────────────────
  const pkgBase = toBaseUnit(product.packageQuantity, product.packageUnit)

  // Skedmått: alltid minst en hel förpackning, visa aldrig msk/tsk som köp
  if (required.family === 'spoon') {
    return {
      ...EMPTY,
      packagesRequired: 1,
      packageAmount: product.packageQuantity,
      packageUnit: product.packageUnit,
      unitPrice: product.estimatedPackagePrice,
      lineCost: product.estimatedPackagePrice,
    }
  }

  // Samma enhetsfamilj: hela förpackningar
  if (required.family === pkgBase.family && (required.family === 'weight' || required.family === 'volume' || required.family === 'count')) {
    const packagesRequired = Math.max(1, Math.ceil(required.value / pkgBase.value))
    return {
      ...EMPTY,
      packagesRequired,
      packageAmount: product.packageQuantity,
      packageUnit: product.packageUnit,
      unitPrice: product.estimatedPackagePrice,
      lineCost: packagesRequired * product.estimatedPackagePrice,
    }
  }

  // Enhetsfamiljerna matchar inte (t.ex. "2 dl grädde" mot g-förpackning,
  // eller "1 st citron" mot g): köp en förpackning som säker standard.
  return {
    ...EMPTY,
    packagesRequired: 1,
    packageAmount: product.packageQuantity,
    packageUnit: product.packageUnit,
    unitPrice: product.estimatedPackagePrice,
    lineCost: product.estimatedPackagePrice,
  }
}

// ── Huvudfunktion ────────────────────────────────────────────────────────────
/**
 * Prissätter hela den kategorigrupperade inköpslistan mot referensprislistan.
 * Alla varor får ett pris (referens eller generisk kategoriuppskattning) –
 * "Pris saknas" förekommer inte i denna testversion.
 */
export function priceShoppingListWithReference(groupedShoppingList) {
  let estimatedTotalCost = 0
  const pricedList = {}

  for (const [categoryKey, category] of Object.entries(groupedShoppingList || {})) {
    const pricedItems = []

    for (const item of category.items || []) {
      const result = calculateLine(item, categoryKey)
      estimatedTotalCost += result.lineCost || 0

      pricedItems.push({
        displayName: item.displayName,
        requiredQuantity: item.quantity,
        requiredUnit: item.unit,
        packagesRequired: result.packagesRequired,
        packageAmount: result.packageAmount,
        packageUnit: result.packageUnit,
        unitPrice: result.unitPrice,
        lineCost: result.lineCost,
        isWeightBased: result.isWeightBased,
        purchaseQuantity: result.purchaseQuantity,
        purchaseUnit: result.purchaseUnit,
        isGenericEstimate: result.isGenericEstimate,
      })
    }

    pricedList[categoryKey] = {
      label: category.label,
      emoji: category.emoji,
      items: pricedItems,
    }
  }

  // Avrunda totalen till hela kronor – det är en uppskattning, inte ett kassapris
  return {
    shoppingList: pricedList,
    estimatedTotalCost: Math.round(estimatedTotalCost),
  }
}
