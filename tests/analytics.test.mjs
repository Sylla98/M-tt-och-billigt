// Tester för src/utils/analytics.js med MOCKAD analytics-transport.
//
// Körs med Node:s inbyggda testrunner (node --test, med flaggan
// --experimental-test-module-mocks) – introducerar inget nytt
// testramverk. Inget PostHog-konto eller nätverksanrop krävs.
//
// VARFÖR vi mockar hela 'posthog-js'-modulen (t.mock.module) istället för
// att bara stubba window: posthog-js:s riktiga kod anropar webbläsar-API:er
// (t.ex. window.addEventListener) redan vid IMPORT, inte bara vid init().
// Ett enkelt `globalThis.window = {}`-stub räcker därför inte. Vi använder
// TESTETS EGEN t.mock (inte den delade mock-instansen från 'node:test')
// eftersom den automatiskt återställer mocken efter varje test – annars
// klagar nästa test att "posthog-js is already mocked".
//
// src/utils/analytics.js läser NEXT_PUBLIC_ENABLE_ANALYTICS till en konstant
// VID IMPORT (modulnivå), så varje scenario importerar en egen,
// cache-bustad instans av modulen (?t=...) efter att ha satt rätt
// env-variabel och mockat posthog-js – annars skulle testerna dela samma
// första importerade instans och råka testa fel tillstånd.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = globalThis.window || {}

/**
 * Mockar posthog-js (via testets egen mock-tracker t) med en fejk-capture()
 * och returnerar en färsk instans av analytics.js. calls samlar varje
 * anrop till capture som [eventName, properties].
 */
async function loadAnalyticsWithMockedTransport(t, { captureImpl } = {}) {
  const calls = []
  t.mock.module('posthog-js', {
    defaultExport: {
      capture: captureImpl || ((...args) => calls.push(args)),
      init: () => {},
      __loaded: false,
    },
  })
  const mod = await import(`../src/utils/analytics.js?t=${Date.now()}-${Math.random()}`)
  return { trackEvent: mod.trackEvent, calls }
}

describe('trackEvent() – mockad transport', () => {
  test('no-op: skickar INGET event om NEXT_PUBLIC_ENABLE_ANALYTICS inte är satt till "true"', async (t) => {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS
    const { trackEvent, calls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('landing_cta_clicked')

    assert.equal(calls.length, 0, 'Ingen produktionsdata får skickas i lokal utveckling/Preview (flaggan är av som default)')
  })

  test('no-op: samma sak om flaggan är satt till något ANNAT än exakt "true" (t.ex. felstavat eller "1")', async (t) => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = '1'
    const { trackEvent, calls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('landing_cta_clicked')

    assert.equal(calls.length, 0, 'Endast exakt strängen "true" ska aktivera analytics – ingen "nästan rätt"-aktivering')
  })

  test('aktiverat: skickar exakt ETT event, med rätt namn, ingen extra data', async (t) => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true'
    const { trackEvent, calls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('recipe_opened')

    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], 'recipe_opened')
    assert.equal(calls[0][1], undefined, 'De sex produkthändelserna ska INTE ha eventparametrar')
  })

  test('skickar valfria properties vidare (används bara av $pageview, se providers.js)', async (t) => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true'
    const { trackEvent, calls } = await loadAnalyticsWithMockedTransport(t)

    trackEvent('$pageview', { $current_url: 'https://example.se/planera' })

    assert.equal(calls[0][0], '$pageview')
    assert.deepEqual(calls[0][1], { $current_url: 'https://example.se/planera' })
  })

  test('kraschar ALDRIG om transporten kastar ett fel (t.ex. nätverksfel eller en innehållsblockerare)', async (t) => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true'
    const { trackEvent } = await loadAnalyticsWithMockedTransport(t, {
      captureImpl: () => { throw new Error('simulerat nätverksfel') },
    })

    assert.doesNotThrow(
      () => trackEvent('meal_plan_generated'),
      'trackEvent() måste svälja fel från transporten – analytics får aldrig störa användarflödet'
    )
  })
})
