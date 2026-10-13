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
    <html lang="sv" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && (
          <script dangerouslySetInnerHTML={{ __html: CONSENT_LAYOUT_SCRIPT }} />
        )}
        {/* Satoshi (UI-typsnitt, dominerar hela gränssnittet) och Boska
            (används enbart för logotyp + startsidans hero-rubrik) via
            Fontshares API – licensierade fritt för kommersiellt bruk
            (ITF Free Font License). preconnect minskar den upplevda
            laddningstiden; display=swap gör att text alltid syns direkt
            i ett reservtypsnitt medan webbtypsnittet hämtas. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=boska@500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream min-h-screen font-body antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
