/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandPinkLight: '#f6f1f4',
        brandPink: '#ecc4cd',
        brandBlueLight: '#d7eef9',
        brandBlue: '#b7d6f1',
      },
      fontFamily: {
        sinchon: ['SinchonRhapsody', 'sans-serif'],
      },
    },
  },
  plugins: [],
}