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
      // Färger: ALLA kommer från de gemensamma färgvariablerna i
      // src/app/globals.css (:root, --color-*), uppdelade efter roll. Paletten
      // är oliv och smörgult med varm gräddvit (se DESIGN.md). Formatet
      // rgb(var(--…) / <alpha-value>) gör att opacitetsvarianter som
      // text-ink-light/70 fungerar. Lägg inte till egna hexkoder i komponenter.
      colors: {
        page: 'rgb(var(--color-page) / <alpha-value>)',             // sidbakgrund
        surface: 'rgb(var(--color-surface) / <alpha-value>)',       // kort, fält, paneler
        'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)', // varm gräddvit yta (startsidans fördelsrad m.m.)
        ink: 'rgb(var(--color-ink) / <alpha-value>)',               // text
        'ink-light': 'rgb(var(--color-ink-muted) / <alpha-value>)', // sekundär text
        primary: 'rgb(var(--color-primary) / <alpha-value>)',       // oliv: primära knappar, valda tillstånd, fokus
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        'primary-soft': 'rgb(var(--color-primary-soft) / <alpha-value>)', // tonad yta för valt/positivt
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)', // gräddvit text på oliv
        accent: 'rgb(var(--color-accent) / <alpha-value>)',         // smörgult
        'accent-hover': 'rgb(var(--color-accent-hover) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',             // kantlinjer
        'line-strong': 'rgb(var(--color-line-strong) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',         // fel och "över budget"
        'danger-soft': 'rgb(var(--color-danger-soft) / <alpha-value>)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'sm': '0 1px 2px rgb(var(--color-ink) / 0.05)',
        'md': '0 1px 3px rgb(var(--color-ink) / 0.07)',
        'lg': '0 4px 16px rgb(var(--color-ink) / 0.08)',
      },
      fontSize: {
        'label': ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.01em' }],
        'meta': ['0.8125rem', { lineHeight: '1.45' }],
      },
    },
  },
  plugins: [],
}


