// ─── Batchplanering ──────────────────────────────────────────────────────────
// Skiljer på "unika recept i rotationen" (användarens val, t.ex. 14 rätter)
// och "tillagningstillfällen" (hur många gånger något faktiskt lagas totalt
// under perioden). Ett långt matbehov ska ge FLER tillagningstillfällen med
// normal batchstorlek (6–8 portioner), inte enstaka jättebatcher.

// Siktar mot mitten av det tillåtna intervallet (6–8). Matchar uppgiftens
// egna räkneexempel exakt (t.ex. 172 portioner / 7 ≈ 25 tillfällen).
export const IDEAL_BATCH_SIZE = 7
export const MIN_RECOMMENDED_BATCH = 5
export const MAX_RECOMMENDED_BATCH = 8

/**
 * Räknar ut hur många tillagningstillfällen som behövs totalt.
 *
 * Utgår från portionsmålet delat med idealstorleken, men aldrig färre
 * tillfällen än antalet unika recept användaren valt (annars skulle något
 * valt recept aldrig faktiskt lagas till).
 *
 * OBS: för mycket små hushåll/korta perioder kombinerat med många valda
 * unika recept kan detta undantagsvis ge batcher under 5 portioner – det
 * är ett medvetet avvägt undantag (hellre ge användaren den variation de
 * valt än att tvinga fram överproduktion), se produktresonemanget i
 * README/uppgiftshistorik.
 */
export function calculateCookingOccurrences(totalServingsTarget, numberOfUniqueRecipes) {
  const byIdealBatchSize = Math.round(totalServingsTarget / IDEAL_BATCH_SIZE)
  return Math.max(numberOfUniqueRecipes, byIdealBatchSize, 1)
}

/**
 * Fördelar portionsmålet jämnt över tillagningstillfällena. Alla får minst
 * floor(mål/antal), och de första `remainder` tillfällena får ett extra –
 * summan blir därför EXAKT lika med portionsmålet.
 */
export function distributeBatchSizes(totalServingsTarget, occurrences) {
  const base = Math.floor(totalServingsTarget / occurrences)
  const remainder = totalServingsTarget - base * occurrences
  return Array.from({ length: occurrences }, (_, i) => base + (i < remainder ? 1 : 0))
}

/**
 * Bygger en tillagningslista genom att rotera de unika recepten i tur och
 * ordning tills önskat antal tillfällen är nått (round-robin). Eftersom de
 * unika recepten redan är valda med variation (protein-/kolhydrattyp, se
 * selectRecipes.js) ger round-robin automatiskt spridning – samma recept
 * kan aldrig komma två gånger i rad så länge fler än ett unikt recept finns,
 * och återkomster sprids jämnt över perioden istället för att klumpa ihop
 * sig i slutet.
 */
export function rotateRecipes(uniqueRecipes, occurrences) {
  return Array.from({ length: occurrences }, (_, i) => uniqueRecipes[i % uniqueRecipes.length])
}
