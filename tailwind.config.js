/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        }
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 50%, #f0fdf4 100%)',
      }
    },
  },
  plugins: [],
}
