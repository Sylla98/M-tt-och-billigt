'use client'

// ─── Analytics-provider ─────────────────────────────────────────────────────
// Visar valet om produktstatistik och skickar sidvisningar – men BARA om
// statistik är påslagen i miljön (NEXT_PUBLIC_ENABLE_ANALYTICS) och
// besökaren aktivt tackat ja. PostHog laddas och initieras av
// src/utils/analytics.js först då; den här filen importerar inte längre
// posthog-js alls, så biblioteket hämtas aldrig före ett ja.
//
// PostHog-inställningarna (cookieless_mode: 'always', person_profiles:
// 'never', autocapture av, ingen Session Replay, URL-sanering) ligger kvar
// oförändrade men har flyttat till loadPostHog() i analytics.js, som är det
// enda som anropar posthog.init().
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { isAnalyticsEnabled, trackEvent } from '@/utils/analytics'
import { getAnalyticsConsent, subscribeToAnalyticsConsent } from '@/utils/analyticsConsent'
import AnalyticsConsentBanner from '@/components/AnalyticsConsentBanner'

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    () => null
  )

  useEffect(() => {
    if (!pathname) return
    // Utan ja skickas ingen sidvisning (trackEvent kollar också, men vi
    // undviker att ens försöka). Ett ja som ges på en sida ger en sidvisning
    // för just den sidan; sidor besökta före ja:et registreras inte i efterhand.
    if (consent !== 'granted') return
    // $current_url ska ENDAST innehålla origin + pathname – ALDRIG en
    // query-sträng (t.ex. ?name=Anna&budget=500). searchParams ligger kvar
    // som beroende så att en navigering som BARA ändrar query-parametrar
    // ändå räknas som en ny sidvisning (appen använder i dagsläget inga
    // sådana) – själva VÄRDET som skickas innehåller dock aldrig
    // frågetecknet. sanitize_properties är ett andra, generellt skyddsnät.
    trackEvent('$pageview', {
      $current_url: `${window.origin}${pathname}`,
    })
  }, [pathname, searchParams, consent])

  return null
}

export function PostHogProvider({ children }) {
  if (!isAnalyticsEnabled()) return children

  return (
    <>
      {/* useSearchParams kräver en Suspense-gräns i App Router. */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
      <AnalyticsConsentBanner />
    </>
  )
}
