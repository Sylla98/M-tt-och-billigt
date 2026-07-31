// ─── Val av receptbild ───────────────────────────────────────────────────────
// Väljer en fast, lokal bild ur public/recipe-images/ baserat på receptets
// namn, beskrivning och ingredienser. Inga externa anrop, ingen AI-generering
// – stabilt och snabbt.
//
// Prioritetsordning: mer specifika rätttyper kontrolleras FÖRE bredare
// kategorier, så att t.ex. "Kycklingcurry" får curry.jpg (rätttypen) snarare
// än chicken.jpg (råvaran). Ordningen i IMAGE_RULES är därför betydelsebärande.

const IMAGE_RULES = [
  // Specifika rätttyper först
  { image: 'pancakes.jpg',     keywords: ['pannkak', 'plättar', 'crêpe', 'crepe'] },
  { image: 'soup.jpg',         keywords: ['soppa'] },
  { image: 'curry.jpg',        keywords: ['curry', 'masala', 'tikka', 'korma'] },
  { image: 'oven-dish.jpg',    keywords: ['gratäng', 'gratang', 'lasagne', 'ugnsbakad', 'ugnspannkaka', 'ugn'] },
  { image: 'stew.jpg',         keywords: ['gryta', 'stroganoff', 'gulasch', 'chili con', 'ragu'] },
  { image: 'pasta.jpg',        keywords: ['pasta', 'spaghetti', 'makaron', 'penne', 'tagliatelle', 'carbonara', 'bolognese'] },
  { image: 'rice.jpg',         keywords: ['risotto', 'risrätt', 'paella', 'biryani', 'stekt ris'] },
  { image: 'salad.jpg',        keywords: ['sallad', 'bowl'] },
  { image: 'breakfast.jpg',    keywords: ['frukost', 'gröt', 'grot', 'müsli', 'musli', 'granola'] },
  // Baljväxter/vegetariskt före kött (fångar linsgrytor m.m. som redan
  // missat "gryta" ovan – och vegetariska rätter generellt)
  { image: 'beans-lentils.jpg', keywords: ['lins', 'kikärt', 'kikart', 'böno', 'bona', 'bönbiff', 'falafel'] },
  { image: 'vegetarian.jpg',   keywords: ['vegetarisk', 'vegansk', 'tofu', 'halloumi', 'grönsak', 'zucchini', 'aubergine'] },
  // Råvarubaserade kategorier sist
  { image: 'minced-meat.jpg',  keywords: ['köttfärs', 'kottfars', 'köttbulla', 'köttbullar', 'färsbiff', 'tacos', 'tacogratäng', 'burgare', 'järpar'] },
  { image: 'chicken.jpg',      keywords: ['kyckling', 'chicken'] },
  { image: 'fish.jpg',         keywords: ['lax', 'torsk', 'fisk', 'sej', 'räk', 'skaldjur'] },
]

export const FALLBACK_IMAGE = '/recipe-images/fallback.jpg'

/**
 * Väljer bildväg för ett recept.
 * @param {object} recipe - { title, description, ingredients: [{name}] }
 * @returns {string} sökväg under /public, t.ex. "/recipe-images/pasta.jpg"
 */
export function getRecipeImage(recipe) {
  if (!recipe) return FALLBACK_IMAGE

  // Titeln väger tyngst – kontrollera den först i sin helhet mot alla regler
  const title = (recipe.title || recipe.name || '').toLowerCase()
  for (const rule of IMAGE_RULES) {
    if (rule.keywords.some((kw) => title.includes(kw))) {
      return `/recipe-images/${rule.image}`
    }
  }

  // Därefter beskrivning + ingrediensnamn
  const ingredientText = (recipe.ingredients || [])
    .map((i) => (typeof i === 'string' ? i : i.name || ''))
    .join(' ')
  const rest = `${recipe.description || ''} ${ingredientText}`.toLowerCase()
  for (const rule of IMAGE_RULES) {
    if (rule.keywords.some((kw) => rest.includes(kw))) {
      return `/recipe-images/${rule.image}`
    }
  }

  return FALLBACK_IMAGE
}
