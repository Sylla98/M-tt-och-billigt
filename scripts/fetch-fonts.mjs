// ─── Hämta typsnittet Satoshi vid bygget ────────────────────────────────────
// Satoshi omfattas av ITF Free Font License (FFL). Licensen tillåter egen hosting
// på den egna webbplatsen (avsnitt 01) men förbjuder att filerna görs tillgängliga
// i publika repositories (avsnitt 02). Repot är publikt, så filerna checkas INTE in.
// I stället hämtar det här skriptet Fontshares officiella paket vid varje bygge
// (samma adress som "Download Family" på fontshare.com använder) och packar upp
// de oförändrade webbfilerna och licenstexten till public/fonts/satoshi/, som
// .gitignore utesluter. Appen serverar sedan filerna från sin egen domän
// (@font-face i src/app/globals.css), så besökarens webbläsare kontaktar aldrig
// Fontshare.
//
// Körs automatiskt före `npm run build` och `npm run dev` (prebuild/predev i
// package.json). Misslyckas hämtningen eller kontrollen avslutas skriptet med
// felkod och ett tydligt meddelande, så att bygget stoppas i stället för att
// appen publiceras utan typsnitt.
//
// Filerna kopieras byte för byte ur paketet; inget konverteras, beskärs eller
// döps om (licensen förbjuder ändringar, avsnitt 02).

import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DOWNLOAD_URL = 'https://api.fontshare.com/v2/fonts/download/satoshi'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(root, 'public', 'fonts', 'satoshi')

// Vikterna appen använder (samma som tidigare via Fontshares API: 400, 500, 700, 900).
const WEIGHTS = ['Regular', 'Medium', 'Bold', 'Black']
const WANTED = new Map([
  ...WEIGHTS.flatMap((w) => [
    [`Satoshi_Complete/Fonts/WEB/fonts/Satoshi-${w}.woff2`, { name: `Satoshi-${w}.woff2`, magic: 'wOF2' }],
    [`Satoshi_Complete/Fonts/WEB/fonts/Satoshi-${w}.woff`, { name: `Satoshi-${w}.woff`, magic: 'wOFF' }],
  ]),
  ['Satoshi_Complete/License/FFL.txt', { name: 'FFL.txt', text: 'ITF Free Font License' }],
])

function fail(message, err) {
  console.error('\n[fetch-fonts] FEL: ' + message)
  if (err) console.error('[fetch-fonts] Orsak: ' + (err.cause?.code || err.message || err))
  console.error(
    '[fetch-fonts] Bygget stoppas: Satoshi kunde inte hämtas från Fontshare\n' +
      `[fetch-fonts] (${DOWNLOAD_URL}). Kontrollera nätverket eller Fontshares status och\n` +
      '[fetch-fonts] bygg igen. Filerna får inte checkas in i repot (ITF Free Font License, avsnitt 02).\n',
  )
  process.exit(1)
}

async function allPresent() {
  try {
    await Promise.all([...WANTED.values()].map((f) => access(path.join(OUT_DIR, f.name))))
    return true
  } catch {
    return false
  }
}

// Minimal zip-läsare (central directory + deflate/stored), så att inget extra
// beroende behövs.
function readZipEntries(buf) {
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('inte en giltig zip-fil (saknar slutpost)')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const entries = new Map()
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('trasig central katalog i zip-filen')
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    entries.set(name, { method, compSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return {
    has: (name) => entries.has(name),
    read(name) {
      const e = entries.get(name)
      const lp = e.localOffset
      if (buf.readUInt32LE(lp) !== 0x04034b50) throw new Error(`trasig lokal post för ${name}`)
      const start = lp + 30 + buf.readUInt16LE(lp + 26) + buf.readUInt16LE(lp + 28)
      const data = buf.subarray(start, start + e.compSize)
      if (e.method === 0) return Buffer.from(data)
      if (e.method === 8) return inflateRawSync(data)
      throw new Error(`okänd komprimering (${e.method}) för ${name}`)
    },
  }
}

async function main() {
  if (await allPresent()) {
    console.log('[fetch-fonts] Satoshi finns redan i public/fonts/satoshi/ – hoppar över hämtning.')
    return
  }

  let zipBuf
  try {
    const res = await fetch(DOWNLOAD_URL, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    zipBuf = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    fail('kunde inte ladda ned typsnittspaketet.', err)
  }

  let zip
  try {
    zip = readZipEntries(zipBuf)
  } catch (err) {
    fail('det nedladdade paketet gick inte att läsa.', err)
  }

  await mkdir(OUT_DIR, { recursive: true })
  for (const [entry, file] of WANTED) {
    if (!zip.has(entry)) fail(`paketet saknar ${entry} (Fontshare kan ha ändrat paketets struktur).`)
    let data
    try {
      data = zip.read(entry)
    } catch (err) {
      fail(`kunde inte packa upp ${entry}.`, err)
    }
    if (file.magic && data.toString('latin1', 0, 4) !== file.magic) fail(`${file.name} är inte en giltig ${file.magic}-fil.`)
    if (file.text && !data.toString('utf8').includes(file.text)) fail(`${file.name} innehåller inte licenstexten.`)
    await writeFile(path.join(OUT_DIR, file.name), data)
  }

  const license = await readFile(path.join(OUT_DIR, 'FFL.txt'), 'utf8')
  const version = (license.match(/Version[^\n]*/) || ['okänd version'])[0].trim()
  console.log(`[fetch-fonts] Satoshi (${WEIGHTS.join(', ')}) hämtad från Fontshare till public/fonts/satoshi/ – ITF Free Font License, ${version}.`)
}

main().catch((err) => fail('oväntat fel.', err))
