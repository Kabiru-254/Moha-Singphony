/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      animation: {
        flyIn: 'flyIn 0.5s ease-in-out',
      },
      keyframes: {
        flyIn: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
      colors: {
        'role-song-leader': '#E0F7FA',
        'role-musician': '#E8F5E9',
        'role-sound-team': '#FFF3E0',
        'role-deacon': '#F3E5F5',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}

