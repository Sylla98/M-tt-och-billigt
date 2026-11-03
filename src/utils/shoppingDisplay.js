// ─── Visning av inköpsrader ──────────────────────────────────────────────────
// Rena hjälpfunktioner (ingen React) så att reglerna går att testa. Används av ShoppingList.js.
import { formatQuantity } from '@/utils/formatQuantity'
import { formatCountableIngredient } from '@/utils/ingredientRules'

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

// Volym under 1 liter visas i dl i inköpslistan (t.ex. 800 ml → 8 dl).
// formatQuantity.js rörs inte – den delen är en delad funktion som även
// receptvyn använder, så dl-omvandlingen hålls lokal här istället.
function formatShoppingTotal(quantity, unit) {
  const u = (unit || '').toLowerCase()
  if (u === 'ml' && quantity < 1000) {
    return formatQuantity(quantity / 100, 'dl')
  }
  return formatQuantity(quantity, unit)
}

/**
 * Delar upp raden i namn och mängd så de kan visas på var sin rad i butik.
 * Prisberäkningen (packagesRequired, packageAmount, isWeightBased m.m.)
 * fortsätter beräknas exakt som förut – det är bara PRESENTATIONEN här.
 */
export function buildDisplay(item) {
  // Produkt med egen inköpsenhet (t.ex. kruka): "Färsk basilika – 2 krukor". Gäller före övriga regler.
  const packageName = packageCountName(item)
  if (packageName) return { name: packageName, amount: null }

  // Räknebara varor (lök, vitlök, ägg, citron, buljong ...): visa alltid
  // det naturliga antalet, oavsett hur priset räknats internt.
  if (item.requiredUnit === 'st') {
    return { name: formatCountableIngredient(item.displayName, item.requiredQuantity), amount: null }
  }

  // Lösviktsvaror: redan en sammanlagd mängd utan förpackningsantal.
  if (item.isWeightBased) {
    return {
      name: item.displayName,
      amount: `cirka ${formatQuantity(item.purchaseQuantity, item.purchaseUnit)}`,
    }
  }

  // Paketbaserade varor: total köpt mängd = antal förpackningar × storlek,
  // visad som EN sammanlagd mängd istället för "N × storlek".
  if (item.packagesRequired != null && item.packageAmount != null && item.packageUnit) {
    const totalQuantity = item.packagesRequired * item.packageAmount
    return {
      name: item.displayName,
      amount: formatShoppingTotal(totalQuantity, item.packageUnit),
    }
  }

  return { name: item.displayName, amount: null }
}

// Listan som vanlig text: en rad per vara som inte är avbockad, grupperad per kategori.
export function shoppingListText(categories, checked = [], totalCost = null) {
  const lines = ['Inköpslista – Mätt & Billigt']
  if (totalCost != null) lines.push(`Uppskattad totalsumma: ca ${Math.round(totalCost).toLocaleString('sv-SE')} kr`)
  for (const cat of categories) {
    const open = (cat.items || []).filter((item) => !checked.includes(`${cat.label}::${item.displayName}`))
    if (open.length === 0) continue
    lines.push('', cat.label)
    for (const item of open) {
      const { name, amount } = buildDisplay(item)
      lines.push(`- ${name}${amount ? ` – ${amount}` : ''}`)
    }
  }
  return lines.join('\n')
}
