// ─── Analytics: central hjälpfunktion ──────────────────────────────────────
// Enda stället i appen som vet att vi använder PostHog. Om vi byter
// leverantör senare är det HÄR (och i providers.js) ändringen ska göras –
// resten av appen anropar bara trackEvent(eventName).
//
// Medvetet enkelt: inga köer, ingen retry-logik, inget eget
// tracking-ramverk. PostHog-klienten sköter redan batching/leverans.
//
// Aktivering styrs av NEXT_PUBLIC_ENABLE_ANALYTICS (se providers.js och
// README/analytics-avsnittet för miljöuppsättning). När den inte är satt
// till exakt 'true' är trackEvent() ett no-op – det gäller lokal
// utveckling och Vercel Preview by design, så våra egna tester aldrig
// förorenar produktionsstatistiken.
//
// KRAV: analytics får ALDRIG krascha appen eller störa användarflödet.
// Därför är allt inneslutet i try/catch och trackEvent() returnerar aldrig
// något som anropande kod behöver hantera.

import posthog from 'posthog-js'

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'

/**
 * Skickar ett namngivet analytics-event.
 *
 * Vi skickar MEDVETET inga eventparametrar för de sex produkthändelserna –
 * se uppdragets integritetskrav (avsnitt 4). `properties` finns bara för
 * PostHogs egna interna event (t.ex. $pageview i providers.js) så att ÄVEN
 * de går genom samma skyddade väg (try/catch) istället för att anropa
 * posthog.capture direkt. Lägg inte till properties på de sex
 * produkthändelserna utan att först motivera ett konkret analysbehov.
 *
 * @param {string} eventName - Ett eventnamn (ett av de sex, eller $pageview).
 * @param {object} [properties] - Valfria eventparametrar.
 */
export function trackEvent(eventName, properties) {
  if (!ANALYTICS_ENABLED) return
  if (typeof window === 'undefined') return

  try {
    posthog.capture(eventName, properties)
  } catch (err) {
    // Ska aldrig kunna krascha appen eller blockera navigering/generering.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[analytics] Kunde inte skicka event "${eventName}":`, err)
    }
  }
}

/** Används av providers.js för att avgöra om PostHog ska initieras alls. */
export const isAnalyticsEnabled = () => ANALYTICS_ENABLED

// ─── URL-sanering ────────────────────────────────────────────────────────
// Uppdragets krav: query-parametrar (t.ex. ?name=Anna&budget=500) OCH
// fragment (#...) ska ALDRIG skickas till PostHog, varken via vår egen
// $pageview eller via egenskaper PostHogs SDK bifogar AUTOMATISKT på
// VILKET event som helst (även våra sex produkthändelser, som annars
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
