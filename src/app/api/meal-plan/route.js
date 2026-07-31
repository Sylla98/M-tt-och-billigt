import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIdentifier } from '@/utils/rateLimit'
import { priceShoppingListWithReference } from '@/utils/referencePricing'

// ─── Portionsberäkning ────────────────────────────────────────────────────────
const PORTIONS_PER_ADULT_PER_DAY = 3   // frukost + lunch + middag
const PORTIONS_PER_CHILD_PER_DAY = 2   // barn äter mindre
const MARGIN_FACTOR = 1.1               // 10% marginal

function calculateRequiredServings(adults, children, days) {
  const raw = (adults * PORTIONS_PER_ADULT_PER_DAY + children * PORTIONS_PER_CHILD_PER_DAY) * days
  return Math.ceil(raw * MARGIN_FACTOR)
}

function durationToDays(duration) {
  if (duration === '1 vecka') return 7
  if (duration === '2 veckor') return 14
  if (duration === '1 månad') return 30
  return 14
}

// ─── max_tokens baserat på antal rätter ───────────────────────────────────────
// ~800 tokens per recept + ~2500 för inköpslista/metadata (inköpslistans rader
// är nu strukturerade objekt med displayName+searchTerm, något mer text än
// tidigare enkla strängar). God marginal.
function maxTokensForDishes(n) {
  return Math.min(16000, n * 900 + 2500)
}

// ─── Input-validering ─────────────────────────────────────────────────────────
function validateInput(body) {
  const errors = []
  const { adults, children, duration, budget, foodTypes, pantry, numberOfDishes } = body

  if (!Number.isInteger(adults) || adults < 1 || adults > 20) errors.push('Ogiltigt antal vuxna')
  if (!Number.isInteger(children) || children < 0 || children > 20) errors.push('Ogiltigt antal barn')
  if (!['1 vecka', '2 veckor', '1 månad'].includes(duration)) errors.push('Ogiltig period')
  if (!Number.isFinite(budget) || budget < 100 || budget > 100000) errors.push('Ogiltig budget')
  if (!Array.isArray(foodTypes)) errors.push('Ogiltiga matkategorier')
  if (typeof pantry !== 'string' || pantry.length > 500) errors.push('Skafferiet är för långt')
  if (![5, 7, 10, 14].includes(numberOfDishes)) errors.push('Ogiltigt antal rätter')

  return errors
}

// ─── AI-svarsvalidering ───────────────────────────────────────────────────────
function validateAIResponse(data, expectedDishes, requiredServings) {
  const errors = []

  if (!data || typeof data !== 'object') return ['Ogiltigt JSON-svar']
  if (!Array.isArray(data.recipes)) return ['Recept saknas i svaret']

  if (data.recipes.length !== expectedDishes) {
    errors.push(`Fel antal recept: fick ${data.recipes.length}, förväntade ${expectedDishes}`)
  }

  const names = data.recipes.map(r => (r.title || '').toLowerCase()).filter(Boolean)
  const uniqueNames = new Set(names)
  if (uniqueNames.size !== names.length) errors.push('Dubbla receptnamn hittades')

  for (const recipe of data.recipes) {
    if (!recipe.title) errors.push('Recept saknar namn')
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      errors.push(`${recipe.title || 'Okänt recept'} saknar ingredienser`)
    }
    if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      errors.push(`${recipe.title || 'Okänt recept'} saknar instruktioner`)
    }
    for (const ing of (recipe.ingredients || [])) {
      if (ing.quantity == null) {
        errors.push(`Ingrediens "${ing.name}" i ${recipe.title} saknar mängd`)
      }
    }
  }

  if (!Array.isArray(data.shoppingList)) {
    errors.push('Inköpslista saknas eller har fel format')
  } else {
    for (const item of data.shoppingList) {
      if (!item.displayName) errors.push('En vara i inköpslistan saknar displayName')
      if (!item.searchTerm) errors.push(`Vara "${item.displayName || '?'}" saknar searchTerm`)
      if (item.quantity == null) errors.push(`Vara "${item.displayName || '?'}" saknar quantity`)
    }
  }

  const totalServings = data.totalServings ||
    data.recipes.reduce((s, r) => s + (r.servings || 0), 0)
  if (totalServings < requiredServings) {
    errors.push(`Portioner räcker inte: ${totalServings} < ${requiredServings} som krävs`)
  }

  return errors
}

// ─── JSON-schema för strukturerade svar ──────────────────────────────────────
// OBS: estimatedCost finns INTE med här. AI:n får aldrig skapa priser eller
// totalkostnad – det beräknas uteslutande i backend mot den interna
// referensprislistan (se priceShoppingListWithReference).
//
// shoppingList är medvetet en ENKEL PLATT LISTA (inte 6 separata kategori-
// objekt). Tidigare bäddades samma 4-fälts item-schema in sex gånger – en
// gång per kategori – vilket dubblerade schemat kraftigt i den utgående
// payloaden (JSON har inga referenser, så varje inbäddning kopieras i sin
// helhet). Backend grupperar den platta listan i kategorier efteråt.
const SHOPPING_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName', 'searchTerm', 'quantity', 'unit', 'category'],
  properties: {
    displayName: { type: 'string' }, // visas för användaren, t.ex. "Gul lök"
    searchTerm:  { type: 'string' }, // normaliserad sökterm för prissättning, t.ex. "gul lök"
    quantity:    { type: 'number' },
    unit:        { type: 'string' },
    category:    { type: 'string' }, // fri text, t.ex. "kött", "mejeri", "grönsaker" – backend grupperar
  },
}

const MEAL_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['planSummary', 'numberOfDays', 'totalServings',
             'requiredServings', 'pantryItemsUsed', 'recipes', 'shoppingList', 'freshItemsTips'],
  properties: {
    planSummary:      { type: 'string' },
    numberOfDays:     { type: 'integer' },
    totalServings:    { type: 'integer' },
    requiredServings: { type: 'integer' },
    pantryItemsUsed:  { type: 'array', items: { type: 'string' } },
    freshItemsTips:   { type: 'array', items: { type: 'string' } },
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'servings', 'cookingTimeMinutes',
                   'childFriendly', 'freezerFriendly', 'servedWith',
                   'ingredients', 'instructions', 'fridgeStorage', 'freezerStorage'],
        properties: {
          id:                 { type: 'integer' },
          title:              { type: 'string' },
          description:        { type: 'string' },
          servings:           { type: 'integer' },
          cookingTimeMinutes: { type: 'integer' },
          childFriendly:      { type: 'boolean' },
          freezerFriendly:    { type: 'boolean' },
          servedWith:         { type: 'string' },
          fridgeStorage:      { type: 'string' },
          freezerStorage:     { type: 'string' },
          instructions: { type: 'array', items: { type: 'string' } },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'quantity', 'unit'],
              properties: {
                name:     { type: 'string' },
                quantity: { type: 'number' },
                unit:     { type: 'string' },
              },
            },
          },
        },
      },
    },
    shoppingList: {
      type: 'array',
      items: SHOPPING_ITEM_SCHEMA,
    },
  },
}

// ─── Lokal kontrollfunktion: räknar schemats komplexitet ──────────────────────
// Räknar valfria fält (properties som inte finns med i "required") och
// unionfält (anyOf/oneOf/type-arrayer). Loggar bara totalsiffror, aldrig
// hela schemat eller AI-svar, och bara i utvecklingsläge.
function auditSchemaComplexity(schema) {
  let strictObjects = 0
  let properties = 0
  let optional = 0
  let unions = 0

  function walk(node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node.type)) unions++
    if (node.anyOf || node.oneOf) unions++
    if (node.type === 'object' && node.properties) {
      if (node.additionalProperties === false) strictObjects++
      const required = new Set(node.required || [])
      for (const key of Object.keys(node.properties)) {
        properties++
        if (!required.has(key)) optional++
        walk(node.properties[key])
      }
    }
    if (node.type === 'array' && node.items) walk(node.items)
  }

  walk(schema)
  return { strictObjects, properties, optional, unions }
}

if (process.env.NODE_ENV !== 'production') {
  const complexity = auditSchemaComplexity(MEAL_PLAN_SCHEMA)
  console.log(
    `[meal-plan] Schemakontroll – strikta objekt: ${complexity.strictObjects}, ` +
    `fält totalt: ${complexity.properties}, valfria fält: ${complexity.optional}, unionfält: ${complexity.unions}`
  )
}

// ─── Kategorisering av inköpsvaror ────────────────────────────────────────────
// AI:n returnerar en enkel platt lista (för att hålla schemat litet – se ovan).
// Backend grupperar den i samma fasta kategorier som frontend redan förväntar
// sig, så att den kombinerade slutprodukten till frontend är oförändrad.
const CATEGORY_DEFS = {
  meat:       { label: 'Kött & chark',         emoji: '🥩', keywords: ['kött', 'fläsk', 'nötfärs', 'nötkött', 'kyckling', 'fisk', 'chark', 'korv', 'bacon', 'lax', 'skinka', 'blandfärs', 'fläskfärs', 'kycklingfärs'] },
  dairy:      { label: 'Mejeri & ägg',         emoji: '🧀', keywords: ['mejeri', 'mjölk', 'ost', 'grädde', 'yoghurt', 'ägg', 'smör', 'fil', 'crème', 'créme'] },
  vegetables: { label: 'Grönsaker & frukt',    emoji: '🧅', keywords: ['grönsak', 'frukt', 'lök', 'potatis', 'morot', 'paprika', 'tomat', 'sallad', 'vitlök', 'citron'] },
  canned:     { label: 'Konserver & torrvaror', emoji: '🥫', keywords: ['konserv', 'burk', 'böna', 'lins', 'kokosmjölk', 'tomatsås', 'puré'] },
  pasta:      { label: 'Pasta, ris & bröd',    emoji: '🍚', keywords: ['pasta', 'ris', 'nudlar', 'bröd', 'mjöl', 'gryn', 'flingor', 'couscous'] },
  pantry:     { label: 'Skafferi',             emoji: '🫙', keywords: ['krydd', 'olja', 'skafferi', 'socker', 'salt', 'fond', 'vinäger', 'senap', 'ketchup'] },
}

function categorizeItem(item) {
  // Kolla AI:ns category-fält först – det är den mest tillförlitliga signalen.
  // Om vi skulle skanna displayName/searchTerm samtidigt riskerar bredare
  // nyckelord (t.ex. "tomat") att felaktigt matcha "Krossade tomater" som
  // grönsak istället för konserv. Category-fältet ensamt undviker det.
  const categoryText = (item.category || '').toLowerCase()
  for (const [key, def] of Object.entries(CATEGORY_DEFS)) {
    if (def.keywords.some((kw) => categoryText.includes(kw))) return key
  }
  // Ingen träff i category – prova namn/sökterm som reservlösning
  const nameText = `${item.displayName || ''} ${item.searchTerm || ''}`.toLowerCase()
  for (const [key, def] of Object.entries(CATEGORY_DEFS)) {
    if (def.keywords.some((kw) => nameText.includes(kw))) return key
  }
  return 'pantry' // säker standard om inget nyckelord matchar
}

function groupShoppingListByCategory(flatItems) {
  const grouped = {}
  for (const key of Object.keys(CATEGORY_DEFS)) {
    grouped[key] = { label: CATEGORY_DEFS[key].label, emoji: CATEGORY_DEFS[key].emoji, items: [] }
  }
  for (const item of flatItems || []) {
    const key = categorizeItem(item)
    grouped[key].items.push({
      displayName: item.displayName,
      searchTerm: item.searchTerm,
      quantity: item.quantity,
      unit: item.unit,
    })
  }
  return grouped
}

// ─── Systemprompt – kompakt ───────────────────────────────────────────────────
function buildSystemPrompt() {
  return `Du är en expert på svensk matplanering för familjer med begränsad budget.
Svara ENBART med JSON – inga förklaringar, inga kodblock.

KRAV:
- Unika recept, inga upprepningar
- Alla ingredienser måste ha quantity (tal) och unit (g/ml/st/msk/tsk/dl/kg/l)
- Ingredienser användaren har hemma ska EJ finnas i shoppingList
- totalServings >= requiredServings
- Matkategorin MÅSTE synas tydligt i receptvalen
- Familjevänligt = ALLA recept childFriendly: true
- Alla texter på SVENSKA
- Receptbeskrivningar: max 1 mening. Instruktioner: korta och tydliga steg. Ingen utfyllnadstext.
- planSummary: kort text om SJÄLVA MATPLANEN (variation, stil) – nämn INTE pris, kostnad eller budget. Det hanteras separat.

VIKTIGT OM PRISER:
- Du ska ALDRIG ange priser, kostnader eller totalsummor. Det är förbjudet.
- shoppingList är en ENKEL PLATT LISTA (inga kategoriobjekt). Varje rad ska ha:
  displayName (t.ex. "Gul lök"), searchTerm (kort råvarusökterm, t.ex. "gul lök" – 
  ALDRIG färdigrätt/kokt/dryck om ingrediensen är en råvara), quantity, unit,
  och category (fri text, t.ex. "kött", "mejeri", "grönsaker", "konserver", "pasta", "skafferi")
- Slå ihop mängder av samma ingrediens från ALLA recept till EN rad i shoppingList`
}

// ─── Användarprompt ───────────────────────────────────────────────────────────
function buildUserPrompt(adults, children, duration, budget, foodTypes, pantry, numberOfDishes, requiredServings, days) {
  const childFriendly = foodTypes.includes('familjevanligt')
  const categories = foodTypes.length > 0 ? foodTypes.join(', ') : 'blandkost'
  return `Skapa matplan:
FAMILJ: ${adults} vuxna, ${children} barn | PERIOD: ${duration} (${days} dagar)
RIKTVÄRDE BUDGET: ${budget} kr (välj prisvärda råvaror – exakt kostnad räknas separat, inte av dig)
KATEGORIER: ${categories}
BARNVÄNLIGT: ${childFriendly ? 'Ja – ALLA childFriendly: true' : 'Nej'}
ANTAL RÄTTER: exakt ${numberOfDishes} unika
HAR HEMMA: ${pantry || 'inget'}
requiredServings: ${requiredServings} – totalServings MÅSTE vara >= ${requiredServings}`
}

// ─── Huvud-handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now()

  // Rate limiting – körs FÖRST, innan input tolkas eller Anthropic anropas
  const clientId = getClientIdentifier(request)
  const rateLimitResult = checkRateLimit(clientId)
  if (rateLimitResult.limited) {
    console.warn(`[meal-plan] Rate limit överskriden – väntetid ${rateLimitResult.retryAfterSeconds}s`)
    return Response.json(
      { error: 'Du har genererat flera matplaner på kort tid. Vänta några minuter och försök igen.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) } }
    )
  }

  try {
    const body = await request.json()
    const inputErrors = validateInput(body)
    if (inputErrors.length > 0) {
      return Response.json({ error: inputErrors.join(', ') }, { status: 400 })
    }

    const { adults, children, duration, budget, foodTypes, pantry, numberOfDishes } = body
    const days = durationToDays(duration)
    const requiredServings = calculateRequiredServings(adults, children, days)
    const maxTok = maxTokensForDishes(numberOfDishes)

    console.log(`[meal-plan] START – ${numberOfDishes} rätter, ${days} dagar, maxTokens=${maxTok}`)

    // Snabb kontroll: en saknad nyckel kan aldrig lösas genom att försöka igen
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[meal-plan] ANTHROPIC_API_KEY saknas i miljövariablerna. Kontrollera .env.local (lokalt) eller Vercel → Settings → Environment Variables.')
      return Response.json(
        { error: 'Tjänsten är inte korrekt konfigurerad just nu. Försök igen om en stund.' },
        { status: 500 }
      )
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(
      adults, children, duration, budget, foodTypes, pantry, numberOfDishes, requiredServings, days
    )

    // ── Anropsfunktion med strukturerade svar ──────────────────────────────
    async function callAI(attempt, extraInstruction = '') {
      let response
      try {
        response = await client.beta.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTok,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt + (extraInstruction ? '\n\nKORRIGERA: ' + extraInstruction : ''),
        }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: MEAL_PLAN_SCHEMA,
          },
        },
        betas: ['output-128k-2025-02-19'],
        })
      } catch (apiErr) {
        // HTTP 400 = felaktig API-konfiguration – retry hjälper inte, avbryt direkt
        if (apiErr.status === 400) {
          console.error(`[meal-plan] API 400 invalid_request_error: ${apiErr.message}`)
          throw new Error('API_CONFIG_ERROR: ' + apiErr.message)
        }
        throw apiErr
      }

      const stopReason = response.stop_reason
      const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const charLength = rawText.length

      // Diagnostiklogg – ingen API-nyckel loggas
      console.log(`[meal-plan] Försök ${attempt} – stop_reason=${stopReason} modell=claude-sonnet-4-6 längd=${charLength} tecken`)

      if (stopReason === 'max_tokens') {
        console.error(`[meal-plan] AVKLIPPT svar (max_tokens). Öka maxTokens eller minska antal rätter.`)
        throw new Error('TRUNCATED')
      }

      // Rensa eventuella markdown-kodblock (defensivt, borde inte behövas med structured outputs)
      const cleaned = rawText.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim()

      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (jsonErr) {
        const preview = rawText.slice(0, 200)
        const truncated = rawText.length < charLength
        console.error(`[meal-plan] JSON parse-fel: ${jsonErr.message}`)
        console.error(`[meal-plan] Svarsbörjan: ${preview}`)
        console.error(`[meal-plan] Verkar avklippt: ${truncated}`)
        throw new Error(`JSON_PARSE: ${jsonErr.message}`)
      }

      return parsed
    }

    // ── Första försöket ────────────────────────────────────────────────────
    let data
    let parseError = null

    try {
      data = await callAI(1)
    } catch (err) {
      parseError = err.message
      console.error(`[meal-plan] Första försöket misslyckades: ${parseError}`)

      // API-konfigurationsfel – retry hjälper inte
      if (parseError.startsWith('API_CONFIG_ERROR')) {
        return Response.json(
          { error: 'Tekniskt fel i konfigurationen. Kontakta supporten.' },
          { status: 500 }
        )
      }

      // ── Korrigeringsförsök ─────────────────────────────────────────────
      try {
        data = await callAI(2, `Tidigare fel: ${parseError}. Generera ett komplett, korrekt JSON-svar.`)
      } catch (retryErr) {
        console.error(`[meal-plan] Korrigeringsförsöket misslyckades: ${retryErr.message}`)
        const userMsg = retryErr.message === 'TRUNCATED'
          ? 'Svaret blev för långt. Prova med färre rätter.'
          : 'AI-svaret kunde inte tolkas. Försök igen.'
        return Response.json({ error: userMsg }, { status: 502 })
      }
    }

    // ── Validera ───────────────────────────────────────────────────────────
    let validationErrors = validateAIResponse(data, numberOfDishes, requiredServings)

    if (validationErrors.length > 0) {
      console.warn(`[meal-plan] Valideringsfel efter försök 1: ${validationErrors.join('; ')}`)
      try {
        data = await callAI(2, `Valideringsfel: ${validationErrors.join('; ')}. Rätta och returnera komplett JSON.`)
        validationErrors = validateAIResponse(data, numberOfDishes, requiredServings)
      } catch (retryErr) {
        console.error(`[meal-plan] Valideringskorrigering misslyckades: ${retryErr.message}`)
        return Response.json(
          { error: 'Det gick inte att generera en giltig matplan. Försök igen.' },
          { status: 502 }
        )
      }
    }

    if (validationErrors.length > 0) {
      console.error(`[meal-plan] Kvarstående valideringsfel: ${validationErrors.join('; ')}`)
      return Response.json(
        { error: 'Matplanen uppfyller inte alla krav. Försök igen.' },
        { status: 502 }
      )
    }

    // ── Lägg till metadata ─────────────────────────────────────────────────
    data.requiredServings = requiredServings
    data.childFriendly = foodTypes.includes('familjevanligt')
    data.numberOfDays = days

    // AI:n får aldrig avgöra priser – ta bort eventuella kvarblivna fält defensivt
    delete data.estimatedCost

    // ── Prissättning mot intern referensprislista ───────────────────────────
    // AI:n har bara skapat matplan + en enkel platt inköpslista. Gruppera den
    // i kategorier och prissätt varje rad mot referensprislistan – helt lokalt,
    // inga externa anrop. AI:ns svar styr aldrig totalsumman.
    const groupedShoppingList = groupShoppingListByCategory(data.shoppingList)
    const pricingResult = priceShoppingListWithReference(groupedShoppingList)

    console.log(
      `[meal-plan] Referensprissättning klar – uppskattad totalkostnad=${pricingResult.estimatedTotalCost} kr`
    )

    data.shoppingList = pricingResult.shoppingList

    const estimatedTotalCost = pricingResult.estimatedTotalCost
    const budgetDifference = estimatedTotalCost - budget
    const isWithinBudget = estimatedTotalCost <= budget

    data.pricing = {
      budget,
      estimatedTotalCost,
      budgetDifference,
      isWithinBudget,
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[meal-plan] KLAR på ${elapsed}s – ${data.recipes.length} recept, ${data.totalServings} portioner`)

    return Response.json(data)

  } catch (err) {
    console.error(`[meal-plan] Oväntat fel: ${err.message}`)
    return Response.json(
      { error: 'Något gick fel. Kontrollera din anslutning och försök igen.' },
      { status: 500 }
    )
  }
}
