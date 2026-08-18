/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4A6B4D',
          dark: '#3A5A3D',
        },
        cream: '#EDE6D8',
        sand: '#DCD3C0',
        surface: '#F8F5EE',
        ink: '#31302B',
        muted: '#726B5C',
        wood: {
          DEFAULT: '#B8763F',
          bg: '#F3E4CC',
          text: '#8A5A28',
        },
        success: {
          DEFAULT: '#3E7A46',
          bg: '#E4EAE1',
          border: '#B9D2B4',
          text: '#2C5A32',
        },
        pending: {
          DEFAULT: '#5B6B78',
          bg: '#E4E8EA',
          border: '#C3CDD2',
          text: '#3E4E58',
        },
        error: {
          DEFAULT: '#B5453A',
          bg: '#F5E4E1',
          border: '#E3B8B0',
          text: '#7A2A22',
        },
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}