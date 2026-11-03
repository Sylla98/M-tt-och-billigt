// ─── Feedback: validering och konstanter (ren JS, testbar utan Next) ─────────
// Används av src/app/api/feedback/route.js. Svaren innehåller varken namn, e-post eller konto.

export const FEEDBACK_USED = {
  plan: 'skapa plan',
  byte: 'byta rätt',
  inkopslista: 'inköpslistan',
  handla: 'handla',
  laga: 'laga mat',
}
export const NEXT_TIME = { ja: 'ja', kanske: 'kanske', nej: 'nej' }
export const MAX_TEXT = 1500
export const MAX_BODY = 12 * 1024
const WINDOW_MS = 10 * 60 * 1000
export const MAX_PER_WINDOW = 8
const recent = new Map() // ip → tidsstämplar

export function webhookUrl() {
  const url = (process.env.FEEDBACK_WEBHOOK_URL || '').trim()
  return url.startsWith('https://') ? url : null
}

export function limited(ip) {
  const now = Date.now()
  const list = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) {
    recent.set(ip, list)
    return true
  }
  list.push(now)
  recent.set(ip, list)
  if (recent.size > 2000) for (const [k, v] of recent) if (!v.some((t) => now - t < WINDOW_MS)) recent.delete(k)
  return false
}

/** Validerar och normaliserar ett svar. Returnerar { ok, value } eller { ok: false, error }. */
export function validateFeedback(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Ogiltigt svar.' }
  const usedKeys = Array.isArray(body.used) ? body.used : []
  if (usedKeys.some((k) => typeof k !== 'string' || !Object.hasOwn(FEEDBACK_USED, k))) return { ok: false, error: 'Ogiltigt val.' }
  const used = [...new Set(usedKeys)]
  const text = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : '')
  if (body.nextTime !== undefined && body.nextTime !== '' && (typeof body.nextTime !== 'string' || !Object.hasOwn(NEXT_TIME, body.nextTime))) return { ok: false, error: 'Ogiltigt val.' }
  const value = {
    usedKeys: used,
    used: used.map((k) => FEEDBACK_USED[k]).join(', '),
    unclear: text(body.unclear),
    nextTime: body.nextTime || '',
    nextTimeWhy: text(body.nextTimeWhy),
  }
  if (!value.usedKeys.length && !value.unclear && !value.nextTime && !value.nextTimeWhy) {
    return { ok: false, error: 'Svara på minst en fråga.' }
  }
  return { ok: true, value }
}

