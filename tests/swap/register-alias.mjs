// Gör att Node kan importera appens egna moduler som använder '@/'-aliaset
// (jsconfig.json: "@/*" → "./src/*"), så testerna kör de RIKTIGA modulerna
// (route.js, selectRecipes.js, referencePricing.js) och inte kopior.
import { register } from 'node:module'
register('./alias-hooks.mjs', import.meta.url)
