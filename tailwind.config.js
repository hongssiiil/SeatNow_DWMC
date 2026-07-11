/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // 'class' instead of the default 'media' — SeatNow is a light-only app.
  // We never add a `dark` class, so styles stay light, and NativeWind's
  // colorScheme.set() no longer throws on web (the reported error).
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
