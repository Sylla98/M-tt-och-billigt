'use client'
import { useState } from 'react'
import RecipeCard from './RecipeCard'
import ShoppingList from './ShoppingList'

function FeedbackBox() {
  const [picked, setPicked] = useState(null)
  const options = [
    { id: 'good', emoji: '👍', label: 'Bra' },
    { id: 'bad', emoji: '👎', label: 'Inte bra' },
    { id: 'missing', emoji: '💬', label: 'Saknar något' },
  ]
  return (
    <div className="bg-white rounded-3xl shadow-warm-md p-6 text-center animate-slide-up-delay-3">
      <h3 className="font-semibold text-brown mb-4">Vad tyckte du om matplanen?</h3>
      <div className="flex justify-center gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setPicked(opt.id)}
            className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-medium transition-all duration-150
              ${picked === opt.id
                ? 'bg-terracotta text-white shadow-warm-sm scale-105'
                : 'bg-stone-warm text-brown-light hover:bg-stone-mid/30'}`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>
      {picked && (
        <p className="text-xs text-stone-mid mt-4">Tack för din feedback! 💛</p>
      )}
    </div>
  )
}

export default function ResultView({ data, onReset }) {
  const {
    recipes = [],
    shoppingList = {},
    freshItemsTips = [],
    totalServings = 0,
    estimatedCost = 0,
    numberOfDays = 14,
    childFriendly = false,
    planSummary = '',
  } = data

  const budgetOk = estimatedCost > 0

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Success banner */}
      <div className="bg-terracotta rounded-3xl p-6 text-white text-center animate-slide-up shadow-warm-lg">
        <div className="text-3xl mb-2">🎉</div>
        <h2 className="text-2xl font-display font-semibold mb-1">
          Din matplan är klar!
        </h2>
        <p className="text-terracotta-light/90 text-sm">
          {recipes.length} recept · Komplett inköpslista · Portionskontroll
        </p>
      </div>

      {/* Child-friendly banner */}
      {childFriendly && (
        <div className="bg-sage-light/25 rounded-3xl p-5 flex items-center gap-4 border border-sage-light/50 animate-slide-up">
          <span className="text-3xl">👨‍👩‍👧</span>
          <div>
            <div className="font-semibold text-brown">Alla recept är anpassade för barn.</div>
            <div className="text-xs text-brown-light mt-0.5">Milda smaker som hela familjen kan äta tillsammans.</div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up-delay-1">
        <div className="bg-white rounded-3xl shadow-warm-md p-5 col-span-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <span className="font-semibold text-brown">Räcker i {numberOfDays} dagar</span>
          </div>
          <span className="text-sage text-xl">✅</span>
        </div>

        <div className="bg-white rounded-3xl shadow-warm-md p-5">
          <div className="text-xs text-stone-mid mb-1">Portioner planerade</div>
          <div className="text-2xl font-display font-bold text-brown">{totalServings}</div>
        </div>

        <div className="bg-white rounded-3xl shadow-warm-md p-5">
          <div className="text-xs text-stone-mid mb-1">Beräknad kostnad</div>
          <div className="text-2xl font-display font-bold text-brown">
            {estimatedCost.toLocaleString('sv-SE')} kr
          </div>
        </div>

        {budgetOk && (
          <div className="bg-sage-light/20 rounded-3xl p-4 col-span-2 flex items-center justify-center gap-2 text-sage font-medium text-sm">
            ✅ Håller budget
          </div>
        )}
      </div>

      {/* Plan summary */}
      {planSummary && (
        <div className="bg-warm rounded-3xl p-5 animate-slide-up-delay-1">
          <p className="text-sm text-brown-light leading-relaxed">{planSummary}</p>
        </div>
      )}

      {/* Recipes */}
      <div className="animate-slide-up-delay-2">
        <h3 className="text-xl font-display text-brown font-semibold mb-3 px-1">
          👨‍🍳 Dina recept
        </h3>
        <p className="text-sm text-stone-mid mb-4 px-1">Tryck på "Visa recept" för ingredienser och steg</p>
        <div className="space-y-3">
          {recipes.map((recipe, i) => (
            <RecipeCard key={recipe.id || i} recipe={recipe} index={i} />
          ))}
        </div>
      </div>

      {/* Shopping list */}
      <ShoppingList shoppingList={shoppingList} freshItemsTips={freshItemsTips} />

      {/* Feedback */}
      <FeedbackBox />

      {/* Google Form feedback */}
      {/* ⬇️ BYT UT LÄNKEN HÄR när du har din riktiga Google Forms-länk */}
      <div className="bg-terracotta/8 border border-terracotta/20 rounded-3xl p-6 text-center animate-slide-up-delay-3">
        <h3 className="font-display text-xl font-semibold text-brown mb-2">
          Hjälp oss förbättra appen ❤️
        </h3>
        <p className="text-sm text-brown-light mb-5 leading-relaxed">
          Det tar mindre än en minut att svara. Din feedback hjälper oss bygga en bättre tjänst.
        </p>
        <a
          href="https://forms.gle/ERSATT_MED_MIN_LANK"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-terracotta hover:bg-terracotta-dark text-white font-semibold
                     py-3.5 px-8 rounded-2xl text-base
                     transition-all duration-200 active:scale-[0.98] shadow-warm-md hover:shadow-warm-lg"
        >
          Lämna feedback
        </a>
      </div>

      {/* Reset */}
      <div className="text-center pb-4 animate-slide-up-delay-3">
        <button
          onClick={onReset}
          className="text-brown-light hover:text-terracotta transition-colors text-sm underline underline-offset-2"
        >
          ← Skapa en ny matplan
        </button>
      </div>
    </div>
  )
}
