'use client'

// ─── PostHog-provider ───────────────────────────────────────────────────────
// Initierar PostHog EN gång per sidladdning (modulnivå, inte i en effekt –
// annars skulle React Strict Mode i utveckling kunna trigga init två gånger).
// Aktiveras BARA i produktion, se NEXT_PUBLIC_ENABLE_ANALYTICS nedan.
//
// Integritetsval (se uppdragets avsnitt 4 och slutrapporten för motivering):
//  - cookieless_mode: 'always'  → inga cookies/localStorage, inget
//    samtyckeskrav enligt PostHogs och CNIL:s vägledning för den här typen
//    av anonym, icke-personbunden mätning.
//  - person_profiles: 'never'  → skapar aldrig identifierade användarprofiler.
//  - autocapture: false        → vi mäter ENDAST de sex definierade
//    händelserna, inte alla klick/formulärfält automatiskt.
//  - disable_session_recording → skärminspelning ska aldrig vara aktiverat.
//  - capture_pageview: false   → sidvisningar skickas manuellt nedan, se
//    PostHogPageView, eftersom App Router navigerar utan full omladdning.
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { isAnalyticsEnabled, trackEvent, sanitizeAnalyticsProperties } from '@/utils/analytics'

// QA-fynd: posthog.init() låg tidigare oskyddad på modulnivå. Ett fel här
// (t.ex. saknad/felaktig NEXT_PUBLIC_POSTHOG_KEY trots att flaggan råkat
// slås på) hade kunnat krascha HELA appens initiering, eftersom koden körs
// vid modulladdning – innan något try/catch längre ner hade en chans att
// fånga det. Analytics får ALDRIG kunna göra det, se avsnitt 3 i uppdraget.
if (typeof window !== 'undefined' && isAnalyticsEnabled() && !posthog.__loaded) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2025-05-24',
      // capture_pageview: false – PostHogs INBYGGDA, automatiska
      // sidvisningsspårning är avstängd. Sidvisningar skickas ENDAST via
      // PostHogPageView nedan (manuellt, en gång per pathname-ändring).
      // Om denna någonsin råkar tas bort eller sättas till true skulle vi
      // få DUBBLA pageviews (en automatisk vid init + en manuell) – se
      // slutrapporten för hur detta verifierats.
      capture_pageview: false,
      autocapture: false,
      cookieless_mode: 'always',
      person_profiles: 'never',
      disable_session_recording: true,
      // Dokumenterad PostHog-funktion (sanitize_properties) som körs på
      // VARJE event – både vårt eget $pageview och alla sex
      // produkthändelser – och tar bort ev. query-sträng ur URL-
      // egenskaper. Se src/utils/analytics.js för motivering och tester.
      sanitize_properties: sanitizeAnalyticsProperties,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] Kunde inte initiera PostHog:', err)
    }
  }
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    // QA-fix: $current_url ska ENDAST innehålla origin + pathname – ALDRIG
    // en query-sträng (t.ex. ?name=Anna&budget=500), se uppdragets punkt 2.
    // searchParams ligger kvar som beroende så att en navigering som BARA
    // ändrar query-parametrar ändå räknas som en ny sidvisning (appen
    // använder i dagsläget inga sådana, men det håller beteendet korrekt
    // om det skulle tillkomma) – själva VÄRDET som skickas innehåller
    // dock aldrig frågetecknet. sanitize_properties ovan är ett andra,
    // generellt skyddsnät om den här raden någonsin skulle ändras fel.
    trackEvent('$pageview', {
      $current_url: `${window.origin}${pathname}`,
    })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }) {
  if (!isAnalyticsEnabled()) return children

  return (
    <PHProvider client={posthog}>
      {/* useSearchParams kräver en Suspense-gräns i App Router. */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
