// ─── Visning av inköpsrader ──────────────────────────────────────────────────
// Ren hjälpfunktion (ingen React) så att regeln går att testa. Används av ShoppingList.js.

function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text
}

/**
 * Om produkten har en egen inköpsenhet (packageLabel i referencePrices.js, t.ex. kruka/krukor) och
 * antalet förpackningar är känt: "1 kruka färsk basilika" eller "2 krukor färsk basilika".
 * Annars null (raden visas som förut).
 */
export function packageCountName(item) {
  if (!item || !item.packageLabel || item.packagesRequired == null) return null
  const n = item.packagesRequired
  const unit = n === 1 ? item.packageLabel.singular : item.packageLabel.plural
  return `${n} ${unit} ${lowerFirst(item.displayName)}`
}
