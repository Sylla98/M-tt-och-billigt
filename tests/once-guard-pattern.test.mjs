// Testar LOGIKEN i det "en gång per session"-mönster som används för:
//  - planning_started (hasTrackedPlanningStartedRef i planera/page.js)
//  - shopping_list_viewed (hasTrackedViewRef i ShoppingList.js)
//
// Detta är en isolerad återskapning av mönstret (boolesk flagga i en
// stängning/ref), INTE ett test av de faktiska React-komponenterna – det
// skulle kräva en renderare (t.ex. React Testing Library), vilket är precis
// den typen av stort nytt testramverk uppdraget bad oss undvika. Se
// slutrapporten för vad som är verifierat så här kontra genom kodgranskning.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

function createOnceGuard(action) {
  let fired = false
  return () => {
    if (fired) return
    fired = true
    action()
  }
}

describe('"En gång per session"-mönstret', () => {
  test('flera anrop på SAMMA guard triggar handlingen exakt en gång (skyddar mot dubbelregistrering)', () => {
    let calls = 0
    const guarded = createOnceGuard(() => { calls++ })

    guarded()
    guarded()
    guarded()

    assert.equal(calls, 1)
  })

  test('anrop i annan ordning/från olika håll ändrar inte utfallet – fortfarande exakt en gång', () => {
    let calls = 0
    const guarded = createOnceGuard(() => { calls++ })

    // Simulerar t.ex. att användaren både rör budgetreglaget OCH klickar
    // "Fortsätt" innan någon av dem hunnit "vinna" – motsvarar de sju
    // anropsställena för markPlanningStarted() i InputForm.js.
    guarded()
    guarded()

    assert.equal(calls, 1)
  })

  test('en NY guard-instans (en äkta ommontering, t.ex. "Ny plan") börjar om från noll', () => {
    let calls = 0
    const guardedForFirstVisit = createOnceGuard(() => { calls++ })
    guardedForFirstVisit()

    // Motsvarar INTE "Försök igen" (som numera delar SAMMA guard, se
    // planera/page.js) utan en genuint ny sidsession.
    const guardedForNewSession = createOnceGuard(() => { calls++ })
    guardedForNewSession()

    assert.equal(calls, 2)
  })
})
