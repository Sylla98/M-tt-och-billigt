'use client'

// Sidfotens länk "Ändra val för statistik". Visas bara när statistik över
// huvud taget kan vara aktiv i den här miljön (NEXT_PUBLIC_ENABLE_ANALYTICS);
// annars finns inget val att ändra. Knappen kan finnas på flera ställen på
// samma sida (innehåll + sidfot) och har därför inget id; panelen kommer
// ihåg vilken knapp som öppnade den, se analyticsConsent.js.
import { useEffect, useState } from 'react'
import { isAnalyticsEnabled } from '@/utils/analytics'
import { setConsentPanelRequested } from '@/utils/analyticsConsent'

export default function AnalyticsSettingsButton({ className = '' }) {
  // Monteras först på klienten – samma markup på server och klient.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !isAnalyticsEnabled()) return null

  return (
    <button
      type="button"
      onClick={(e) => setConsentPanelRequested(true, e.currentTarget)}
      className={className}
    >
      Ändra val för statistik
    </button>
  )
}
