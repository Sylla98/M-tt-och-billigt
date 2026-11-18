'use client'

// ─── Snabbväg till statistikvalet ───────────────────────────────────────────
// En liten, fast knapp "Ändra statistikval" som visas på alla sidor medan
// besökaren har tillåtit statistik. Den gör det lika lätt att återkalla
// samtycket som det var att ge det (GDPR art. 7.3) och ligger högt upp utan att
// besökaren behöver scrolla (PTS vägledning om samtycke). Den öppnar samma
// statistikpanel som "Ändra val för statistik" i sidfoten; ingen egen
// samtyckeslogik. Efter ett nej försvinner knappen (valet kan då ändras via
// sidfoten eller integritetssidan).
//
// Placering (CSS i globals.css, .consent-fab): fast längst upp intill den fasta
// feedbackknappen, i den del av skärmen som modalerna (receptvy, Byt rätt)
// alltid lämnar fri. Ligger över modalernas bakgrund (z-index som
// feedbackknappen). Döljs på pekskärm medan ett textfält har fokus, precis som
// feedbackknappen.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getAnalyticsConsent, setConsentPanelRequested, subscribeToAnalyticsConsent } from '@/utils/analyticsConsent'

const TEXT_INPUT_TYPES = new Set(['', 'text', 'number', 'tel', 'search', 'email', 'url', 'password'])

function isTextEntry(el) {
  if (!el || !el.tagName) return false
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true
  return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase())
}

export default function ConsentQuickButton() {
  const consent = useSyncExternalStore(subscribeToAnalyticsConsent, getAnalyticsConsent, () => null)
  const [typing, setTyping] = useState(false)

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

  if (consent !== 'granted' || typing) return null

  return (
    <button
      type="button"
      onClick={(e) => setConsentPanelRequested(true, e.currentTarget)}
      aria-label="Ändra statistikval (statistik är tillåten)"
      className="consent-fab inline-flex items-center justify-center min-h-[26px] px-2 min-[600px]:min-h-[36px] min-[600px]:px-2.5
                 rounded-full bg-surface border border-line-strong text-ink text-[12px] max-[339px]:text-[11px] font-semibold shadow-md
                 hover:border-ink-light/50 transition-colors duration-150 whitespace-nowrap"
    >
      Ändra statistikval
    </button>
  )
}
