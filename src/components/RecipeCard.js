'use client'
import { useState } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'
import { getRecipeImage, FALLBACK_IMAGE } from '@/utils/getRecipeImage'

// Gradienter används som visuell reservlösning om en bildfil saknas/inte
// kan laddas – ingen trasig bildikon ska någonsin visas.
const GRADIENTS = [
  'from-terracotta to-ochre',
  'from-ochre to-sage',
  'from-sage to-ochre-light',
  'from-terracotta-light to-terracotta-dark',
  'from-ochre-light to-terracotta',
  'from-sage to-terracotta',
  'from-ochre to-terracotta-light',
]

// Svenska kategorietiketter för alt-texten, härledda ur bildens filnamn.
// Ren presentationslogik – själva bildvalet (getRecipeImage) är oförändrat.
const IMAGE_CATEGORY_LABELS = {
  'pasta.jpg': 'pasta',
  'soup.jpg': 'soppa',
  'stew.jpg': 'gryta',
  'curry.jpg': 'curry',
  'rice.jpg': 'risrätt',
  'salad.jpg': 'sallad',
  'vegetarian.jpg': 'vegetarisk rätt',
  'chicken.jpg': 'kycklingrätt',
  'minced-meat.jpg': 'köttfärsrätt',
  'fish.jpg': 'fiskrätt',
  'pancakes.jpg': 'pannkakor',
  'breakfast.jpg': 'frukost',
  'oven-dish.jpg': 'ugnsrätt',
  'beans-lentils.jpg': 'baljväxträtt',
  'fallback.jpg': 'matlagning',
}

function imageCategoryLabel(imageSrc) {
  const filename = (imageSrc || '').split('/').pop()
  return IMAGE_CATEGORY_LABELS[filename] || 'matlagning'
}

export default function RecipeCard({ recipe, index }) {
  const [open, setOpen] = useState(false)
  // imgState: 'primary' → försöker vald bild, 'fallback' → fallback.jpg,
  // 'none' → även fallback misslyckades, visa gradient
  const [imgState, setImgState] = useState('primary')
  const delay = `animate-slide-up-delay-${Math.min(index + 1, 5)}`

  const title = recipe.title || recipe.name || 'Recept'
  const servings = recipe.servings || recipe.portions || 0
  const time = recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} min` : (recipe.time || '')
  const freezable = recipe.freezerFriendly ?? recipe.freezable ?? false
  const servedWith = recipe.servedWith || ''
  const gradient = GRADIENTS[index % GRADIENTS.length]

  const primaryImage = getRecipeImage(recipe)
  const imageSrc = imgState === 'primary' ? primaryImage : FALLBACK_IMAGE

  const handleImageError = () => {
    if (imgState === 'primary' && primaryImage !== FALLBACK_IMAGE) {
      setImgState('fallback')
    } else {
      setImgState('none')
    }
  }

  const ingredients = (recipe.ingredients || []).map(ing => {
    if (typeof ing === 'string') return ing
    const formatted = formatQuantity(ing.quantity, ing.unit || '')
    return formatted ? `${formatted} ${ing.name}`.trim() : ing.name
  })

  const instructions = recipe.instructions || recipe.steps || []

  const storage = recipe.storage ||
    [recipe.fridgeStorage && `Kyl: ${recipe.fridgeStorage}`,
     recipe.freezerStorage && `Frys: ${recipe.freezerStorage}`]
    .filter(Boolean).join(' · ') || ''

  return (
    <div className={`bg-white rounded-3xl shadow-warm-md overflow-hidden ${delay}`}>
      {/* Image area – medvetet nedtonad: bilderna är generella kategori-
          bilder ("inspirationsbilder"), inte foton av den exakta rätten */}
      <div className="relative h-28 md:h-32 overflow-hidden">
        {imgState !== 'none' ? (
          <img
            src={imageSrc}
            alt={`Inspirationsbild för recepttypen ${imageCategoryLabel(imageSrc)}`}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}
        <span className="absolute bottom-2 left-3 bg-black/35 text-white/90 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          Inspirationsbild
        </span>
        {freezable && (
          <span className="absolute top-3 right-3 bg-white/90 text-blue-500 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            ❄️ Kan frysas
          </span>
        )}
      </div>

      {/* Compact meal card info */}
      <div className="p-5">
        <h3 className="text-xl font-display text-brown font-semibold leading-tight mb-1">
          {title}
        </h3>
        {recipe.description && (
          <p className="text-xs text-stone-mid mb-1 leading-relaxed">{recipe.description}</p>
        )}
        {servedWith && (
          <p className="text-sm text-stone-mid mb-3">{servedWith}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {servings > 0 && (
            <span className="inline-flex items-center gap-1 bg-sage-light/30 text-sage px-2.5 py-0.5 rounded-full text-xs font-medium">
              🍽 {servings} portioner
            </span>
          )}
          {time && (
            <span className="inline-flex items-center gap-1 bg-ochre-light/30 text-brown-light px-2.5 py-0.5 rounded-full text-xs font-medium">
              ⏱ {time}
            </span>
          )}
          {(recipe.childFriendly) && (
            <span className="inline-flex items-center gap-1 bg-sage-light/30 text-sage px-2.5 py-0.5 rounded-full text-xs font-medium">
              👧 Barnvänligt
            </span>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="w-full bg-warm hover:bg-stone-warm text-brown font-medium py-3 rounded-xl
                     transition-colors duration-150 flex items-center justify-center gap-2 text-sm"
        >
          {open ? 'Dölj recept' : 'Visa recept'}
          <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>↓</span>
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-stone-warm">
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Ingredients */}
            <div>
              <h4 className="font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-terracotta text-white rounded-full flex items-center justify-center text-xs">🛒</span>
                Ingredienser
              </h4>
              <ul className="space-y-1.5">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brown-light">
                    <span className="w-1.5 h-1.5 bg-terracotta rounded-full mt-1.5 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="font-semibold text-brown mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-sage text-white rounded-full flex items-center justify-center text-xs">👩‍🍳</span>
                Gör så här
              </h4>
              <ol className="space-y-3">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-brown-light">
                    <span className="flex-shrink-0 w-5 h-5 bg-stone-warm text-brown rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Storage */}
          {storage && (
            <div className="px-6 pb-5">
              <div className="bg-warm rounded-2xl px-4 py-3 flex items-center gap-3">
                <span>🕐</span>
                <span className="text-sm text-brown-light">
                  <strong className="text-brown">Hållbarhet:</strong> {storage}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
