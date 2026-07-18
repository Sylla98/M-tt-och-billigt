// ─── Enkel rate limiter i minnet ──────────────────────────────────────────────
// Ingen databas eller extern tjänst krävs. Fungerar direkt lokalt (npm run dev)
// och på Vercel utan extra konfiguration.
//
// OBS – känd begränsning: Vercels serverless-funktioner kan köras i flera
// parallella instanser, som var och en har sitt eget minne. Gränsen är därför
// en "best effort"-spärr snarare än en exakt global räknare. Det räcker gott
// för att stoppa oavsiktlig spam och enkla missbruksförsök i en tidig MVP.
// Vid behov av en exakt gräns över alla instanser kan Vercel Firewall
// (@vercel/firewall) eller Upstash Redis läggas till senare.

const WINDOW_MS = 10 * 60 * 1000 // 10 minuter
const MAX_REQUESTS = 3            // max 3 genereringar per fönster

const requestLog = new Map() // identifierare → array av tidsstämplar (ms)

let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // städa bort gamla poster var 5:e minut

function cleanupOldEntries(now) {
  for (const [key, timestamps] of requestLog.entries()) {
    const recent = timestamps.filter((t) => now - t < WINDOW_MS)
    if (recent.length === 0) {
      requestLog.delete(key)
    } else {
      requestLog.set(key, recent)
    }
  }
}

/**
 * Kontrollerar och registrerar ett nytt anrop för given identifierare.
 * Returnerar { limited: false } om anropet tillåts (och räknas då direkt),
 * eller { limited: true, retryAfterSeconds } om gränsen är nådd.
 */
export function checkRateLimit(identifier) {
  const now = Date.now()

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldEntries(now)
    lastCleanup = now
  }

  const timestamps = (requestLog.get(identifier) || []).filter((t) => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = Math.min(...timestamps)
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow)
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  timestamps.push(now)
  requestLog.set(identifier, timestamps)
  return { limited: false }
}

/**
 * Hämtar en identifierare för klienten baserat på IP-adress.
 * Vercel sätter x-forwarded-for automatiskt på alla inkommande requests.
 */
export function getClientIdentifier(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Kan innehålla flera IP:n separerade med komma – första är klienten
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
