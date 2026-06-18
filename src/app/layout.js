import './globals.css'

export const metadata = {
  title: 'Mätt & Billigt – Matplan som räcker',
  description: 'Få en billig matplan som faktiskt räcker. Skriv vad du behöver och få recept, inköpslista och portionskontroll.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body className="bg-cream min-h-screen font-body antialiased">
        {children}
      </body>
    </html>
  )
}
