import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import FeedbackForm from '@/components/FeedbackForm'

export const metadata = {
  title: 'Feedback – Mätt & Billigt',
  description: 'Berätta kort vad du tyckte om Mätt & Billigt.',
}

export default function FeedbackPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-cream/90">
        <div className="max-w-[660px] mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="font-display font-semibold text-ink text-[1.0625rem] tracking-tight">
            Mätt &amp; Billigt
          </Link>
          <Link href="/planera" className="text-sm font-medium text-ink-light hover:text-forest transition-colors py-1.5 px-2">
            Till planeringen
          </Link>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[660px] mx-auto px-4 pt-8 pb-14">
        <h1 className="font-display font-semibold text-ink text-[1.75rem] md:text-3xl leading-tight mb-2">
          Vad tyckte du?
        </h1>
        <p className="text-ink-light text-[0.9375rem] leading-relaxed mb-6">
          Tre korta frågor. Det tar någon minut och du behöver inget konto.
        </p>
        <FeedbackForm />
      </div>

      <SiteFooter widthClass="max-w-[660px]" />
    </main>
  )
}
