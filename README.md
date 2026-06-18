# 🥘 Mätt & Billigt – MVP

En enkel AI-matplansapp för svenska familjer.

## Starta lokalt

```bash
# 1. Gå in i mappen
cd matt-och-billigt

# 2. Installera beroenden
npm install

# 3. Starta dev-servern
npm run dev

# 4. Öppna i webbläsaren
# http://localhost:3000
```

## Filstruktur

```
src/
├── app/
│   ├── layout.js        # HTML-skal, metadata
│   ├── page.js          # Huvudsida – styr state (idle/loading/done)
│   └── globals.css      # Tailwind + animationer
├── components/
│   ├── InputForm.js     # Textfält + CTA-knapp
│   ├── ResultView.js    # Omslag för hela resultatet
│   ├── RecipeCard.js    # Expanderbart receptkort
│   ├── ShoppingList.js  # Avbockningsbar inköpslista
│   └── QualityCheck.js  # Grön checklistesummering
└── data/
    └── mockData.js      # All mock-data (byts mot API-svar)
```

## Koppla in riktig AI (nästa steg)

### 1. Skapa API-route

Skapa filen `src/app/api/meal-plan/route.js`:

```js
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req) {
  const { userInput } = await req.json()
  
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Du är en matplaneringsexpert för svenska familjer med begränsad budget.
      
Användarens situation: ${userInput}

Svara ENDAST med ett JSON-objekt i exakt samma format som detta:
{ portionControl: {...}, recipes: [...], shoppingList: {...}, freshItems: [...], qualityCheck: {...} }

Generera en komplett, realistisk matplan med 5 recept.`
    }]
  })
  
  const jsonText = message.content[0].text
  const data = JSON.parse(jsonText)
  return Response.json(data)
}
```

### 2. Lägg till API-nyckel

Skapa `.env.local`:
```
ANTHROPIC_API_KEY=din-nyckel-här
```

### 3. Uppdatera page.js

Ersätt `setTimeout`-blocket i `handleSubmit` med:

```js
const handleSubmit = async (input) => {
  setState('loading')
  try {
    const res = await fetch('/api/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: input })
    })
    const data = await res.json()
    setResult(data)
    setState('done')
  } catch (err) {
    console.error(err)
    setState('idle')
  }
}
```

### 4. Installera SDK
```bash
npm install @anthropic-ai/sdk
```

Det är allt! Hela appen är redan byggd – du byter bara ut mocken mot ett riktigt API-anrop.
