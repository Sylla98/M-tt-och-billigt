import './globals.css'
import { PostHogProvider } from './providers'

export const metadata = {
  title: 'Mätt & Billigt – Matplan som räcker',
  description: 'Få en billig matplan som faktiskt räcker. Skriv vad du behöver och få recept, inköpslista och portionskontroll.',
}

// Sätter html[data-consent="open"] före första målningen när statistikvalet
// kommer att visas (ingen sparad ja/nej-markering), så startsidan får rätt
// avstånd direkt utan att hoppa. Ingen effekt om statistik är avstängd i
// miljön. Följer samma regler som analyticsConsent.js: bara "granted" och
// "declined" räknas som ett val.
const CONSENT_LAYOUT_SCRIPT =
  "try{var v=localStorage.getItem('mb_analytics_consent');" +
  "if(v!=='granted'&&v!=='declined')document.documentElement.setAttribute('data-consent','open')}" +
  "catch(e){document.documentElement.setAttribute('data-consent','open')}"

export default function RootLayout({ children }) {
  return (
    // data-scroll-behavior="smooth": globals.css har scroll-behavior: smooth på
    // html. Utan attributet låter Next 16 den gälla även vid sidbyte, så nya
    // sidan animeras upp från förra scrollpositionen. Med attributet stänger
    // Next av den under navigeringen, som i Next 14.
    <html lang="sv" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
          <script dangerouslySetInnerHTML={{ __html: CONSENT_LAYOUT_SCRIPT }} />
        )}
        {/* Typsnitt: Satoshi serveras från appens egen domän (@font-face i globals.css,
            filerna hämtas vid bygget av scripts/fetch-fonts.mjs). Rubrikerna använder
            systemtypsnittet Georgia. Inga anrop till Fontshare från webbläsaren. */}
      </head>
      <body className="bg-page min-h-screen font-body antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
