// Tester för testrundan (extern testomgång): sparad plan och inköpslista i webbläsaren,
// kopiera inköpslistan, feedbacklänkarna (Google Formulär) och API-justeringen för 0 vuxna.
//
// Kör med: npm run test:swap  (kräver alias-laddaren för '@/'-importer)

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { POST: planPost } = await import('../../src/app/api/meal-plan/route.js')
const saved = await import('../../src/utils/savedPlan.js')
const sel = await import('../../src/utils/selectRecipes.js')
const { shoppingListText, buildDisplay } = await import('../../src/utils/shoppingDisplay.js')
const { RECIPES } = await import('../../src/data/recipes.js')
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// ── Hjälpmedel ───────────────────────────────────────────────────────────────
let ipCounter = 0
async function generate(body) {
  const req = new Request('http://localhost/api/meal-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.20.0.${++ipCounter}` },
    body: JSON.stringify(body),
  })
  return planPost(req)
}
const INPUT = { adults: 2, children: 1, duration: '2 veckor', budget: 2500, foodTypes: ['blandkost'], pantry: 'ris, olja', numberOfDishes: 7 }
async function makePlan(input = INPUT) {
  const res = await generate(input)
  assert.equal(res.status, 200)
  return res.json()
}
const rowSum = (plan) => Math.round(Object.values(plan.shoppingList).flatMap((c) => c.items).reduce((s, i) => s + i.lineCost, 0))

function fakeStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), _m: m }
}
const realWindow = globalThis.window
beforeEach(() => { globalThis.window = { localStorage: fakeStorage() } })
afterEach(() => { if (realWindow === undefined) delete globalThis.window; else globalThis.window = realWindow })

describe('sparad plan: planen och inköpslistan finns kvar när besökaren kommer tillbaka', () => {
  test('spara och läs in: samma recept, portioner, inköpslista, totalsumma och övriga fält', async () => {
    const plan = await makePlan()
    assert.equal(saved.savePlan(plan, 1000), true)
    const back = saved.loadSavedPlan(1000 + 60_000)
    assert.ok(back)
    assert.equal(back.savedAt, 1000)
    assert.deepEqual(back.plan.recipes.map((r) => [r.id, r.servings]), plan.recipes.map((r) => [r.id, r.servings]))
    assert.deepEqual(back.plan.shoppingList, plan.shoppingList)
    assert.equal(back.plan.pricing.estimatedTotalCost, plan.pricing.estimatedTotalCost)
    assert.equal(back.plan.totalServings, plan.totalServings)
    assert.equal(back.plan.pantry, 'ris, olja')
    assert.deepEqual(back.plan.foodTypes, ['blandkost'])
    assert.equal(back.plan.planSummary, plan.planSummary)
    assert.equal(back.plan.numberOfDays, plan.numberOfDays)
  })

  test('avbockade inköpsrader sparas och nollställs när en ny plan skapas', async () => {
    saved.savePlan(await makePlan(), 1)
    assert.deepEqual(saved.loadChecked(), [])
    saved.saveChecked(['Mejeri & ägg::Smör', 'Skafferi::Salt'])
    assert.deepEqual(saved.loadChecked(), ['Mejeri & ägg::Smör', 'Skafferi::Salt'])
    saved.savePlan(await makePlan(), 2)
    assert.deepEqual(saved.loadChecked(), [], 'ny plan = nya avbockningar')
  })

  test('efter "Byt rätt" sparas det bytta receptet, med bibehållna avbockningar och sparad tidpunkt', async () => {
    const plan = await makePlan()
    saved.savePlan(plan, 5)
    saved.saveChecked(['x::y'])
    const slot = plan.recipes[0]
    const baseId = sel.getBaseRecipeId(slot.id)
    const next = sel.selectSwapAlternatives({ foodTypes: plan.foodTypes, excludeIds: [...new Set(plan.recipes.map((r) => sel.getBaseRecipeId(r.id)))], pantryTerms: [] })[0].recipe.id
    const rebuilt = sel.rebuildPlanData(sel.buildSwapOccurrenceSpecs(plan.recipes, baseId, next), plan.pantry, plan.pricing.budget)
    assert.equal(saved.updateSavedPlan(rebuilt), true)
    const back = saved.loadSavedPlan(10)
    assert.ok(back.plan.recipes.some((r) => sel.getBaseRecipeId(r.id) === next))
    assert.ok(!back.plan.recipes.some((r) => sel.getBaseRecipeId(r.id) === baseId))
    assert.equal(back.savedAt, 5)
    assert.deepEqual(saved.loadChecked(), ['x::y'])
    assert.equal(back.plan.pricing.estimatedTotalCost, rebuilt.pricing.estimatedTotalCost)
  })

  test('inläst plan byggs om med nuvarande data: en föråldrad totalsumma rättas, och Byt rätt-skillnaden stämmer efteråt', async () => {
    const plan = await makePlan()
    const stale = JSON.parse(JSON.stringify(plan))
    stale.pricing.estimatedTotalCost += 777
    stale.shoppingList = {}
    saved.savePlan(stale, 1)
    const { plan: back } = saved.loadSavedPlan(2)
    assert.equal(back.pricing.estimatedTotalCost, plan.pricing.estimatedTotalCost)
    assert.equal(rowSum(back), back.pricing.estimatedTotalCost)
    const slot = sel.getBaseRecipeId(back.recipes[0].id)
    const next = 'kikartscurry'
    if (!back.recipes.some((r) => sel.getBaseRecipeId(r.id) === next)) {
      const delta = sel.calculateSwapCostDelta({ occurrences: back.recipes, replacedBaseId: slot, newRecipeId: next, pantryText: back.pantry, budget: back.pricing.budget, currentTotalCost: back.pricing.estimatedTotalCost })
      const swapped = sel.rebuildPlanData(sel.buildSwapOccurrenceSpecs(back.recipes, slot, next), back.pantry, back.pricing.budget)
      assert.equal(delta, rowSum(swapped) - rowSum(back))
    }
  })

  test('för gammal plan (över 30 dagar) kastas och tas bort', async () => {
    saved.savePlan(await makePlan(), 0)
    assert.ok(saved.loadSavedPlan(saved.MAX_AGE_MS - 1))
    assert.equal(saved.loadSavedPlan(saved.MAX_AGE_MS + 1), null)
    assert.equal(globalThis.window.localStorage.getItem(saved.STORAGE_KEY), null, 'rensad')
  })

  test('plan som hänvisar till ett recept som inte finns längre kastas', async () => {
    const plan = await makePlan()
    const broken = JSON.parse(JSON.stringify(plan))
    broken.recipes[0].id = 'recept-som-inte-finns'
    saved.savePlan(broken, 1)
    assert.equal(saved.loadSavedPlan(2), null)
    assert.equal(globalThis.window.localStorage.getItem(saved.STORAGE_KEY), null)
  })

  test('trasig eller okänd lagring ger null utan fel: ogiltig JSON, fel version, saknade fält, ogiltiga portioner', async () => {
    const ls = globalThis.window.localStorage
    for (const raw of ['{inte json', '{"v":99,"savedAt":1,"plan":{}}', '{"v":1,"savedAt":1}', '{"v":1,"savedAt":1,"plan":{"recipes":[]}}', 'null', '"text"']) {
      ls.setItem(saved.STORAGE_KEY, raw)
      assert.equal(saved.loadSavedPlan(2), null, raw)
    }
    const plan = await makePlan()
    const bad = JSON.parse(JSON.stringify(plan))
    bad.recipes[0].servings = 0
    saved.savePlan(bad, 1)
    assert.equal(saved.loadSavedPlan(2), null)
    const noBudget = JSON.parse(JSON.stringify(plan))
    delete noBudget.pricing.budget
    saved.savePlan(noBudget, 1)
    assert.equal(saved.loadSavedPlan(2), null)
  })

  test('lagring som inte går att använda (blockerad, full, saknas) kraschar aldrig appen', async () => {
    const plan = await makePlan()
    for (const w of [
      undefined,
      { get localStorage() { throw new Error('blockerad') } },
      { localStorage: { getItem() { throw new Error('x') }, setItem() { throw new Error('full') }, removeItem() { throw new Error('x') } } },
    ]) {
      if (w === undefined) delete globalThis.window; else globalThis.window = w
      assert.equal(saved.savePlan(plan), false)
      assert.equal(saved.updateSavedPlan({ a: 1 }), false)
      assert.equal(saved.saveChecked(['a']), false)
      assert.deepEqual(saved.loadChecked(), [])
      assert.equal(saved.loadSavedPlan(), null)
      assert.doesNotThrow(() => saved.clearSavedPlan())
    }
  })

  test('misslyckad sparning (full lagring) lämnar inte kvar en äldre plans avbockningar', async () => {
    saved.savePlan(await makePlan(), 1)
    saved.saveChecked(['gammal::avbockning'])
    const ls = globalThis.window.localStorage
    const realSet = ls.setItem
    ls.setItem = () => { throw new Error('QuotaExceededError') }
    assert.equal(saved.savePlan(await makePlan(), 2), false)
    ls.setItem = realSet
    assert.deepEqual(saved.loadChecked(), [])
    assert.equal(saved.loadSavedPlan(3), null, 'ingen gammal plan kvar att återställa')
  })

  test('"Ny plan" tar bort allt sparat', async () => {
    saved.savePlan(await makePlan(), 1)
    saved.saveChecked(['a'])
    saved.clearSavedPlan()
    assert.equal(saved.loadSavedPlan(2), null)
    assert.deepEqual(saved.loadChecked(), [])
  })

  test('sparningen ligger i en egen nyckel och rör inte samtyckesvalet', async () => {
    const ls = globalThis.window.localStorage
    ls.setItem('mb_analytics_consent', 'declined')
    saved.savePlan(await makePlan(), 1)
    saved.clearSavedPlan()
    assert.equal(ls.getItem('mb_analytics_consent'), 'declined')
    assert.notEqual(saved.STORAGE_KEY, 'mb_analytics_consent')
  })
})

describe('kopiera inköpslistan som text', () => {
  const cats = [
    { label: 'Kött & chark', items: [{ displayName: 'Nötfärs', requiredQuantity: 880, requiredUnit: 'g', packagesRequired: 2, packageAmount: 800, packageUnit: 'g', lineCost: 180 }] },
    { label: 'Grönsaker & frukt', items: [
      { displayName: 'Gul lök', requiredQuantity: 3, requiredUnit: 'st', isWeightBased: true, purchaseQuantity: 0.5, purchaseUnit: 'kg', lineCost: 12 },
      { displayName: 'Potatis', requiredQuantity: 1000, requiredUnit: 'g', isWeightBased: true, purchaseQuantity: 1, purchaseUnit: 'kg', lineCost: 15 },
      { displayName: 'Färsk basilika', packagesRequired: 2, packageLabel: { singular: 'kruka', plural: 'krukor' }, lineCost: 80 },
    ] },
    { label: 'Skafferi', items: [{ displayName: 'Salt', requiredQuantity: 3, requiredUnit: 'tsk', packagesRequired: 1, packageAmount: 1, packageUnit: 'st', lineCost: 12 }] },
  ]
  test('rubrik, totalsumma, kategorier och en rad per vara med samma text som i listan', () => {
    const text = shoppingListText(cats, [], 299)
    const lines = text.split('\n')
    assert.equal(lines[0], 'Inköpslista – Mätt & Billigt')
    assert.match(lines[1], /^Uppskattad totalsumma: ca 299 kr$/)
    assert.ok(lines.includes('Kött & chark'))
    assert.ok(lines.includes('- Nötfärs – 1,6 kg'))
    assert.ok(lines.includes('- Färsk basilika – 2 krukor'))
    assert.ok(lines.includes('- 3 gula lökar'))
    for (const cat of cats) for (const item of cat.items) {
      const { name, amount } = buildDisplay(item)
      assert.ok(lines.includes(`- ${name}${amount ? ` – ${amount}` : ''}`), name)
    }
  })
  test('avbockade varor är inte med, och en kategori utan kvarvarande varor utelämnas', () => {
    const text = shoppingListText(cats, ['Kött & chark::Nötfärs', 'Skafferi::Salt'], null)
    assert.ok(!text.includes('Nötfärs') && !text.includes('Kött & chark') && !text.includes('Salt') && !text.includes('Skafferi'))
    assert.ok(text.includes('Potatis'))
    assert.ok(!text.includes('Uppskattad totalsumma'))
  })
  test('alla avbockade → bara rubriken', () => {
    const all = cats.flatMap((c) => c.items.map((i) => `${c.label}::${i.displayName}`))
    assert.equal(shoppingListText(cats, all, null), 'Inköpslista – Mätt & Billigt')
  })
})

describe('feedback: enbart det befintliga Google Formuläret (ingen intern mottagare)', () => {
  const read = (...p) => readFileSync(path.join(root, ...p), 'utf8')
  const result = read('src', 'components', 'ResultView.js')
  const footer = read('src', 'components', 'SiteFooter.js')
  const planera = read('src', 'app', 'planera', 'page.js')

  test('en enda definition av formulärlänken, och den är den kända Google Formulär-länken', async () => {
    const link = await import('../../src/utils/feedbackLink.js')
    assert.equal(link.FEEDBACK_FORM_URL, 'https://forms.gle/GEG39fV4MtKDkPbs5')
    assert.match(link.FEEDBACK_FORM_NOTE, /Google Formulär/)
    assert.match(link.FEEDBACK_FORM_NOTE, /ny flik/)
    const hits = []
    const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/\.(js|mjs)$/.test(e.name)) { if (readFileSync(f, 'utf8').includes('forms.gle')) hits.push(path.relative(root, f)) } } }
    walk(path.join(root, 'src'))
    assert.deepEqual(hits, ['src/utils/feedbackLink.js'], 'länken får bara stå på ett ställe')
  })

  test('knappen i resultatvyn och länken i sidfoten öppnar länken i ny flik med noopener, och sidfotslänken visas bara på planeringssidan', () => {
    assert.match(result, /href=\{FEEDBACK_FORM_URL\}[\s\S]{0,120}target="_blank"[\s\S]{0,80}rel="noopener noreferrer"/)
    assert.match(result, /\{FEEDBACK_FORM_NOTE\}/, 'tydlig information om att den går till Google Formulär')
    assert.match(result, />\s*Lämna feedback\s*</)
    assert.match(footer, /href=\{FEEDBACK_FORM_URL\}[\s\S]{0,120}target="_blank"[\s\S]{0,80}rel="noopener noreferrer"/)
    assert.match(footer, /showFeedback = false/, 'av som standard (startsidan och integritetssidan)')
    assert.match(planera, /<SiteFooter[^>]*showFeedback/)
  })

  test('fast feedbackknapp: samma länk i ny flik, fast längst upp i mitten på startsidan och planeringssidan, ingen växling eller extra sidfotsplats', () => {
    const fab = readFileSync(path.join(root, 'src', 'components', 'FeedbackFab.js'), 'utf8')
    const home = readFileSync(path.join(root, 'src', 'app', 'page.js'), 'utf8')
    const css = readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf8')
    assert.match(fab, /href=\{FEEDBACK_FORM_URL\}[\s\S]{0,80}target="_blank"[\s\S]{0,60}rel="noopener noreferrer"/)
    assert.match(fab, /Lämna feedback\s*<span[^>]*>↗<\/span>/, 'texten "Lämna feedback ↗"')
    assert.doesNotMatch(fab, /posthog|track|capture|localStorage|fetch\(/i, 'knappen skickar och sparar inget')
    assert.match(home, /<FeedbackFab \/>/)
    assert.match(planera, /<FeedbackFab \/>/)
    assert.match(planera, /<\/div>\s*\{\/\* Footer \*\/\}[\s\S]*<FeedbackFab \/>/, 'ligger utanför innehållet som döljs tills sparad plan lästs in')
    const rule = css.match(/\.feedback-fab\s*\{([^}]*)\}/)
    assert.ok(rule, 'regel för .feedback-fab finns')
    assert.match(rule[1], /position:\s*fixed/)
    assert.match(rule[1], /top:\s*max\([^)]*env\(safe-area-inset-top\)\)/, 'följer safe area')
    assert.match(rule[1], /left:\s*50%/); assert.match(rule[1], /translateX\(-50%\)/)
    assert.match(rule[1], /z-index:\s*60/, 'över modalerna (z-50)')
    assert.doesNotMatch(rule[1], /bottom|right\s*:/, 'inget nedre eller högra läge')
    const mobile = css.match(/@media \(max-width: 599px\)\s*\{[\s\S]*?\n\}/)
    assert.ok(mobile, 'särskild regel för smal skärm')
    assert.match(mobile[0], /\.feedback-fab\s*\{[^}]*left:\s*auto[^}]*right:\s*calc\([^)]*env\(safe-area-inset-right\)\)[^}]*top:\s*max\([^)]*env\(safe-area-inset-top\)\)[^}]*transform:\s*none/, 'förskjuten åt höger, fast högst upp')
    assert.match(mobile[0], /\.feedback-fab::after\s*\{[^}]*inset:/, 'större tryckyta än knappen')
    assert.doesNotMatch(mobile[0], /bottom/, 'aldrig nedtill')
    assert.doesNotMatch(css, /:has\(\[aria-modal/, 'ingen växling när modal öppnas')
    assert.doesNotMatch(css, /footer-clear-fab|--fab-bottom/, 'ingen extra sidfotsplats eller lyft för tidigare placering')
    assert.doesNotMatch(fab + home + planera, /footer-clear-fab|PANEL_SELECTOR|ResizeObserver/)
  })

  test('sidfotslänken döljs inte bakom den fasta statistikpanelen: sidfoten lämnar plats under sig medan första valet visas', () => {
    const css = readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf8')
    assert.match(footer, /showFeedback \? 'footer-above-consent'/, 'klassen sitter bara på sidfoten med feedbacklänk')
    assert.match(css, /html\[data-consent='open'\] \.footer-above-consent\s*\{\s*padding-bottom:\s*22rem/)
  })

  test('ingen intern feedbackmottagare finns kvar: inga routes, sidor, komponenter, miljövariabler eller anrop', () => {
    for (const gone of [['src', 'app', 'feedback'], ['src', 'app', 'api', 'feedback'], ['src', 'components', 'FeedbackForm.js'], ['src', 'utils', 'feedback.js']]) {
      assert.equal(existsSync(path.join(root, ...gone)), false, gone.join('/'))
    }
    const all = [result, footer, planera, read('src', 'app', 'integritet', 'page.js'), read('.env.local.example'), read('TESTRUNDA.md')].join('\n')
    assert.doesNotMatch(all, /api\/feedback|FEEDBACK_WEBHOOK|Apps Script|href="\/feedback"/)
  })
})

describe('plan-API: 0 vuxna (formuläret tillåter det) och orimliga värden', () => {
  test('0 vuxna + barn ger en plan; 0 personer och negativa/ogiltiga värden nekas med begripligt fel', async () => {
    const ok = await generate({ ...INPUT, adults: 0, children: 2 })
    assert.equal(ok.status, 200)
    const plan = await ok.json()
    assert.equal(rowSum(plan), plan.pricing.estimatedTotalCost)
    assert.ok(plan.totalServings > 0)
    const none = await generate({ ...INPUT, adults: 0, children: 0 })
    assert.equal(none.status, 400)
    assert.match((await none.json()).error, /minst en person/)
    const tooMany = await generate({ ...INPUT, adults: 0, children: 1, duration: '1 vecka', budget: 1000, numberOfDishes: 10 })
    assert.equal(tooMany.status, 400)
    assert.match((await tooMany.json()).error, /för få portioner/)
    for (const bad of [{ adults: -1 }, { adults: 21 }, { adults: 1.5 }, { children: -1 }, { budget: 50 }, { numberOfDishes: 6 }, { duration: 'en dag' }]) {
      assert.equal((await generate({ ...INPUT, ...bad })).status, 400, JSON.stringify(bad))
    }
  })
})

describe('testflöde: ett urval av alla kombinationer formuläret tillåter ger giltiga, konsekventa planer', () => {
  const DISHES = { '1 vecka': [5, 7], '2 veckor': [5, 7, 10], '1 månad': [7, 10, 14] }
  const BUDGET = { '1 vecka': [500, 3000], '2 veckor': [500, 5000], '1 månad': [1000, 10000] }
  const TYPES = [[], ['vegetariskt'], ['kott-gront', 'familjevanligt'], ['proteinrikt', 'somrigt'], ['vegetariskt', 'familjevanligt'], ['blandkost']]
  const HH = [[1, 0], [2, 1], [4, 2], [0, 2], [6, 3]]
  test('statuskod, antal unika rätter, totalsumma = radsumma, inga ogiltiga kostnader, rimliga portioner', async () => {
    let n = 0
    for (const [duration, dl] of Object.entries(DISHES)) for (const numberOfDishes of dl) for (const budget of BUDGET[duration]) for (const [adults, children] of HH) for (const foodTypes of TYPES) {
      const body = { adults, children, duration, budget, foodTypes, pantry: n % 3 === 0 ? 'ris, pasta, lök' : '', numberOfDishes }
      n++
      const res = await generate(body)
      const tag = JSON.stringify(body)
      assert.equal(res.status, 200, tag)
      const d = await res.json()
      assert.equal(new Set(d.recipes.map((r) => sel.getBaseRecipeId(r.id))).size, numberOfDishes, tag)
      assert.equal(rowSum(d), d.pricing.estimatedTotalCost, tag)
      assert.ok(Object.values(d.shoppingList).flatMap((c) => c.items).every((i) => Number.isFinite(i.lineCost) && i.lineCost >= 0), tag)
      assert.ok(d.recipes.every((r) => Number.isFinite(r.servings) && r.servings >= 1 && RECIPES.some((x) => x.id === sel.getBaseRecipeId(r.id))), tag)
      assert.equal(d.pricing.isWithinBudget, d.pricing.estimatedTotalCost <= budget, tag)
      assert.equal(d.totalServings, d.recipes.reduce((s, r) => s + r.servings, 0), tag)
    }
    assert.ok(n > 400)
  })
})
