/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest-green': '#004927',
        'forest-dark': '#003220',
      },
      height: {
        '100': '25rem',
        '112': '28rem',
        '125': '31.25rem',
      },
      zIndex: {
        '60': '60',
      },
    },
  },
  plugins: [],
}