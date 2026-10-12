import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(srcDir, specifier.slice(2))
    const candidates = [base, `${base}.js`, path.join(base, 'index.js')]
    const file = candidates.find((c) => existsSync(c) && !c.endsWith(path.sep))
    if (file && /\.js$/.test(file)) {
      return nextResolve(pathToFileURL(file).href, context)
    }
  }
  return nextResolve(specifier, context)
}
