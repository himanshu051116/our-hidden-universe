/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#05040a',
        plum: '#22102f',
        orchid: '#6e2d7f',
        blush: '#ffb6c8',
        roseGold: '#d8a07f',
        wine: '#5a1635',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Manrope"', '"Trebuchet MS"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(255, 182, 200, 0.24)',
        rose: '0 0 28px rgba(216, 160, 127, 0.28)',
      },
      backgroundImage: {
        'romance-radial':
          'radial-gradient(circle at 20% 20%, rgba(255,182,200,.18), transparent 30%), radial-gradient(circle at 80% 10%, rgba(110,45,127,.26), transparent 34%), radial-gradient(circle at 50% 90%, rgba(216,160,127,.16), transparent 35%)',
      },
    },
  },
  plugins: [],
};
