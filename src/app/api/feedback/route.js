// ─── Feedback från testare ───────────────────────────────────────────────────
// Tar emot ett kort feedbacksvar (utan konto, namn eller e-post) och vidarebefordrar det till en
// mottagare som ägaren själv har konfigurerat: FEEDBACK_WEBHOOK_URL (t.ex. ett Google Apps Script
// som skriver en rad i ett Google Kalkylark; se TESTRUNDA.md). Appen sparar ingenting själv och
// skickar aldrig svaren till statistiktjänsten (PostHog).
//
// GET  → { enabled } (om en mottagare är konfigurerad; formuläret visas bara då)
// POST → validerar, begränsar frekvensen och skickar vidare. 503 om ingen mottagare är konfigurerad.
//
// Svarstexten loggas inte (fritext kan innehålla personuppgifter); bara utfall loggas.

import { webhookUrl, limited, validateFeedback, MAX_BODY } from '@/utils/feedback'

function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
}

export async function GET() {
  return Response.json({ enabled: Boolean(webhookUrl()) })
}

export async function POST(request) {
  const target = webhookUrl()
  if (!target) return Response.json({ error: 'Feedbackformuläret är inte aktiverat just nu.' }, { status: 503 })

  if (limited(clientIp(request))) {
    return Response.json({ error: 'Du har skickat flera svar på kort tid. Försök igen om en stund.' }, { status: 429 })
  }

  let body
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY) return Response.json({ error: 'Svaret är för långt.' }, { status: 413 })
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Ogiltigt svar.' }, { status: 400 })
  }

  // Dolt fält som bara automatiska skript fyller i: låtsas att det gick bra, skicka inget vidare.
  if (body && typeof body.website === 'string' && body.website.trim() !== '') return Response.json({ ok: true })

  const checked = validateFeedback(body)
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

  const ua = request.headers.get('user-agent') || ''
  const payload = {
    receivedAt: new Date().toISOString(),
    build: (process.env.VERCEL_GIT_COMMIT_SHA || 'lokal').slice(0, 7),
    environment: process.env.VERCEL_ENV || 'lokal',
    device: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobil' : 'dator',
    ...checked.value,
  }

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    // Ett Google Apps Script som kastar fel svarar ofta 200 med en HTML-felsida: räkna det som misslyckat.
    const reply = await res.text().catch(() => '')
    if (!res.ok || /^\s*<(!doctype|html)/i.test(reply)) {
      console.error(`[feedback] mottagaren svarade ${res.ok ? 'med en felsida' : res.status}`)
      return Response.json({ error: 'Det gick inte att skicka just nu. Försök igen om en stund.' }, { status: 502 })
    }
    console.log('[feedback] svar skickat vidare')
    return Response.json({ ok: true })
  } catch (err) {
    console.error(`[feedback] kunde inte skicka vidare: ${err.name}`)
    return Response.json({ error: 'Det gick inte att skicka just nu. Försök igen om en stund.' }, { status: 502 })
  }
}
