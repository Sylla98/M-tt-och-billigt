// Tester för src/utils/analytics.js med MOCKAD analytics-transport.
//
// Körs med Node:s inbyggda testrunner (node --test, med flaggan
// --experimental-test-module-mocks) – introducerar inget nytt
// testramverk. Inget PostHog-konto eller nätverksanrop krävs.
//
// VARFÖR vi mockar hela 'posthog-js'-modulen (t.mock.module) istället för
// att bara stubba window: posthog-js:s riktiga kod anropar webbläsar-API:er
// (t.ex. window.addEventListener) redan vid IMPORT, inte bara vid init().
// Vi använder TESTETS EGEN t.mock (inte den delade mock-instansen från
// 'node:test') eftersom den automatiskt återställer mocken efter varje test.
//
// analytics.js läser NEXT_PUBLIC_ENABLE_ANALYTICS till en konstant VID
// IMPORT (modulnivå), så varje scenario importerar en egen, cache-bustad
// instans av modulen (?t=...) efter att ha satt rätt env-variabel och
// mockat posthog-js. Samtycket (analyticsConsent.js) är däremot en delad
// singleton som testerna styr direkt.
//
// Eftersom PostHog numera laddas med dynamic import först efter ett ja är
// capture asynkron – testerna väntar in det med settle().

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = globalThis.window || {}

// Samtyckeslagret är en delad singleton (analytics.js importerar samma
// instans som testerna) – det är så testerna styr "användarens val".
const consent = await import('../src/utils/analyticsConsent.js')

// Ger asynkrona capture-anrop (dynamic import + promise) tid att köras klart.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

/**
 * Mockar posthog-js (via testets egen mock-tracker t) med en fejk-PostHog
 * och returnerar en färsk instans av analytics.js. calls samlar varje
 * anrop till capture som [eventName, properties]; initCalls samlar init.
 * OBS: PostHogs opt_in/opt_out_capturing ignoreras av SDK:n i
 * cookieless_mode 'always' och används därför inte; samtycket vid
 * återkallelse upprätthålls av trackEvent() och init-optionen before_send.
 */
async function loadAnalyticsWithMockedTransport(t, { captureImpl } = {}) {
  const calls = []
  const initCalls = []
  const configCalls = []
  const fakePostHog = {
    capture: captureImpl || ((...args) => calls.push(args)),
    init(...args) {
      initCalls.push(args)
      fakePostHog.__loaded = true
    },
    set_config(cfg) { configCalls.push(cfg) },
    __loaded: false,
  }
  t.mock.module('posthog-js', { defaultExport: fakePostHog })
  const mod = await import(`../src/utils/analytics.js?t=${Date.now()}-${Math.random()}`)
  return { trackEvent: mod.trackEvent, calls, initCalls, configCalls }
}

// null = miljövariabeln är inte satt alls.
function setUp({ flag = 'true', key = 'phc_test', choice } = {}) {
  consent.__resetAnalyticsConsentForTests()
  if (flag === null) delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS
  else process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = flag
  if (key === null) delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  else process.env.NEXT_PUBLIC_POSTHOG_KEY = key
  process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com'
  if (choice) consent.setAnalyticsConsent(choice)
}

describe('trackEvent() – miljöflagga (NEXT_PUBLIC_ENABLE_ANALYTICS)', () => {
  test('no-op: skickar INGET event om flaggan inte är satt, ÄVEN med ja', async (t) => {
    setUp({ flag: null, choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('landing_cta_clicked')
    await settle()

    assert.equal(calls.length, 0, 'Flaggan av ska vinna över ett ja')
    assert.equal(initCalls.length, 0, 'PostHog får inte ens initieras')
  })

  test('no-op: samma sak om flaggan är satt till något ANNAT än exakt "true" (t.ex. "1")', async (t) => {
    setUp({ flag: '1', choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('landing_cta_clicked')
    await settle()

    assert.equal(calls.length, 0)
    assert.equal(initCalls.length, 0)
  })

  test('no-op: projektnyckel saknas (felkonfigurerad miljö) – ingen init, inget event', async (t) => {
    setUp({ key: null, choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    await settle()

    assert.equal(calls.length, 0)
    assert.equal(initCalls.length, 0)
  })
})

describe('trackEvent() – samtycke', () => {
  test('inget val gjort: inget event och PostHog initieras inte (inget förvalt ja)', async (t) => {
    setUp({ choice: undefined })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('landing_cta_clicked')
    trackEvent('$pageview', { $current_url: 'https://example.se/' })
    await settle()

    assert.equal(consent.getAnalyticsConsent(), null)
    assert.equal(calls.length, 0)
    assert.equal(initCalls.length, 0)
  })

  test('nej: inget event och PostHog initieras inte', async (t) => {
    setUp({ choice: 'declined' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('meal_plan_generated')
    await settle()

    assert.equal(calls.length, 0)
    assert.equal(initCalls.length, 0)
  })

  test('ja: PostHog initieras EN gång med integritetsinställningarna och eventet skickas', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    trackEvent('recipe_swapped')
    await settle()

    assert.equal(initCalls.length, 1, 'init ska ske exakt en gång')
    const [key, options] = initCalls[0]
    assert.equal(key, 'phc_test')
    assert.equal(options.api_host, 'https://eu.i.posthog.com')
    assert.equal(options.cookieless_mode, 'always')
    assert.equal(options.person_profiles, 'never')
    assert.equal(options.autocapture, false)
    assert.equal(options.capture_pageview, false)
    assert.equal(options.disable_session_recording, true)
    assert.equal(options.advanced_disable_flags, true)
    assert.equal(options.request_batching, false)
    assert.equal(options.capture_pageleave, false)
    assert.equal(typeof options.sanitize_properties, 'function')
    assert.deepEqual(calls.map((c) => c[0]), ['recipe_opened', 'recipe_swapped'])
    assert.equal(calls[0][1], undefined, 'Produkthändelserna ska INTE ha eventparametrar')
  })

  test('ja → nej: framtida event skickas inte, och before_send kastar allt SDK:n själv försöker fånga', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    await settle()
    assert.equal(calls.length, 1)
    const { before_send } = initCalls[0][1]
    assert.equal(typeof before_send, 'function')
    const sdkEvent = { event: '$exception' }
    assert.equal(before_send(sdkEvent), sdkEvent, 'Med ja släpps händelser igenom')

    consent.setAnalyticsConsent('declined')
    trackEvent('recipe_swapped')
    await settle()

    assert.equal(calls.length, 1, 'Inget mer får skickas efter återkallelse')
    assert.equal(before_send(sdkEvent), null, 'Efter återkallelse kastar before_send även SDK-interna händelser')
  })

  test('återkallelse avbryter omförsök: en redan avbruten AbortSignal sätts som fetch_options, och nollställs vid nytt ja', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, configCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    await settle()
    assert.equal(configCalls.length, 0, 'Inget ingrepp så länge ja gäller')

    consent.setAnalyticsConsent('declined')
    assert.equal(configCalls.length, 1)
    assert.equal(configCalls[0].fetch_options.signal.aborted, true)

    consent.setAnalyticsConsent('granted')
    assert.equal(configCalls.length, 2)
    assert.deepEqual(configCalls[1], { fetch_options: {} })
  })

  test('återkallelse medan PostHog fortfarande laddas: ingen init och inget event', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    consent.setAnalyticsConsent('declined') // innan dynamic import hunnit klart
    await settle()

    assert.equal(initCalls.length, 0, 'posthog.init tar kontakt med PostHog – får inte köras efter återkallelse')
    assert.equal(calls.length, 0)
  })

  test('ja → nej → ja: skickar igen (utan ny init)', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, calls, initCalls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')
    await settle()
    consent.setAnalyticsConsent('declined')
    consent.setAnalyticsConsent('granted')
    trackEvent('recipe_swapped')
    await settle()

    assert.equal(initCalls.length, 1)
    assert.deepEqual(calls.map((c) => c[0]), ['recipe_opened', 'recipe_swapped'])
    const sdkEvent = { event: 'x' }
    assert.equal(initCalls[0][1].before_send(sdkEvent), sdkEvent)
  })

  test('skickar valfria properties vidare (används bara av $pageview, se providers.js)', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent, calls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('$pageview', { $current_url: 'https://example.se/planera' })
    await settle()

    assert.equal(calls[0][0], '$pageview')
    assert.deepEqual(calls[0][1], { $current_url: 'https://example.se/planera' })
  })

  test('kraschar ALDRIG om transporten kastar ett fel (t.ex. nätverksfel eller en innehållsblockerare)', async (t) => {
    setUp({ choice: 'granted' })
    const { trackEvent } = await loadAnalyticsWithMockedTransport(t, {
      captureImpl: () => { throw new Error('simulerat nätverksfel') },
    })

    assert.doesNotThrow(() => trackEvent('meal_plan_generated'))
    await settle() // och ingen ohanterad promise-rejection heller
  })
})
