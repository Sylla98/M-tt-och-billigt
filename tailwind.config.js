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
        // Serif används MEDVETET sparsamt: bara logotyp och hero-rubrik.
        // All funktionell UI-text (formulär, knappar, siffror, metadata)
        // sätts i sans för att appen ska kännas som ett verktyg, inte en blogg.
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Bakgrunder – varm off-white, mindre gul än tidigare
        cream: '#FBF8F4',
        warm: '#F5EFE7',

        // Terrakotta – något djupare än förut för att klara AA-kontrast
        // mot vitt i knappar och som textfärg
        terracotta: '#BE5A3E',
        'terracotta-light': '#D9795C',
        'terracotta-dark': '#9C4630',

        // Dämpad grön – används ENDAST för positiv budgetstatus.
        // Mörkad så den fungerar som läsbar text, inte bara som yta.
        sage: '#4F7A52',
        'sage-light': '#A8C5AB',

        // Lugn bärnsten för "över budget" – varning utan aggressivt rött
        ochre: '#9A6A2F',
        'ochre-light': '#E8D5AE',

        // Text – mörk choklad. Betydligt högre kontrast än tidigare
        // (#2E211A mot #5C3D2E) enligt tillgänglighetskravet.
        brown: '#2E211A',
        'brown-light': '#6B5749',

        // Linjer och ytor
        'stone-warm': '#EFE8DE',
        'stone-mid': '#8A7767',
        line: '#E4DACE',
      },
      borderRadius: {
        // Behålls oförändrade så att receptkort och inköpslista (som inte
        // ingår i etapp 1) ser exakt likadana ut. Den nya, mer kompakta
        // designen använder istället Tailwinds mindre standardradier.
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Kraftigt nedtonade – den nya designen bär på hårfina linjer
        // istället för stora skuggor.
        'warm-sm': '0 1px 2px rgba(46, 33, 26, 0.04)',
        'warm-md': '0 1px 3px rgba(46, 33, 26, 0.06)',
        'warm-lg': '0 2px 8px rgba(46, 33, 26, 0.07)',
      },
      fontSize: {
        // Tydlig typografisk skala
        'label': ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.01em' }],
        'meta': ['0.8125rem', { lineHeight: '1.45' }],
      },
    },
  },
  plugins: [],
}
