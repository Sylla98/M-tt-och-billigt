'use client'
import RecipeCard from './RecipeCard'
import ShoppingList from './ShoppingList'

export default function ResultView({ data, onReset }) {
  const {
    recipes = [],
    shoppingList = {},
    freshItemsTips = [],
    totalServings = 0,
    numberOfDays = 14,
    childFriendly = false,
    planSummary = '',
    pricing = null,
  } = data

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

        {pricing && (
          <div className="bg-white rounded-3xl shadow-warm-md p-5">
            <div className="text-xs text-stone-mid mb-1">Uppskattad inköpskostnad</div>
            <div className="text-2xl font-display font-bold text-brown">
              cirka {Math.round(pricing.estimatedTotalCost).toLocaleString('sv-SE')} kr
            </div>
          </div>
        )}

        {pricing && (
          <div className={`rounded-3xl p-4 col-span-2 flex items-center justify-center gap-2 font-medium text-sm text-center ${
            pricing.isWithinBudget ? 'bg-sage-light/20 text-sage' : 'bg-terracotta/10 text-terracotta-dark'
          }`}>
            {pricing.isWithinBudget
              ? `✅ Planen ligger cirka ${Math.round(Math.abs(pricing.budgetDifference)).toLocaleString('sv-SE')} kr under din budget.`
              : `⚠️ Planen uppskattas överstiga din budget med cirka ${Math.round(Math.abs(pricing.budgetDifference)).toLocaleString('sv-SE')} kr.`}
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

      {/* Google Form feedback */}
      <div className="bg-terracotta/8 border border-terracotta/20 rounded-3xl p-6 text-center animate-slide-up-delay-3">
        <h3 className="font-display text-xl font-semibold text-brown mb-2">
          Hjälp oss förbättra appen ❤️
        </h3>
        <p className="text-sm text-brown-light mb-5 leading-relaxed">
          Det tar mindre än en minut att svara. Din feedback hjälper oss bygga en bättre tjänst.
        </p>
        <a
          href="https://forms.gle/M5PvhoAFESmbyxZh7"
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
