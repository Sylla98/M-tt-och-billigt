'use client'

// Sidfotens länk "Ändra val för statistik". Visas bara när statistik över
// huvud taget kan vara aktiv i den här miljön (NEXT_PUBLIC_ENABLE_ANALYTICS);
// annars finns inget val att ändra.
import { useEffect, useState } from 'react'
import { isAnalyticsEnabled } from '@/utils/analytics'
import { setConsentPanelRequested } from '@/utils/analyticsConsent'

export const ANALYTICS_SETTINGS_BUTTON_ID = 'analytics-settings-button'

export default function AnalyticsSettingsButton({ className = '' }) {
  // Monteras först på klienten – samma markup på server och klient.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !isAnalyticsEnabled()) return null

  return (
    <button
      id={ANALYTICS_SETTINGS_BUTTON_ID}
      type="button"
      onClick={() => setConsentPanelRequested(true)}
      className={className}
    >
      Ändra val för statistik
    </button>
  )
}
