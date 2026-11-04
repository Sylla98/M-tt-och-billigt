'use client'

// ─── Fast feedbackknapp ──────────────────────────────────────────────────────
// En kompakt, alltid nåbar länk till samma Google Formulär som övriga feedbackvägar
// (src/utils/feedbackLink.js). Öppnas i ny flik så att testaren kan återvända till
// samma läge. Ingen popup och inget som öppnas automatiskt. Skickar inget till
// statistik och sparar ingenting.
//
// Placering (CSS i globals.css, .feedback-fab):
//  - nere till höger, över innehållet och över dimmade bakgrunder (z-index över
//    receptmodalen och "Byt rätt"), men utanför deras rutor på bred skärm;
//  - på smal skärm (< 768 px) flyttas den till övre högra hörnet medan en modal
//    (aria-modal) är öppen, eftersom "Byt rätt" då är ett bottenark som täcker nederkanten;
//  - ligger den fasta statistikpanelen i vägen lyfts knappen precis ovanför panelen;
//  - på pekskärmar döljs den medan ett textfält har fokus (tangentbordet är uppe), så
//    den aldrig hamnar över fältet man skriver i.
// Sidorna som visar knappen lämnar plats under sidfoten (.footer-clear-fab) så att den
// inte döljer sidans sista rad.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FEEDBACK_FORM_URL } from '@/utils/feedbackLink'
import {
  getAnalyticsConsent,
  subscribeToAnalyticsConsent,
  isConsentPanelRequested,
  subscribeToConsentPanel,
} from '@/utils/analyticsConsent'

const PANEL_SELECTOR = '[role="dialog"][aria-labelledby="analytics-consent-title"]'
const GAP_ABOVE_PANEL = 8 // px
const TEXT_INPUT_TYPES = new Set(['', 'text', 'number', 'tel', 'search', 'email', 'url', 'password'])

function isTextEntry(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || el.isContentEditable) return true
  return tag === 'INPUT' && TEXT_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase())
}

export default function FeedbackFab() {
  const ref = useRef(null)
  const [lift, setLift] = useState(0)
  const [typing, setTyping] = useState(false)

  // Samma villkor som AnalyticsConsentBanner använder för att visa panelen.
  const consent = useSyncExternalStore(subscribeToAnalyticsConsent, getAnalyticsConsent, () => 'loading')
  const panelRequested = useSyncExternalStore(subscribeToConsentPanel, isConsentPanelRequested, () => false)
  const panelVisible = consent !== 'loading' && (consent === null || panelRequested)

  // Lyft knappen ovanför statistikpanelen om de annars skulle överlappa.
  useEffect(() => {
    const fab = ref.current
    const panel = panelVisible ? document.querySelector(PANEL_SELECTOR) : null
    if (!fab || !panel) {
      setLift(0)
      return undefined
    }
    const measure = () => {
      const p = panel.getBoundingClientRect()
      const f = fab.getBoundingClientRect()
      const overlapsHorizontally = p.left < f.right && p.right > f.left
      setLift(overlapsHorizontally ? Math.max(0, Math.round(window.innerHeight - p.top + GAP_ABOVE_PANEL)) : 0)
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(panel)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [panelVisible])

  // På pekskärmar: göm medan ett textfält har fokus (skärmtangentbordet är uppe).
  useEffect(() => {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    if (!coarse) return undefined
    const onIn = (e) => { if (isTextEntry(e.target)) setTyping(true) }
    const onOut = () => setTyping(false)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
  }, [])

  return (
    <a
      ref={ref}
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Lämna feedback (öppnas i Google Formulär i en ny flik)"
      title="Öppnas i Google Formulär i en ny flik"
      style={lift ? { '--fab-bottom': `${lift}px` } : undefined}
      className={`feedback-fab inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 max-[359px]:px-2.5 rounded-full
                  bg-surface border border-line-strong text-ink text-[13px] font-semibold shadow-md
                  hover:border-ink-light/50 transition-colors duration-150 ${typing ? 'hidden' : ''}`}
    >
      Lämna feedback
      <span aria-hidden="true" className="text-ink-light max-[359px]:hidden">↗</span>
    </a>
  )
}
