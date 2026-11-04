'use client'

// ─── Fast feedbackknapp ──────────────────────────────────────────────────────
// En kompakt, alltid nåbar länk till samma Google Formulär som övriga feedbackvägar
// (src/utils/feedbackLink.js). Öppnas i ny flik så att testaren kan återvända till
// samma läge. Ingen popup och inget som öppnas automatiskt. Skickar inget till
// statistik och sparar ingenting.
//
// Placering (CSS i globals.css, .feedback-fab): fast längst upp, horisontellt centrerad,
// över innehåll och över dimmade bakgrunder (z-index över modalerna). Den ligger i
// toppradens höjd, mellan logotypen och "Ny plan", och följer med vid scroll. Modalerna
// (receptmodalen, "Byt rätt") lämnar alltid fritt ovanför sig (max 85 % av skärmhöjden,
// centrerade eller nedtill), så knappen täcker varken deras innehåll eller stängknappar.
// Ingen växling mellan lägen och ingen mätning av andra element behövs.
//
// På pekskärmar döljs den medan ett textfält har fokus (skärmtangentbordet är uppe) och
// visas igen när fokus lämnar fältet.
import { useEffect, useState } from 'react'
import { FEEDBACK_FORM_URL } from '@/utils/feedbackLink'

const TEXT_INPUT_TYPES = new Set(['', 'text', 'number', 'tel', 'search', 'email', 'url', 'password'])

function isTextEntry(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || el.isContentEditable) return true
  return tag === 'INPUT' && TEXT_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase())
}

export default function FeedbackFab() {
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

  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Lämna feedback (öppnas i Google Formulär i en ny flik)"
      title="Öppnas i Google Formulär i en ny flik"
      className={`feedback-fab inline-flex items-center justify-center gap-1 min-h-[36px] px-2 rounded-full
                  bg-surface border border-line-strong text-ink text-[12px] font-semibold shadow-md
                  hover:border-ink-light/50 transition-colors duration-150 ${typing ? 'hidden' : ''}`}
    >
      Lämna feedback
      <span aria-hidden="true" className="text-ink-light max-[339px]:hidden">↗</span>
    </a>
  )
}
