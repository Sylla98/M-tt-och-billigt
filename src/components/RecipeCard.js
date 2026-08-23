'use client'
import { useState, useRef, useEffect } from 'react'
import { formatQuantity } from '@/utils/formatQuantity'
import { getIngredientRule, formatCountableIngredient, toRecipeViewLiquid } from '@/utils/ingredientRules'
import { getRecipeImage, FALLBACK_IMAGE } from '@/utils/getRecipeImage'

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

export default function RecipeCard({ recipe, index, showFamilyFriendlyBadge = false, open = false, onToggle }) {
  // imgState: 'primary' → försöker vald bild, 'fallback' → fallback.jpg,
  // 'none' → även fallback misslyckades, visa neutral platshållare
  const [imgState, setImgState] = useState('primary')

  // Kortets container – används för att scrolla in receptets början i vy
  // både när det öppnas OCH när det stängs (se effekten nedan).
  const articleRef = useRef(null)

  // Håller reda på föregående open-värde så effekten bara agerar vid en
  // FAKTISK övergång (öppna→stäng eller stäng→öppna), inte vid första
  // renderingen av kortet.
  const wasOpenRef = useRef(open)

  // Vid ÖPPNING kan raden byta layout (grid → stapel, se ResultView), vilket
  // flyttar var receptets övre del hamnar – särskilt tydligt för högerkort.
  // Vid STÄNGNING kollapsar samma layout tillbaka, vilket kan lämna
  // användaren långt ned på en nu mycket kortare sida (rapporterat
  // problem). Båda riktningarna löses med SAMMA robusta mönster: vänta in
  // layoutuppdateringen med requestAnimationFrame, mät sedan kortets
  // FAKTISKA position via elementets ref (inga hårdkodade pixelvärden för
  // var kortet "borde" hamna) och scrolla bara om positionen faktiskt är
  // otydlig – annars rör vi inget.
  useEffect(() => {
    const previouslyOpen = wasOpenRef.current
    wasOpenRef.current = open
    if (open === previouslyOpen) return // ingen faktisk övergång – t.ex. första renderingen

    const el = articleRef.current
    if (!el) return

    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      const headerOffset = 76 // ungefärlig höjd på den klibbiga headern + luft

      // Samma villkor fungerar åt båda hållen: ett negativt rect.top
      // (kortet hamnade ovanför synfältet, t.ex. efter att sidan blivit
      // kortare vid stängning) fångas redan av hiddenByHeader eftersom
      // headerOffset är positiv.
      const hiddenByHeader = rect.top < headerOffset
      const tooFarDown = rect.top > window.innerHeight * 0.5

      if (hiddenByHeader || tooFarDown) {
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches

        el.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        })
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [open])

  const title = recipe.title || recipe.name || 'Recept'
  const servings = recipe.servings || recipe.portions || 0
  const time = recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} min` : (recipe.time || '')
  const freezable = recipe.freezerFriendly ?? recipe.freezable ?? false
  const servedWith = recipe.servedWith || ''

  // Om samma recept lagas flera gånger under perioden (se ResultView.js
  // deduplicering) visas det tydligt, så portionerna inte ser missvisande
  // låga ut för hela periodens matbehov.
  const occurrenceCount = recipe.occurrenceCount || 1
  const servingsList = recipe.servingsList || [servings]
  const minServings = Math.min(...servingsList)
  const maxServings = Math.max(...servingsList)
  const portionsText =
    occurrenceCount <= 1
      ? `${servings} portioner`
      : minServings === maxServings
      ? `${minServings} portioner · laga ${occurrenceCount} gånger`
      : `${minServings}–${maxServings} portioner · laga ${occurrenceCount} gånger`

  // Metadata som vanlig text istället för flera färgade pills
  const metaParts = [time, portionsText, freezable ? 'kan frysas' : null].filter(Boolean)

  // Biblioteksrecept har ett eget image-fält – använd det i första hand.
  // Annars kategoribild via getRecipeImage. Fallback-kedjan är oförändrad.
  const primaryImage = recipe.image || getRecipeImage(recipe)
  const imageSrc = imgState === 'primary' ? primaryImage : FALLBACK_IMAGE

  const handleImageError = () => {
    if (imgState === 'primary' && primaryImage !== FALLBACK_IMAGE) {
      setImgState('fallback')
    } else {
      setImgState('none')
    }
  }

  // Receptvyn ska kännas naturlig – annan presentation än inköpslistan
  // (se ingredientRules.js för resonemanget bakom varje regel):
  //  - räknebara varor ("2 gula lökar", "1 vitlöksklyfta") istället för gram
  //  - vätskor som normalt mäts i dl ("2,5 dl grädde") istället för ml
  //  - allt annat visas som tidigare via formatQuantity
  const ingredients = (recipe.ingredients || []).map(ing => {
    if (typeof ing === 'string') return ing

    const rule = getIngredientRule(ing.name, ing.unit)
    if (rule.isCountable) {
      return formatCountableIngredient(ing.name, ing.quantity)
    }

    const { quantity, unit } = toRecipeViewLiquid(ing.name, ing.quantity, ing.unit)
    const formatted = formatQuantity(quantity, unit || '')
    return formatted ? `${formatted} ${ing.name}`.trim() : ing.name
  })

  const instructions = recipe.instructions || recipe.steps || []

  const storage = recipe.storage ||
    [recipe.fridgeStorage && `Kyl: ${recipe.fridgeStorage}`,
     recipe.freezerStorage && `Frys: ${recipe.freezerStorage}`]
    .filter(Boolean).join(' · ') || ''

  const panelId = `recept-${recipe.id || index}`

  return (
    // Layoutbredden (en eller två kolumner) styrs numera av ResultView –
    // den grupperar recepten radvis och byter hela radens layout till en
    // enkel stapel så snart ett kort i raden öppnas. Det gör att kortet alltid
    // expanderar på sin egen plats, oavsett om det ligger i vänster eller
    // höger kolumn.
    <article
      ref={articleRef}
      className="bg-white rounded-xl border border-line overflow-hidden
                 transition-shadow duration-150 hover:shadow-warm-md w-full
                 scroll-mt-20"
    >
      {/* Bild – dominerar kortets övre del, konsekvent 4:3 */}
      {/* Bild – 4:3 i stängt kort (oförändrat). I öppnat recept används
          istället en fast, responsiv höjd (inte aspect ratio) så bilden
          inte blir orimligt stor på breda desktop-kort: ca 240px på mobil,
          upp mot 340px på desktop. object-cover behåller samma beskärning. */}
      <div className={`relative bg-warm ${open ? 'h-[200px] md:h-[280px] lg:h-[340px]' : 'h-[200px] md:h-auto md:aspect-[4/3]'}`}>
        {imgState !== 'none' ? (
          <img
            src={imageSrc}
            alt={`Maträtt av typen ${imageCategoryLabel(imageSrc)}`}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        ) : (
          // Neutral, stilren platshållare – ingen gradient
          <div className="w-full h-full flex items-center justify-center bg-warm px-6">
            <span className="font-display text-brown-light/70 text-center leading-snug">
              {title}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5">
        <h3 className="font-display text-lg md:text-xl text-brown leading-tight mb-1.5">
          {title}
        </h3>

        {recipe.description && (
          <p className="text-sm text-brown-light leading-relaxed mb-2.5">
            {recipe.description}
          </p>
        )}

        {/* Metadata som ren text – inga färgade pills */}
        <p className="text-meta text-stone-mid">
          {metaParts.join(' · ')}
        </p>

        {servedWith && (
          <p className="text-meta text-stone-mid mt-0.5">{servedWith}</p>
        )}

        {/* Action-rad: Barnvänligt + Visa/Dölj recept hör visuellt ihop som
            en enhet (metadata + kontroll), så spacingen sitter på RADEN
            (mt-6, gap-3) istället för att vara utspridd på de enskilda
            barnen. Det ger dels tydlig separation mot beskrivning/metadata
            ovanför, dels ett jämnt, måttligt gap mellan badge och knapp –
            oavsett om badgen visas eller ej. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {recipe.childFriendly && showFamilyFriendlyBadge && (
            <p className="inline-flex items-center gap-1 text-xs font-medium
                          text-sage bg-sage/[0.08] border border-sage/20
                          rounded px-2 py-0.5">
              <span aria-hidden="true">✓</span> Barnvänligt
            </p>
          )}

          {/* CTA – textlänk med pil, konkurrerar inte med kortet. Neutral
              mörk textfärg i alla lägen (hover/fokus/klick). */}
          <button
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex items-center gap-1.5 text-sm font-semibold
                       text-brown hover:underline underline-offset-4
                       min-h-[44px] transition-colors
                       [-webkit-tap-highlight-color:transparent]"
          >
            {open ? 'Dölj recept' : 'Visa recept'}
            <span
              aria-hidden="true"
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              ↓
            </span>
          </button>
        </div>
      </div>

      {/* Öppnat recept */}
      {open && (
        <div id={panelId} className="border-t border-line px-4 md:px-5 py-5">
          {/* Desktop: 35 % ingredienser / 65 % instruktioner */}
          <div className="grid gap-6 lg:gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h4 className="text-label font-semibold text-brown mb-3 pb-2 border-b border-line">
                Ingredienser
              </h4>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-brown-light leading-snug">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-8">
              <h4 className="text-label font-semibold text-brown mb-3 pb-2 border-b border-line">
                Gör så här
              </h4>
              <ol className="space-y-3.5">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-brown-light">
                    <span className="flex-shrink-0 w-5 text-terracotta font-semibold tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="leading-relaxed max-w-[60ch]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Förvaring – sekundär information sist */}
          {storage && (
            <div className="mt-6 pt-4 border-t border-line">
              <h4 className="text-label font-semibold text-brown mb-1">Förvaring</h4>
              <p className="text-sm text-brown-light">{storage}</p>
            </div>
          )}

          {/* Sekundär stängningskontroll – slipper scrolla hela vägen upp
              för att stänga ett långt recept. Samma neutrala färglogik som
              den övre kontrollen. */}
          <div className="mt-6 pt-4 border-t border-line text-center">
            <button
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={panelId}
              aria-label="Dölj recept"
              className="inline-flex items-center gap-1.5 text-sm font-medium
                         text-brown-light hover:underline underline-offset-4
                         min-h-[44px] px-3 transition-colors
                         [-webkit-tap-highlight-color:transparent]"
            >
              <span aria-hidden="true">↑</span>
              Dölj recept
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
