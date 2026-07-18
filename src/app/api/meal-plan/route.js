import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIdentifier } from '@/utils/rateLimit'

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
// ~800 tokens per recept + ~1500 för inköpslista/metadata. God marginal.
function maxTokensForDishes(n) {
  return Math.min(16000, n * 900 + 2000)
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

  if (!data.shoppingList || typeof data.shoppingList !== 'object') {
    errors.push('Inköpslista saknas')
  }

  const totalServings = data.totalServings ||
    data.recipes.reduce((s, r) => s + (r.servings || 0), 0)
  if (totalServings < requiredServings) {
    errors.push(`Portioner räcker inte: ${totalServings} < ${requiredServings} som krävs`)
  }

  return errors
}

// ─── JSON-schema för strukturerade svar ──────────────────────────────────────
const MEAL_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['planSummary', 'numberOfDays', 'estimatedCost', 'totalServings',
             'requiredServings', 'pantryItemsUsed', 'recipes', 'shoppingList', 'freshItemsTips'],
  properties: {
    planSummary:      { type: 'string' },
    numberOfDays:     { type: 'integer' },
    estimatedCost:    { type: 'integer' },
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
      type: 'object',
      additionalProperties: false,
      required: ['meat', 'dairy', 'vegetables', 'canned', 'pasta', 'pantry'],
      properties: {
        meat:       { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
        dairy:      { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
        vegetables: { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
        canned:     { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
        pasta:      { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
        pantry:     { type: 'object', additionalProperties: false, required: ['label','emoji','items'], properties: { label: {type:'string'}, emoji: {type:'string'}, items: {type:'array', items:{type:'string'}} } },
      },
    },
  },
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
- Håll dig inom budgeten
- Matkategorin MÅSTE synas tydligt i receptvalen
- Familjevänligt = ALLA recept childFriendly: true
- planSummary: skriv "Beräknad kostnad" – lova inte exakta priser
- Alla texter på SVENSKA
- Receptbeskrivningar: max 1 mening. Instruktioner: korta och tydliga steg. Ingen utfyllnadstext.`
}

// ─── Användarprompt ───────────────────────────────────────────────────────────
function buildUserPrompt(adults, children, duration, budget, foodTypes, pantry, numberOfDishes, requiredServings, days) {
  const childFriendly = foodTypes.includes('familjevanligt')
  const categories = foodTypes.length > 0 ? foodTypes.join(', ') : 'blandkost'
  return `Skapa matplan:
FAMILJ: ${adults} vuxna, ${children} barn | PERIOD: ${duration} (${days} dagar)
BUDGET: ${budget} kr | KATEGORIER: ${categories}
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
