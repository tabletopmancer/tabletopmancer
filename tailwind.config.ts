import scrollbar from 'tailwind-scrollbar'
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [scrollbar],
} satisfies Config
