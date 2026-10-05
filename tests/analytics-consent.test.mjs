// Tester för samtyckeslagret (src/utils/analyticsConsent.js) – lagring,
// tolkning av sparat värde och att inget val behandlas som nej.

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

function createFakeStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    data,
  }
}

const storageListeners = []
globalThis.window = {
  localStorage: createFakeStorage(),
  addEventListener: (type, fn) => { if (type === 'storage') storageListeners.push(fn) },
}

const consent = await import('../src/utils/analyticsConsent.js')

beforeEach(() => {
  consent.__resetAnalyticsConsentForTests()
  window.localStorage = createFakeStorage()
})

describe('analyticsConsent', () => {
  test('inget sparat val → null (behandlas som nej, inget förvalt)', () => {
    assert.equal(consent.getAnalyticsConsent(), null)
  })

  test('sparar ett aktivt ja och ett aktivt nej i localStorage', () => {
    consent.setAnalyticsConsent('granted')
    assert.equal(window.localStorage.data[consent.CONSENT_STORAGE_KEY], 'granted')
    consent.setAnalyticsConsent('declined')
    assert.equal(window.localStorage.data[consent.CONSENT_STORAGE_KEY], 'declined')
    assert.equal(consent.getAnalyticsConsent(), 'declined')
  })

  test('läser ett tidigare sparat val vid nästa besök', () => {
    window.localStorage = createFakeStorage({ [consent.CONSENT_STORAGE_KEY]: 'granted' })
    assert.equal(consent.getAnalyticsConsent(), 'granted')
  })

  test('okända/manipulerade värden tolkas som inget val', () => {
    window.localStorage = createFakeStorage({ [consent.CONSENT_STORAGE_KEY]: 'true' })
    assert.equal(consent.getAnalyticsConsent(), null)
  })

  test('ogiltiga val ignoreras (inget ja av misstag)', () => {
    consent.setAnalyticsConsent('yes')
    consent.setAnalyticsConsent(true)
    consent.setAnalyticsConsent(undefined)
    assert.equal(consent.getAnalyticsConsent(), null)
    assert.deepEqual(window.localStorage.data, {})
  })

  test('lagring som kastar fel (privat läge) kraschar inte – valet gäller i minnet', () => {
    window.localStorage = {
      getItem: () => { throw new Error('blockerad') },
      setItem: () => { throw new Error('blockerad') },
    }
    assert.equal(consent.getAnalyticsConsent(), null)
    assert.doesNotThrow(() => consent.setAnalyticsConsent('granted'))
    assert.equal(consent.getAnalyticsConsent(), 'granted')
  })

  test('lyssnare notifieras vid ändring, och kan avregistrera sig', () => {
    const seen = []
    const unsubscribe = consent.subscribeToAnalyticsConsent((c) => seen.push(c))
    consent.setAnalyticsConsent('granted')
    unsubscribe()
    consent.setAnalyticsConsent('declined')
    assert.deepEqual(seen, ['granted'])
  })

  test('återkallelse i en annan flik (storage-event) slår igenom här', () => {
    consent.setAnalyticsConsent('granted')
    const seen = []
    consent.subscribeToAnalyticsConsent((c) => seen.push(c))
    window.localStorage.data[consent.CONSENT_STORAGE_KEY] = 'declined'
    storageListeners.forEach((fn) => fn({ key: consent.CONSENT_STORAGE_KEY }))
    assert.equal(consent.getAnalyticsConsent(), 'declined')
    assert.deepEqual(seen, ['declined'])
  })
})
