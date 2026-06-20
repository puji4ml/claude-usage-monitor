/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Inter',
          'system-ui',
          'sans-serif'
        ]
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' }
    }
  },
  plugins: []
}
