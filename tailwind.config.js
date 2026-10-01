/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Boska ger sidans STORA rubrik (startsidans hero, InputForms
        // "Slipp tänka på maten", ResultViews "Din matplan") och receptens
        // namn karaktär och värme – "editorial" i praktiken.
        // Satoshi bär allt funktionellt UI: navigation, formulär, knappar,
        // stegtitlar, metadata, produktinformation. Tydlig, konsekvent
        // regel istället för att blanda friare – ger den typografiska
        // kontrast som Koncept A 2.0 efterfrågar.
        display: ['Boska', 'Georgia', 'serif'],
        body: ['Satoshi', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['Satoshi', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Bakgrund och rena ytor
        cream: '#FAF8F3',
        surface: '#FFFDF9',

        // Text – mörk grafit
        ink: '#302D29',
        'ink-light': '#6B6862',

        // Varumärke – skogsgrön. Nu appens PRIMÄRA interaktionsfärg (CTA:er,
        // valda tillstånd, progress, fokus) OCH identitet – till skillnad
        // från Koncept C där en separat kobolt bar interaktionen. Se till
        // att inte falla tillbaka i "allt är grönt" (Koncept A 1.0:s
        // problem): apricot/butter/sky ska bära lika mycket verklig yta.
        forest: '#244735',
        'forest-dark': '#1A3327',
        'forest-light': '#E4EAE5',

        // Varm kontrastfärg – bränd terrakotta/orange. Bytt från en tidigare,
        // för rosa/aprikosa ton (#F2B493) som gjorde designen väl "snäll".
        // ACCENT, inte en fjärde huvudyta: används sparsamt (en knapp, en
        // dekorativ hero-form, ljusa tinter i funktionssektionen) – den
        // huvudsakliga identiteten bärs fortsatt av cream/grafit/skogsgrönt/
        // smör/himmelsblått.
        terracotta: '#D9855B',
        'terracotta-light': '#F5E7DC',
        butter: '#F7DC90',
        'butter-light': '#FCF3D9',
        sky: '#D7E7EB',
        'sky-dark': '#4A7C89',

        // Funktionell varning – ENDAST "över budget". Egen, från de tre
        // identitetsfärgerna fristående nyans så de aldrig läses som en
        // varning i andra sammanhang.
        rust: '#C1502E',
        'rust-light': '#F5DEDA',

        // Linjer – varm ton härledd ur cream, inte grå
        line: '#E8E0D2',
        'line-strong': '#DDD2BD',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(48, 45, 41, 0.05)',
        'md': '0 1px 3px rgba(48, 45, 41, 0.07)',
        'lg': '0 4px 16px rgba(48, 45, 41, 0.08)',
      },
      fontSize: {
        'label': ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.01em' }],
        'meta': ['0.8125rem', { lineHeight: '1.45' }],
      },
    },
  },
  plugins: [],
}


