/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brandPinkLight: '#f6f1f4',
        brandPink: '#ecc4cd',
        brandBlueLight: '#d7eef9',
        brandBlue: '#b7d6f1',
        festa: {
          cream: '#FDFBF4',
          rose: '#DE6273',
          navy: '#2C4073',
          roseDark: '#A93C4C',
          ribbon: '#963744',
          ink: '#20293A',
          navyDark: '#1E2E56',
        },
        garland: {
          pink: '#ED7486',
          blue: '#6FA3EF',
          yellow: '#F7CE65',
          green: '#69C99A',
        },
      },
      fontFamily: {
        sinchon: ['SinchonRhapsody', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
