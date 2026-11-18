// Text för hur ett byte ändrar planens uppskattade inköpskostnad, t.ex.
// "−200 kr för hela planen" eller "+60 kr för hela planen". Äkta minustecken
// (U+2212). Returnerar null om skillnaden inte kunnat räknas.
export function formatPlanCostDelta(delta) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return null
  const kr = Math.round(delta)
  if (kr === 0) return 'Ingen skillnad i kostnad för hela planen'
  const sign = kr < 0 ? '−' : '+'
  return `${sign}${Math.abs(kr).toLocaleString('sv-SE')} kr för hela planen`
}
