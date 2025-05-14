/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media', 
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