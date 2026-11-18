const fs = require('node:fs')
const path = require('node:path')
const { PHASE_PRODUCTION_BUILD } = require('next/constants')

// Satoshi hämtas vid bygget av scripts/fetch-fonts.mjs (prebuild) och får inte ligga i
// repot (ITF Free Font License). Om bygget körs utan prebuild, t.ex. med ett ändrat
// Build Command i Vercel, stoppas det här i stället för att appen publiceras utan typsnitt.
function assertSatoshiFonts() {
  const dir = path.join(__dirname, 'public', 'fonts', 'satoshi')
  const files = ['Regular', 'Medium', 'Bold', 'Black'].map((w) => `Satoshi-${w}.woff2`).concat('FFL.txt')
  const missing = files.filter((f) => !fs.existsSync(path.join(dir, f)))
  if (missing.length > 0) {
    throw new Error(
      `[next.config] Typsnittsfilerna saknas i public/fonts/satoshi/ (${missing.join(', ')}). ` +
        'Kör bygget med "npm run build" så att scripts/fetch-fonts.mjs körs först.',
    )
  }
}

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) assertSatoshiFonts()
  return {}
}
