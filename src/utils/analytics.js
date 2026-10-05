// ─── Analytics: central hjälpfunktion ──────────────────────────────────────
// Enda stället i appen som vet att vi använder PostHog. Om vi byter
// leverantör senare är det HÄR (och i providers.js) ändringen ska göras –
// resten av appen anropar bara trackEvent(eventName).
//
// Medvetet enkelt: inga köer, ingen retry-logik, inget eget
// tracking-ramverk. PostHog-klienten sköter redan batching/leverans.
//
// TVÅ SPÄRRAR måste båda vara öppna innan PostHog ens laddas:
//   1. NEXT_PUBLIC_ENABLE_ANALYTICS är exakt 'true' (miljöflagga som varje
//      miljö sätter själv – t.ex. Production och den skyddade Preview som
//      används för interna tester; lokalt lämnas den tom).
//   2. Besökaren har AKTIVT valt "Tillåt produktstatistik"
//      (src/utils/analyticsConsent.js). Inget val räknas som nej.
//
// PostHog-biblioteket importeras DYNAMISKT först när båda är uppfyllda. Före
// ett ja (och för alltid vid ett nej) hämtas varken biblioteket, och
// posthog.init() anropas aldrig, så ingen kontakt tas med PostHog.
// Återkallas ja:et slutar trackEvent() skicka, och before_send (nedan) stoppar
// även allt som SDK:n själv försöker fånga. OBS: PostHogs opt_out_capturing()
// duger inte här – med cookieless_mode 'always' ignoreras det (SDK:n loggar
// bara en varning) – så vi förlitar oss inte på det.
//
// KRAV: analytics får ALDRIG krascha appen eller störa användarflödet.
// Därför är allt inneslutet i try/catch och trackEvent() returnerar aldrig
// något som anropande kod behöver hantera.

import { getAnalyticsConsent, subscribeToAnalyticsConsent } from './analyticsConsent.js'

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'

let posthogInstance = null // satt först efter lyckad init
let loadPromise = null
let initFailed = false

const hasConsent = () => getAnalyticsConsent() === 'granted'

function warnInDev(message, err) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, err)
  }
}

/**
 * Laddar och initierar PostHog – bara om flaggan är på OCH samtycke finns.
 * Resolvar till PostHog-instansen, eller null om något av villkoren inte
 * (längre) uppfylls eller laddningen misslyckas.
 */
function loadPostHog() {
  if (!ANALYTICS_ENABLED || !hasConsent() || initFailed) return Promise.resolve(null)
  // Flaggan på men projektnyckel saknas (felkonfigurerad miljö): ladda inget.
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return Promise.resolve(null)
  if (posthogInstance) return Promise.resolve(posthogInstance)
  if (loadPromise) return loadPromise

  loadPromise = import('posthog-js')
    .then((mod) => {
      const posthog = mod.default
      // Återkallades samtycket medan biblioteket hämtades? Då initierar vi
      // inte alls – posthog.init() är det som tar kontakt med PostHog.
      if (!hasConsent()) return null

      if (!posthog.__loaded) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          defaults: '2025-05-24',
          // capture_pageview: false – PostHogs INBYGGDA, automatiska
          // sidvisningsspårning är avstängd. Sidvisningar skickas ENDAST via
          // PostHogPageView i providers.js (manuellt, en gång per pathname-
          // ändring). Om denna tas bort eller sätts till true får vi DUBBLA
          // pageviews.
          capture_pageview: false,
          autocapture: false,
          // Cookieless: inga cookies/localStorage från PostHog.
          cookieless_mode: 'always',
          person_profiles: 'never',
          disable_session_recording: true,
          // Vi använder inga feature flags. Flagganropet (/flags) skickar
          // dessutom sidans URL och hänvisare som "person properties" UTAN att
          // gå genom sanitize_properties – av är både enklare och säkrare.
          advanced_disable_flags: true,
          // Sista grind innan en händelse ens läggs i sändkön: utan aktuellt ja
          // kastas ALLT, även sådant SDK:n själv fångar (inte bara våra egna
          // trackEvent-anrop). Gäller nya händelser; ett anrop som redan
          // påbörjats stoppas inte av detta; omförsök hanteras separat, se
          // "Återkallelse och omförsök" nedan.
          before_send: (event) => (hasConsent() ? event : null),
          // Ingen automatisk "sidan lämnades"-händelse (skulle annars kunna
          // skickas vid sidbyte, utanför våra egna spärrar).
          capture_pageleave: false,
          // Skicka varje händelse direkt istället för att samla dem i en kö
          // som töms var tredje sekund. Det går inte att tömma PostHogs
          // batchkö när samtycket återkallas: en händelse som köats strax före
          // en återkallelse skickades annars ändå efteråt (verifierat i
          // webbläsare). Volymen i appen är låg, så kostnaden är försumbar.
          // Notera: ett MISSLYCKAT anrop läggs av SDK:n i en omförsökskö som
          // inte går att tömma härifrån; se "Återkallelse och omförsök" nedan.
          request_batching: false,
          // Körs på VARJE event – vårt eget $pageview och alla produkt-
          // händelser – och tar bort query/fragment ur URL-egenskaper samt
          // hänvisande URL:er. Se sanitizeAnalyticsProperties nedan.
          sanitize_properties: sanitizeAnalyticsProperties,
        })
      }
      posthogInstance = posthog
      return posthog
    })
    .catch((err) => {
      initFailed = true
      warnInDev('[analytics] Kunde inte ladda/initiera PostHog:', err)
      return null
    })
    .finally(() => {
      loadPromise = null
    })

  return loadPromise
}

/**
 * Skickar ett namngivet analytics-event – om flaggan är på och besökaren
 * tackat ja. Annars är anropet ett no-op.
 *
 * Vi skickar MEDVETET inga eventparametrar för produkthändelserna (se
 * uppdragets integritetskrav). `properties` finns bara för PostHogs egna
 * interna event (t.ex. $pageview i providers.js) så att ÄVEN de går genom
 * samma skyddade väg istället för att anropa posthog.capture direkt. Lägg
 * inte till properties på produkthändelserna utan att först motivera ett
 * konkret analysbehov – och skicka aldrig budget, hushållsuppgifter eller
 * fritext (t.ex. skafferiet) som egenskap.
 *
 * @param {string} eventName - Ett produkthändelsenamn eller $pageview.
 * @param {object} [properties] - Valfria eventparametrar.
 */
export function trackEvent(eventName, properties) {
  if (!ANALYTICS_ENABLED) return
  if (typeof window === 'undefined') return
  if (!hasConsent()) return

  try {
    loadPostHog()
      .then((posthog) => {
        // Samtycket kan ha återkallats medan PostHog laddades – kolla igen
        // precis innan något skickas.
        if (!posthog || !hasConsent()) return
        posthog.capture(eventName, properties)
      })
      .catch((err) => {
        warnInDev(`[analytics] Kunde inte skicka event "${eventName}":`, err)
      })
  } catch (err) {
    // Ska aldrig kunna krascha appen eller blockera navigering/generering.
    warnInDev(`[analytics] Kunde inte skicka event "${eventName}":`, err)
  }
}

/** Används av providers.js för att avgöra om samtyckesvalet ska visas alls. */
export const isAnalyticsEnabled = () => ANALYTICS_ENABLED

// ─── Återkallelse och omförsök ──────────────────────────────────────────────
// Ett anrop som MISSLYCKAS (nätverksfel, 5xx) lägger PostHog-SDK:n i en
// intern omförsökskö och skickar om det efter några sekunder – också efter
// att samtycket återkallats (verifierat mot lokal testserver). Kön går inte
// att tömma via publika API:er. Däremot hämtar SDK:n fetch_options på nytt
// vid varje omförsök, så vid återkallelse sätter vi en redan avbruten
// AbortSignal: omförsök misslyckas då direkt i webbläsaren, utan nätverk.
// Ett nytt ja återställer det. Detta gäller bara omförsök; ett anrop som
// redan är under sändning när valet ändras går inte att dra tillbaka.
if (typeof window !== 'undefined') {
  subscribeToAnalyticsConsent((choice) => {
    const posthog = posthogInstance
    if (!posthog) return
    try {
      if (choice === 'granted') {
        posthog.set_config({ fetch_options: {} })
      } else {
        const aborted = new AbortController()
        aborted.abort()
        posthog.set_config({ fetch_options: { signal: aborted.signal } })
      }
    } catch (err) {
      warnInDev('[analytics] Kunde inte uppdatera PostHogs omförsöksinställning:', err)
    }
  })
}

// ─── URL-sanering ────────────────────────────────────────────────────────
// Uppdragets krav: query-parametrar (t.ex. ?name=Anna&budget=500) OCH
// fragment (#...) ska ALDRIG skickas till PostHog, varken via vår egen
// $pageview eller via egenskaper PostHogs SDK bifogar AUTOMATISKT på
// VILKET event som helst (även våra sju produkthändelser, som annars
// aldrig annars bär någon egen URL-data). Vi behåller pathname – det är
// det som skiljer sidorna åt i analytics.

/**
 * Trimmar en URL till origin + pathname. URL-objektets .pathname
 * innehåller varken query-strängen (den ligger i .search) eller fragmentet
 * (den ligger i .hash), så det här tar bort BÅDA i samma steg. Om värdet
 * inte går att tolka som en URL returneras det orört – ska ALDRIG kunna
 * krascha (sanitize_properties körs på varje event).
 */
function stripQueryString(url) {
  if (typeof url !== 'string') return url
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

// Kända PostHog-egenskaper som kan innehålla en fullständig URL (t.ex.
// query-sträng och/eller fragment) för VÅR EGEN sida. PostHog kan bifoga
// dessa automatiskt på VARJE event, inte bara på $pageview – se
// providers.js för var sanitize_properties kopplas in. Dessa TRIMMAS
// (origin + pathname behålls, resten tas bort).
const URL_PROPERTIES_TO_SANITIZE = ['$current_url', '$initial_current_url', '$session_entry_url']

// Hänvisande URL:er (varifrån besökaren kom) kan bära exakt samma typ av
// känslig information i sin query-sträng som våra egna sidor – t.ex.
// https://exempel.se/?email=anna@exempel.se om länken användaren klickade
// på råkade innehålla en sådan parameter. Installerad PostHog-version
// (1.434.15) sätter dessa tre automatiskt när informationen finns
// tillgänglig. Vi behöver ingen detaljerad hänvisningsdata i det här
// testskedet (se uppdraget), så vi tar bort HELA egenskapen istället för
// att bara trimma den – enklare och mer integritetsvänligt än att spara
// en URL vi ändå inte använder till något.
//
// $referring_domain / $initial_referring_domain / $session_entry_referring_domain
// rörs MEDVETET INTE – de innehåller bara domännamnet (t.ex.
// "google.com"), aldrig en query-sträng, och ger fortfarande ofarlig,
// användbar statistik om varifrån trafiken kommer.
const REFERRER_PROPERTIES_TO_REMOVE = ['$referrer', '$initial_referrer', '$session_entry_referrer']

/**
 * PostHogs dokumenterade sanitize_properties-hook (kopplas in i
 * providers.js:s posthog.init). Körs på VARJE event PostHog fångar –
 * oavsett om det är vårt eget trackEvent()-anrop eller en egenskap SDK:n
 * bifogat automatiskt. Trimmar våra egna URL-egenskaper, tar bort
 * hänvisande URL:er helt, rör inget annat.
 */
export function sanitizeAnalyticsProperties(properties) {
  if (!properties || typeof properties !== 'object') return properties

  for (const key of URL_PROPERTIES_TO_SANITIZE) {
    if (typeof properties[key] === 'string') {
      properties[key] = stripQueryString(properties[key])
    }
  }

  for (const key of REFERRER_PROPERTIES_TO_REMOVE) {
    delete properties[key]
  }

  // Om SDK:n någonsin skulle bifoga query-strängen som en egen egenskap
  // (utöver att den ingår i $current_url) – ta bort den också.
  delete properties.$search
  delete properties.$search_params

  return properties
}
