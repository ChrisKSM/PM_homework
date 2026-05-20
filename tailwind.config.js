/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lg: {
          red: '#A50034',
          'red-light': '#F5E6EA',
          'red-mid': '#D4004C',
        },
        surface: {
          page: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E5E7EB',
          muted: '#F0F0F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
