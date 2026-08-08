/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px',
    },
    extend: {
      colors: {
        'tk-wine': '#620d3c',
        'tk-wine-dark': '#4a0a2e',
        'tk-wine-soft': '#f5e6ec',
        'tk-gold': '#f1a222',
        'tk-gold-soft': '#fcf0d9',
        'tk-ink': '#171413',
        'tk-cream': '#F7F5F2',
        'tk-rule': 'rgba(23, 20, 19, 0.16)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        '7xl': '1240px',
      },
    },
  },
  plugins: [],
}
