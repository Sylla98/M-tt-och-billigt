// ─── Visning av inköpsrader ──────────────────────────────────────────────────
// Ren hjälpfunktion (ingen React) så att regeln går att testa. Används av ShoppingList.js.

/**
 * Om produkten har en egen inköpsenhet (packageLabel i referencePrices.js, t.ex. kruka/krukor) och
 * antalet förpackningar är känt: "Färsk basilika – 1 kruka" eller "Färsk basilika – 2 krukor".
 * Antalet är hela förpackningar (summerat över hela planen och avrundat uppåt i prismotorn) och är
 * samma antal som kostnaden räknas på. Annars null (raden visas som förut).
 */
export function packageCountName(item) {
  if (!item || !item.packageLabel || item.packagesRequired == null) return null
  const n = item.packagesRequired
  const unit = n === 1 ? item.packageLabel.singular : item.packageLabel.plural
  return `${item.displayName} – ${n} ${unit}`
}
