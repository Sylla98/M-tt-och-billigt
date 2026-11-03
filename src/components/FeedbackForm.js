'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// Befintligt Google Formulär: används som reserv så länge ingen egen mottagare är konfigurerad
// (FEEDBACK_WEBHOOK_URL, se TESTRUNDA.md) eller om det inte går att skicka.
export const GOOGLE_FORM_URL = 'https://forms.gle/M5PvhoAFESmbyxZh7'

const USED = [
  { id: 'plan', label: 'Skapa plan' },
  { id: 'byte', label: 'Byta rätt' },
  { id: 'inkopslista', label: 'Inköpslistan' },
  { id: 'handla', label: 'Handla' },
  { id: 'laga', label: 'Laga mat' },
]
const NEXT = [
  { id: 'ja', label: 'Ja' },
  { id: 'kanske', label: 'Kanske' },
  { id: 'nej', label: 'Nej' },
]

const inputClass =
  'w-full rounded-lg border border-line bg-white text-ink placeholder-ink-light/60 ' +
  'px-3.5 py-3 text-base focus:outline-none focus:border-forest transition-colors'

function Choice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`py-2.5 px-3.5 rounded-lg text-sm font-medium border transition-colors duration-150 min-h-[44px]
        ${selected ? 'bg-forest text-white border-forest' : 'bg-white text-ink border-line hover:border-ink-light/40'}`}
    >
      {selected && <span aria-hidden="true" className="mr-1.5">✓</span>}
      {children}
    </button>
  )
}

function Question({ id, title, hint, children }) {
  return (
    <div role="group" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 id={id} className="text-label font-semibold text-ink">{title}</h2>
        {hint && <span className="text-xs text-ink-light/70">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function FallbackLink({ intro }) {
  return (
    <div className="bg-white rounded-xl border border-line p-6">
      <p className="text-ink-light text-sm leading-relaxed mb-4">{intro}</p>
      <a
        href={GOOGLE_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center bg-terracotta hover:bg-terracotta/80 text-ink font-bold
                   py-2.5 px-6 rounded-lg text-sm min-h-[44px] transition-colors duration-150"
      >
        Lämna feedback
      </a>
    </div>
  )
}

export default function FeedbackForm() {
  const [enabled, setEnabled] = useState(null) // null = vet inte än
  const [used, setUsed] = useState([])
  const [unclear, setUnclear] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [nextTimeWhy, setNextTimeWhy] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch('/api/feedback')
      .then((r) => r.json())
      .then((d) => alive && setEnabled(Boolean(d.enabled)))
      .catch(() => alive && setEnabled(false))
    return () => { alive = false }
  }, [])

  const toggle = (id) => setUsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const hasAnswer = used.length > 0 || unclear.trim() || nextTime || nextTimeWhy.trim()

  const submit = async (e) => {
    e.preventDefault()
    if (!hasAnswer || status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ used, unclear, nextTime, nextTimeWhy, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Det gick inte att skicka just nu.')
      setStatus('sent')
    } catch (err) {
      setError(err.message || 'Det gick inte att skicka just nu.')
      setStatus('error')
    }
  }

  if (enabled === null) return <div className="h-40" aria-hidden="true" />

  if (!enabled) {
    return (
      <FallbackLink intro="Berätta gärna vad du tyckte. Svaret öppnas i ett Google Formulär i en ny flik, du behöver inget konto." />
    )
  }

  if (status === 'sent') {
    return (
      <div className="bg-white rounded-xl border border-line p-6" role="status">
        <h2 className="text-lg font-bold text-ink mb-2">Tack för din feedback!</h2>
        <p className="text-ink-light text-sm leading-relaxed mb-5">Ditt svar är skickat. Det hjälper oss göra appen bättre.</p>
        <Link href="/planera" className="text-forest font-semibold text-sm underline underline-offset-4">
          Tillbaka till planeringen
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-line p-6 space-y-7" noValidate>
      <Question id="q-used" title="Vad hann du använda?" hint="välj det som stämmer">
        <div className="flex flex-wrap gap-2.5">
          {USED.map((u) => (
            <Choice key={u.id} selected={used.includes(u.id)} onClick={() => toggle(u.id)}>{u.label}</Choice>
          ))}
        </div>
      </Question>

      <Question id="q-unclear" title="Var något oklart, fel eller svårt? Vad?" hint="frivilligt">
        <textarea
          value={unclear}
          onChange={(e) => setUnclear(e.target.value.slice(0, 1500))}
          rows={4}
          aria-labelledby="q-unclear"
          placeholder="Skriv några rader. Skriv inga personuppgifter."
          className={inputClass}
        />
      </Question>

      <Question id="q-next" title="Skulle du vilja använda appen nästa gång du planerar mat?">
        <div className="flex flex-wrap gap-2.5 mb-3">
          {NEXT.map((n) => (
            <Choice key={n.id} selected={nextTime === n.id} onClick={() => setNextTime(nextTime === n.id ? '' : n.id)}>{n.label}</Choice>
          ))}
        </div>
        <textarea
          value={nextTimeWhy}
          onChange={(e) => setNextTimeWhy(e.target.value.slice(0, 1500))}
          rows={3}
          aria-label="Varför eller varför inte?"
          placeholder="Varför eller varför inte?"
          className={inputClass}
        />
      </Question>

      {/* Dolt fält som bara automatiska skript fyller i. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Lämna tomt
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm font-medium text-rust">
          {error} Du kan i stället{' '}
          <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            svara i Google Formulär
          </a>.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={!hasAnswer || status === 'sending'}
          className="w-full sm:w-auto bg-forest hover:bg-forest-dark text-white font-bold py-3 px-8 rounded-lg text-base min-h-[48px]
                     disabled:opacity-45 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {status === 'sending' ? 'Skickar…' : 'Skicka feedback'}
        </button>
        <p className="text-xs text-ink-light/70 mt-3 leading-relaxed">
          Du behöver inte ange namn eller e-post. Svaren skickas till Mätt &amp; Billigts ägare och används för att förbättra appen.{' '}
          <Link href="/integritet" className="underline underline-offset-2">Läs mer</Link>.
        </p>
      </div>
    </form>
  )
}
