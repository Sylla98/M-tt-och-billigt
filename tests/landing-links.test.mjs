// Statisk regressionsspärr för startsidans ingångar till /planera.
//
// Detta är en TEXTKONTROLL av src/app/page.js (filen innehåller JSX och kan
// inte importeras direkt i Node), inte ett körande test av klicken. Att
// händelsen faktiskt skickas exakt en gång per klick och bara efter ja är
// verifierat separat i webbläsare mot en lokal PostHog-attrapp.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(path.join(here, '..', 'src', 'app', 'page.js'), 'utf8')

// Alla JSX-öppningstaggar på sidan som pekar på /planera.
const planeraTags = [...source.matchAll(/<(\w+)\b[^>]*?href="\/planera"[^>]*>/g)].map((m) => ({
  name: m[1],
  text: m[0],
}))

describe('startsidans länkar till /planera', () => {
  test('det finns exakt två ingångar (rubrikradens knapp och hjältens knapp)', () => {
    assert.equal(planeraTags.length, 2)
  })

  test('båda är TrackedLink – ingen vanlig <Link> eller <a> som hoppar över spårningen', () => {
    for (const tag of planeraTags) {
      assert.equal(tag.name, 'TrackedLink', `Ospårad ingång till /planera: ${tag.text}`)
    }
  })

  test('båda skickar den befintliga händelsen landing_cta_clicked, inga andra eventnamn', () => {
    for (const tag of planeraTags) {
      assert.match(tag.text, /eventName="landing_cta_clicked"/)
    }
  })

  test('texten "/planera" förekommer exakt två gånger i filen (fångar även href med enkla citattecken eller uttryck)', () => {
    assert.equal((source.match(/\/planera/g) || []).length, 2)
  })

  test('startsidan har inga egna trackEvent-anrop eller eventparametrar (allt går via TrackedLink)', () => {
    assert.doesNotMatch(source, /trackEvent\(/)
    assert.doesNotMatch(source, /properties=/)
  })
})
