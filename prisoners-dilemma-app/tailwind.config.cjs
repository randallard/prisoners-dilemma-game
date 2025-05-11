/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html,lit}",
  ],
  theme: {
    extend: {
      colors: {
        // Add any custom colors if needed
      },
      transitionProperty: {
        // Custom transition properties for smooth theme switching
        'colors': 'background-color, border-color, color',
      }
    },
  },
  plugins: [],
}