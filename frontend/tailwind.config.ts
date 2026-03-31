import type { Config } from 'tailwindcss'

/** Couleurs sémantiques « grimoire » — complètent @theme dans src/styles/globals.css (Tailwind v4). */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#fdf5e6',
        'parchment-warm': '#f4ebd8',
        ink: '#1a1a1a',
        sepia: '#4a3b32',
        'wax-red': '#9b2c2c',
        'gold-tarnish': '#b8860b',
      },
    },
  },
} satisfies Config
