// Tester för URL-sanering (uppdrag: "SISTA KORRIGERINGARNA AV POSTHOG
// ANALYTICS", punkt 2). Ingen DOM eller PostHog-transport behövs här –
// sanitizeAnalyticsProperties() är en ren funktion.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { sanitizeAnalyticsProperties } = await import(`../src/utils/analytics.js?t=${Date.now()}`)

describe('sanitizeAnalyticsProperties()', () => {
  test('tar bort query-strängen från $current_url, behåller origin + pathname', () => {
    const result = sanitizeAnalyticsProperties({
      $current_url: 'https://example.se/planera?name=Anna&budget=500',
    })
    assert.equal(result.$current_url, 'https://example.se/planera')
  })

  test('gör samma sak för $initial_current_url och $session_entry_url (PostHogs egna automatiska URL-egenskaper)', () => {
    const result = sanitizeAnalyticsProperties({
      $initial_current_url: 'https://example.se/?ref=nyhetsbrev',
      $session_entry_url: 'https://example.se/planera?steg=2',
    })
    assert.equal(result.$initial_current_url, 'https://example.se/')
    assert.equal(result.$session_entry_url, 'https://example.se/planera')
  })

  test('en URL utan query-sträng lämnas oförändrad', () => {
    const result = sanitizeAnalyticsProperties({ $current_url: 'https://example.se/planera' })
    assert.equal(result.$current_url, 'https://example.se/planera')
  })

  test('tar bort URL-fragment (#...), inte bara query-strängen', () => {
    const result = sanitizeAnalyticsProperties({
      $current_url: 'https://example.se/planera#steg-3',
    })
    assert.equal(result.$current_url, 'https://example.se/planera')
  })

  test('tar bort BÅDE query-sträng och fragment i samma URL (uppdragets exempel)', () => {
    const result = sanitizeAnalyticsProperties({
      $current_url: 'https://example.com/page?email=anna@example.com#section',
    })
    assert.equal(result.$current_url, 'https://example.com/page')
  })

  test('tar bort hänvisande URL:er helt ($referrer, $initial_referrer, $session_entry_referrer) – de kan bära samma typ av känslig query-data som våra egna URL:er', () => {
    const result = sanitizeAnalyticsProperties({
      $referrer: 'https://exempel.se/?email=anna@exempel.se',
      $initial_referrer: 'https://google.com/search?q=matt+och+billigt',
      $session_entry_referrer: 'https://exempel.se/nyhetsbrev?anvandare=anna@exempel.se',
    })
    assert.equal('$referrer' in result, false)
    assert.equal('$initial_referrer' in result, false)
    assert.equal('$session_entry_referrer' in result, false)
  })

  test('rör INTE *_referring_domain – bara domännamnet, aldrig en query-sträng, fortfarande ofarlig statistik', () => {
    const result = sanitizeAnalyticsProperties({
      $referring_domain: 'google.com',
      $initial_referring_domain: 'google.com',
      $session_entry_referring_domain: 'google.com',
    })
    assert.equal(result.$referring_domain, 'google.com')
    assert.equal(result.$initial_referring_domain, 'google.com')
    assert.equal(result.$session_entry_referring_domain, 'google.com')
  })

  test('tar bort $search / $search_params om PostHog någonsin skulle bifoga dem separat', () => {
    const result = sanitizeAnalyticsProperties({
      $current_url: 'https://example.se/',
      $search: '?name=Anna',
      $search_params: { name: 'Anna' },
    })
    assert.equal('$search' in result, false)
    assert.equal('$search_params' in result, false)
  })

  test('rör INTE andra egenskaper – bara de kända URL-fälten', () => {
    const result = sanitizeAnalyticsProperties({
      $current_url: 'https://example.se/?x=1',
      $os: 'iOS',
      $browser: 'Safari',
    })
    assert.equal(result.$os, 'iOS')
    assert.equal(result.$browser, 'Safari')
  })

  test('kraschar aldrig på ogiltiga/oväntade värden (null, tomt objekt, trasig URL, siffra)', () => {
    assert.doesNotThrow(() => sanitizeAnalyticsProperties(null))
    assert.doesNotThrow(() => sanitizeAnalyticsProperties(undefined))
    assert.deepEqual(sanitizeAnalyticsProperties({}), {})
    assert.doesNotThrow(() => sanitizeAnalyticsProperties({ $current_url: 'inte-en-url' }))
    assert.doesNotThrow(() => sanitizeAnalyticsProperties({ $current_url: 12345 }))
  })
})

describe('analytics.js + providers.js – statisk konfigurationskontroll (regressionsspärr)', () => {
  // Detta är EN TEXTKONTROLL av källkoden, inte ett körande test av
  // React-komponenten (providers.js innehåller JSX och kan inte importeras
  // direkt i Node utan en bundlare/transpilerare). Den fångar om någon av
  // de här raderna av misstag tas bort eller ändras i framtiden – den
  // bevisar INTE att posthog.init() faktiskt beter sig rätt i en riktig
  // webbläsare (se slutrapportens punkt om vad som är kodgranskat).
  // posthog.init()-inställningarna ligger i analytics.js (laddas först efter
  // samtycke); den manuella $pageview byggs i providers.js.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const analyticsSource = readFileSync(path.join(here, '..', 'src', 'utils', 'analytics.js'), 'utf8')
  const providersSource = readFileSync(path.join(here, '..', 'src', 'app', 'providers.js'), 'utf8')

  test('capture_pageview är satt till false (förhindrar PostHogs automatiska sidvisningsspårning)', () => {
    assert.match(analyticsSource, /capture_pageview:\s*false/)
  })

  test('sanitize_properties är inkopplat mot sanitizeAnalyticsProperties', () => {
    assert.match(analyticsSource, /sanitize_properties:\s*sanitizeAnalyticsProperties/)
  })

  test('den manuella $pageview-egenskapen byggs utan query-sträng (bara origin + pathname)', () => {
    assert.match(providersSource, /\$current_url:\s*`\$\{window\.origin\}\$\{pathname\}`/)
  })

  test('cookieless-läge, inga identifierade profiler, ingen autocapture och ingen Session Replay är kvar', () => {
    assert.match(analyticsSource, /cookieless_mode:\s*'always'/)
    assert.match(analyticsSource, /person_profiles:\s*'never'/)
    assert.match(analyticsSource, /autocapture:\s*false/)
    assert.match(analyticsSource, /disable_session_recording:\s*true/)
  })

  test('feature flags är avstängda (flagganropet skickar URL/hänvisare förbi sanitize_properties)', () => {
    assert.match(analyticsSource, /advanced_disable_flags:\s*true/)
  })

  test('batchkö är avstängd (annars skickas köade händelser även efter återkallelse)', () => {
    assert.match(analyticsSource, /request_batching:\s*false/)
  })

  test('before_send kastar händelser utan samtycke, och opt_out/opt_in-anrop (ignoreras i cookieless-läge) används inte', () => {
    assert.match(analyticsSource, /before_send:\s*\(event\)\s*=>\s*\(hasConsent\(\)\s*\?\s*event\s*:\s*null\)/)
    assert.doesNotMatch(analyticsSource, /\.(opt_out_capturing|opt_in_capturing)\(/)
  })

  test('posthog-js importeras bara dynamiskt – aldrig statiskt (annars laddas biblioteket före samtycke)', () => {
    const files = ['src/utils/analytics.js', 'src/app/providers.js', 'src/components/TrackedLink.js']
    for (const f of files) {
      const src = readFileSync(path.join(here, '..', f), 'utf8')
      assert.doesNotMatch(src, /^\s*import[^\n]*['"]posthog-js(\/react)?['"]/m, `${f} får inte importera posthog-js statiskt`)
    }
    assert.match(analyticsSource, /import\('posthog-js'\)/)
  })
})
