// ─── Sparad plan i webbläsaren ───────────────────────────────────────────────
// Matplanen, inköpslistan och avbockningarna sparas i webbläsarens lokala lagring
// (localStorage) så att de finns kvar om besökaren laddar om sidan, stänger fliken eller
// kommer tillbaka senare (t.ex. för att handla). Inget skickas till servern eller till någon
// annan tjänst. Se integritetssidan.
//
// Tålighet: all åtkomst är inpackad i try/catch (privat läge, blockerad lagring, full
// lagring). Går något fel fungerar appen som förut, utan sparning.
//
// Konsistens: den sparade planen är en ögonblicksbild. Vid inläsning byggs recepten,
// inköpslistan och priserna om med appens nuvarande data (samma rebuildPlanData som "Byt rätt"
// använder), så att summor och kostnadsskillnader alltid stämmer med den version som körs.
// Recept som tagits bort ur biblioteket finns kvar som historiska recept (src/data/historicalRecipes.js),
// så en plan som innehåller dem återställs med samma tillfällen och avbockningar.
// Hänvisar planen ändå till ett recept som varken finns i biblioteket eller bland de historiska, kan den
// inte visas: då returneras { unavailable: true } och den lagrade planen lämnas orörd (ingen tyst
// rensning); den ersätts först när besökaren skapar en ny plan. Är planen för gammal eller trasig
// kastas den.

import { rebuildPlanData, getBaseRecipeId, findPlanRecipe } from '@/utils/selectRecipes'

export const STORAGE_KEY = 'mb_saved_plan_v1'
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 dagar
const VERSION = 1

function storage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function readEntry() {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || entry.v !== VERSION || typeof entry.savedAt !== 'number' || !entry.plan) return null
    return entry
  } catch {
    return null
  }
}

function writeEntry(entry) {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(entry))
    return true
  } catch {
    return false
  }
}

/** Tar bort den sparade planen (t.ex. vid "Ny plan"). */
export function clearSavedPlan() {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(STORAGE_KEY)
  } catch {
    /* ignoreras */
  }
}

/** Sparar en nyskapad plan. Avbockningarna nollställs. */
export function savePlan(plan, now = Date.now()) {
  const ok = writeEntry({ v: VERSION, savedAt: now, plan, checked: [] })
  if (!ok) clearSavedPlan() // lagringen full/blockerad: lämna inte kvar en äldre plans avbockningar
  return ok
}

/** Slår ihop ändrade fält (t.ex. efter "Byt rätt") i den sparade planen. Behåller tidpunkt och avbockningar. */
export function updateSavedPlan(fields) {
  const entry = readEntry()
  if (!entry) return false
  return writeEntry({ ...entry, plan: { ...entry.plan, ...fields } })
}

/** Sparar vilka inköpsrader som är avbockade. */
export function saveChecked(keys) {
  const entry = readEntry()
  if (!entry) return false
  return writeEntry({ ...entry, checked: Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : [] })
}

/** Läser de sparade avbockningarna (tom lista om inget finns). */
export function loadChecked() {
  const entry = readEntry()
  return entry && Array.isArray(entry.checked) ? entry.checked.filter((k) => typeof k === 'string') : []
}

/**
 * Läser in den sparade planen och bygger om den med appens nuvarande data.
 * Returnerar { plan, savedAt }, { unavailable: true, savedAt } (okänt recept, lagringen lämnas orörd)
 * eller null (och rensar då det som inte går att använda).
 */
export function loadSavedPlan(now = Date.now()) {
  const entry = readEntry()
  if (!entry) return null
  try {
    if (now - entry.savedAt > MAX_AGE_MS || entry.savedAt > now + 60 * 1000) throw new Error('för gammal')
    const plan = entry.plan
    const occurrences = plan.recipes
    if (!Array.isArray(occurrences) || occurrences.length === 0) throw new Error('inga recept')
    if (occurrences.some((r) => !r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id)) throw new Error('trasigt tillfälle')
    if (occurrences.some((r) => !findPlanRecipe(getBaseRecipeId(r.id)))) {
      return { unavailable: true, savedAt: entry.savedAt }
    }
    const specs = occurrences.map((r) => {
      const baseId = getBaseRecipeId(r.id)
      if (!Number.isFinite(r.servings) || r.servings <= 0) throw new Error('ogiltiga portioner')
      return { baseId, servings: r.servings }
    })
    const budget = plan.pricing?.budget
    if (!Number.isFinite(budget)) throw new Error('saknar budget')
    const rebuilt = rebuildPlanData(specs, plan.pantry || '', budget)
    return { plan: { ...plan, ...rebuilt }, savedAt: entry.savedAt }
  } catch {
    clearSavedPlan()
    return null
  }
}
