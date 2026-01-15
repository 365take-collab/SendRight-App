/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F7',
          100: '#FFE8ED',
          200: '#FFD4DE',
          300: '#FFB5C5',
          400: '#FF8BA5',
          500: '#FF6B8A',
          600: '#FF4D73',
          700: '#E8365C',
          800: '#C42D4E',
          900: '#A02541',
        },
        coral: {
          50: '#FFF7F5',
          100: '#FFEDE8',
          200: '#FFD9CF',
          300: '#FFB8A8',
          400: '#FF9B87',
          500: '#FF8B7B',
          600: '#FF6B5B',
          700: '#E8524A',
          800: '#C4423D',
          900: '#A03530',
        },
        pairs: {
          pink: '#FF6B8A',
          coral: '#FF8B7B',
          peach: '#FFA07A',
          light: '#FFF5F7',
          accent: '#FF4D73',
        },
      },
    },
  },
  plugins: [],
}
