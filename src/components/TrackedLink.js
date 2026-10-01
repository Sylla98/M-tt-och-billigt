'use client'
import Link from 'next/link'
import { trackEvent } from '@/utils/analytics'

/**
 * Wrapper runt next/link som skickar ett analytics-event vid klick, innan
 * navigeringen sker. Gör det möjligt att hålla page.js som en vanlig
 * server-komponent trots att bara EN länk på sidan behöver vara interaktiv.
 */
export default function TrackedLink({ eventName, onClick, ...props }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackEvent(eventName)
        onClick?.(e)
      }}
    />
  )
}
