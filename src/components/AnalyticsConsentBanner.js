'use client'

// ─── Val om produktstatistik ────────────────────────────────────────────────
// Visas första gången (inget val gjort) och när besökaren klickar "Ändra val
// för statistik" i sidfoten. De två valen är likvärdiga: samma knappstil,
// samma storlek, ingen förvald. Appen fungerar likadant oavsett val.
//
// Renderas inte alls på servern (valet finns bara i webbläsaren), så ingen
// "blinkning" och ingen hydreringskonflikt.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
  isConsentPanelRequested,
  getConsentPanelTrigger,
  setConsentPanelRequested,
  subscribeToConsentPanel,
} from '@/utils/analyticsConsent'

const SERVER_SNAPSHOT = 'loading'

const choiceButtonClass =
  'flex-1 inline-flex items-center justify-center bg-forest hover:bg-forest-dark ' +
  'text-white font-bold py-3 px-5 rounded-lg text-sm min-h-[44px] transition-colors duration-150'

export default function AnalyticsConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    () => SERVER_SNAPSHOT
  )
  const panelRequested = useSyncExternalStore(
    subscribeToConsentPanel,
    isConsentPanelRequested,
    () => false
  )
  const panelRef = useRef(null)

  const visible = consent !== SERVER_SNAPSHOT && (consent === null || panelRequested)
  const isReopened = consent !== null && consent !== SERVER_SNAPSHOT

  // När panelen öppnas via en "Ändra val för statistik"-knapp flyttas fokus
  // hit (utan att scrolla sidan). Första besöket stjäl vi inte fokus.
  useEffect(() => {
    if (visible && panelRequested) panelRef.current?.focus({ preventScroll: true })
  }, [visible, panelRequested])

  // Vid stängning går fokus tillbaka till EXAKT den knapp som öppnade panelen.
  // Öppnades den inte av en knapp (första besöket) rörs fokus och scroll-
  // position inte alls – annars kunde det första valet hoppa till sidfoten.
  const close = () => {
    const trigger = getConsentPanelTrigger()
    setConsentPanelRequested(false)
    if (trigger && trigger.isConnected) trigger.focus()
  }

  const choose = (choice) => {
    setAnalyticsConsent(choice)
    close()
  }

  useEffect(() => {
    if (!visible || !isReopened) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, isReopened])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none">
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-text"
        tabIndex={-1}
        className="pointer-events-auto max-w-[660px] mx-auto bg-surface border border-line-strong
                   rounded-2xl shadow-lg p-5 outline-none"
      >
        <h2 id="analytics-consent-title" className="font-bold text-ink text-base mb-2">
          Vill du bidra med produktstatistik?
        </h2>
        <div id="analytics-consent-text" className="text-sm text-ink-light leading-relaxed space-y-2 mb-4">
          <p>
            Vi vill förstå hur appen används – till exempel hur många som skapar en
            matplan eller öppnar ett recept. Det är helt frivilligt och appen fungerar
            likadant oavsett vad du väljer.
          </p>
          <p>
            Vi mäter aldrig vad du skriver in, som budget, hushåll eller skafferi. Verktyget
            (PostHog) tar dock emot teknisk information om din webbläsare och enhet.{' '}
            <Link href="/integritet" className="underline underline-offset-2 hover:text-forest">
              Läs mer om hur vi hanterar statistiken
            </Link>
            .
          </p>
          {isReopened && (
            <p className="font-medium text-ink">
              Ditt nuvarande val:{' '}
              {consent === 'granted' ? 'produktstatistik är tillåten.' : 'du fortsätter utan statistik.'}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => choose('granted')} className={choiceButtonClass}>
            Tillåt produktstatistik
          </button>
          <button type="button" onClick={() => choose('declined')} className={choiceButtonClass}>
            Fortsätt utan statistik
          </button>
        </div>

        {isReopened && (
          <button
            type="button"
            onClick={close}
            className="mt-3 text-sm text-ink-light hover:text-forest underline underline-offset-4 py-1"
          >
            Stäng utan att ändra
          </button>
        )}
      </div>
    </div>
  )
}
