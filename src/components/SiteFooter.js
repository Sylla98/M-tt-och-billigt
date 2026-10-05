import Link from 'next/link'
import AnalyticsSettingsButton from '@/components/AnalyticsSettingsButton'

const footerLinkClass =
  'text-ink-light hover:text-forest underline underline-offset-2 transition-colors'

/**
 * Gemensam sidfot. Samma text och stil som tidigare, plus länkar till
 * integritetsinformationen och till valet om produktstatistik.
 * widthClass styr innehållets maxbredd så att sidfoten linjerar med sidan.
 */
export default function SiteFooter({ widthClass = 'max-w-[1100px]', className = '' }) {
  return (
    <footer className={`border-t border-line ${className}`}>
      <div
        className={`${widthClass} mx-auto px-4 py-5 text-xs text-ink-light/70
                    flex flex-wrap items-center justify-between gap-x-6 gap-y-2`}
      >
        <p>Mätt &amp; Billigt · Hjälper svenska familjer äta gott för mindre</p>
        <nav aria-label="Integritet" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/integritet" className={footerLinkClass}>
            Integritet
          </Link>
          <AnalyticsSettingsButton className={footerLinkClass} />
        </nav>
      </div>
    </footer>
  )
}
