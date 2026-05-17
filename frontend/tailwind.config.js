/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',      // Deepest black-slate
          gray: '#0b0f19',      // Dark-gray slate
          light: '#1f2937',     // Active glass elements
          glow: '#10b981',      // Neon emerald green (safe / active)
          threat: '#ef4444',    // Bright threat red
          warn: '#f59e0b',      // Bright warning yellow
          text: '#f3f4f6',      // Off-white text
          muted: '#9ca3af',     // Muted secondary text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.25)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.25)',
      }
    },
  },
  plugins: [],
}
