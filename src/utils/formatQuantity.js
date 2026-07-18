/**
 * Formaterar en mängd + enhet till läsbar svensk text.
 *
 * Regler:
 *  - >= 1000 g  → kg  (1 decimal, utan onödig .0)
 *  - >= 1000 ml → l   (1 decimal, utan onödig .0)
 *  - Övriga enheter (st, dl, msk, tsk, …) visas oförändrade
 *  - Decimalavgränsare: komma (sv-SE)
 *
 * Exempel:
 *   formatQuantity(3800, 'g')   → '3,8 kg'
 *   formatQuantity(1000, 'g')   → '1 kg'
 *   formatQuantity(1250, 'g')   → '1,3 kg'
 *   formatQuantity(750,  'g')   → '750 g'
 *   formatQuantity(3500, 'ml')  → '3,5 l'
 *   formatQuantity(1000, 'ml')  → '1 l'
 *   formatQuantity(500,  'ml')  → '500 ml'
 *   formatQuantity(12,   'st')  → '12 st'
 */
export function formatQuantity(quantity, unit) {
  if (quantity == null || quantity === '') return unit || ''

  const num = Number(quantity)
  if (isNaN(num)) return `${quantity}${unit ? ' ' + unit : ''}`

  const u = (unit || '').toLowerCase().trim()

  if (u === 'g' && num >= 1000) {
    return formatSwedish(num / 1000) + ' kg'
  }

  if (u === 'ml' && num >= 1000) {
    return formatSwedish(num / 1000) + ' l'
  }

  // Alla andra enheter: visa talet som heltal om det är jämnt, annars med 1 decimal
  const displayNum = Number.isInteger(num) ? num : formatSwedish(num)
  return unit ? `${displayNum} ${unit}` : `${displayNum}`
}

/**
 * Formaterar ett tal med max 1 decimal och svensk komma-separator.
 * Undviker onödiga decimaler: 1.0 → '1', 1.25 → '1,3'
 */
function formatSwedish(num) {
  const rounded = Math.round(num * 10) / 10
  // Använd sv-SE locale för komma-decimaler
  return rounded.toLocaleString('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
}

/**
 * Parsar en ingredienssträng som "3800 g lök" och formaterar mängden.
 * Returnerar oförändrat om strängen inte matchar mönstret.
 */
export function formatIngredientString(str) {
  if (!str || typeof str !== 'string') return str

  // Matcha: tal (inkl. decimaler) + eventuell enhet + resten
  const match = str.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l|dl|st|msk|tsk|krm|cl)?\s+(.+)$/i)
  if (!match) return str

  const [, rawQty, unit, name] = match
  const quantity = parseFloat(rawQty.replace(',', '.'))
  return `${formatQuantity(quantity, unit || '')} ${name}`.trim()
}
