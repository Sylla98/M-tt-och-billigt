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
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cream: '#FDF8F0',
        warm: '#FAF3E7',
        terracotta: '#C8614A',
        'terracotta-light': '#E8846C',
        'terracotta-dark': '#A84D39',
        sage: '#7A9E7E',
        'sage-light': '#A8C5AB',
        ochre: '#D4A843',
        'ochre-light': '#F0CC7A',
        brown: '#5C3D2E',
        'brown-light': '#8B6355',
        'stone-warm': '#EDE3D6',
        'stone-mid': '#D4C4B0',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'warm-sm': '0 2px 8px rgba(92, 61, 46, 0.08)',
        'warm-md': '0 4px 20px rgba(92, 61, 46, 0.12)',
        'warm-lg': '0 8px 40px rgba(92, 61, 46, 0.16)',
      }
    },
  },
  plugins: [],
}
