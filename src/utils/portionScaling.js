// ─── Portionsskalning ────────────────────────────────────────────────────────
// Central plats för att skala EN ingrediens från ett recepts grundmängd till
// önskat antal portioner. Ersätter den tidigare blinda linjära skalningen
// (samma faktor på allt, från ris till buljongtärningar) med tre olika
// beteenden beroende på ingredienstyp – se ingredientRules.js för
// klassificeringen.

import { getIngredientRule, roundCountable, dampenedFactor } from './ingredientRules.js'

// ── Standardavrundning för "vanliga" (icke räknebara) ingredienser ─────────
// Oförändrad från tidigare version: hela matskedar/teskedar i halvor,
// gram avrundat till närmaste 10 över 100 g, annars en decimal.
function roundLinear(value, unit) {
  const u = (unit || '').toLowerCase()
  if (u === 'msk' || u === 'tsk' || u === 'krm') return Math.round(value * 2) / 2
  if (value >= 100) return Math.round(value / 10) * 10
  return Math.round(value * 10) / 10
}

/**
 * Skalar en enskild ingrediens från recept.baseServings till targetServings.
 *
 * - Räknebara ingredienser (lök, vitlök, ägg, buljong ...) avrundas till
 *   praktiska antal (roundCountable).
 * - Dampade ingredienser (kryddor, olja, buljong, vitlök, starka
 *   smaksättare) skalas långsammare över 6 portioner (dampenedFactor).
 * - Övriga ingredienser skalas normalt linjärt.
 *
 * En ingrediens kan vara både räknebar OCH dampad (t.ex. vitlök, buljong) –
 * då avgör dampenedFactor SKALFAKTORN och roundCountable SLUTAVRUNDNINGEN.
 */
export function scaleIngredient(ingredient, baseServings, targetServings) {
  const rule = getIngredientRule(ingredient.name, ingredient.unit)

  const factor = rule.isDampened
    ? dampenedFactor(targetServings, baseServings)
    : targetServings / baseServings

  const rawScaled = ingredient.quantity * factor

  const quantity = rule.isCountable
    ? roundCountable(rawScaled, rule.countRule?.granularity ?? 1)
    : roundLinear(rawScaled, ingredient.unit)

  return { ...ingredient, quantity }
}
