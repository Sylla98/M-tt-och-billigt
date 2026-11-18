// ─── Samtycke till produktstatistik ────────────────────────────────────────
// Enda stället som vet vad användaren valt om statistik. analytics.js frågar
// här innan PostHog laddas eller något skickas; UI-komponenterna
// (AnalyticsConsentBanner, AnalyticsSettingsButton) läser och skriver här.
//
// Tre tillstånd:
//   null      → användaren har inte valt. Behandlas som NEJ överallt.
//   'granted' → användaren har aktivt valt "Tillåt produktstatistik".
//   'declined'→ användaren har aktivt valt "Fortsätt utan statistik".
//
// Valet sparas i localStorage (nyckel nedan) så att vi inte frågar vid varje
// besök. Det är det ENDA vi lagrar i användarens webbläsare – PostHog körs
// cookieless och skriver ingenting själv. Om localStorage inte är tillgängligt
// (privat läge, blockerad lagring) faller vi tillbaka på minnet: valet gäller
// då bara till sidan laddas om, och användaren tillfrågas igen nästa gång.
//
// Allt är defensivt (try/catch): samtyckeslagret får aldrig kunna krascha
// appen, och vid minsta tvekan är svaret "inget samtycke".

export const CONSENT_STORAGE_KEY = 'mb_analytics_consent'

let consent = null // minnesspegel av valet
let hasReadStorage = false
const listeners = new Set()

function readStoredConsent() {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored === 'granted' || stored === 'declined' ? stored : null
  } catch {
    return null
  }
}

function ensureRead() {
  if (hasReadStorage) return
  if (typeof window === 'undefined') return
  hasReadStorage = true
  consent = readStoredConsent()
}

/** Aktuellt val: 'granted' | 'declined' | null (inget val gjort). */
export function getAnalyticsConsent() {
  ensureRead()
  return consent
}

function notify() {
  for (const listener of [...listeners]) {
    try {
      listener(consent)
    } catch {
      // En lyssnare får aldrig stoppa de andra.
    }
  }
}

/** Sparar ett aktivt val. Andra värden än 'granted'/'declined' ignoreras. */
export function setAnalyticsConsent(choice) {
  if (choice !== 'granted' && choice !== 'declined') return
  ensureRead()
  consent = choice
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Lagring ej tillgänglig – valet gäller i minnet under sidbesöket.
  }
  notify()
}

/** Prenumererar på ändringar. Returnerar en avprenumerationsfunktion. */
export function subscribeToAnalyticsConsent(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ─── "Ändra val"-panelen ────────────────────────────────────────────────────
// Sidfotens (och integritetssidans) knapp "Ändra val för statistik" öppnar
// samma panel som visas första gången. Panelens öppet/stängt-läge hålls här
// så att knapparna (som kan ligga långt från bannern i komponentträdet) kan
// öppna den. Vi kommer också ihåg EXAKT vilket element som öppnade panelen,
// så att fokus kan återgå dit när panelen stängs – knappen finns på flera
// ställen på samma sida och kan därför inte identifieras med ett id.
let panelRequested = false
let panelTrigger = null
const panelListeners = new Set()

export function isConsentPanelRequested() {
  return panelRequested
}

/** Elementet som öppnade panelen (eller null, t.ex. vid första besöket). */
export function getConsentPanelTrigger() {
  return panelTrigger
}

/**
 * Öppnar (true) eller stänger (false) panelen. Vid öppning anges elementet
 * som öppnade den; vid stängning nollställs det.
 */
export function setConsentPanelRequested(value, trigger = null) {
  const nextTrigger = value ? trigger : null
  if (panelRequested === value && panelTrigger === nextTrigger) return
  panelRequested = value
  panelTrigger = nextTrigger
  for (const listener of [...panelListeners]) listener()
}

export function subscribeToConsentPanel(listener) {
  panelListeners.add(listener)
  return () => panelListeners.delete(listener)
}

// ─── Synk mellan flikar ─────────────────────────────────────────────────────
// Återkallar användaren sitt ja i en flik ska en annan öppen flik sluta skicka.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CONSENT_STORAGE_KEY) return
    hasReadStorage = true
    consent = readStoredConsent()
    notify()
  })
}

// Endast för tester: nollställer modulens tillstånd.
export function __resetAnalyticsConsentForTests() {
  consent = null
  hasReadStorage = false
  panelRequested = false
  panelTrigger = null
  listeners.clear()
  panelListeners.clear()
}
