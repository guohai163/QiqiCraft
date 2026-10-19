/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          dirt: '#866043',
          dirtDark: '#593d29',
          grass: '#5b8731',
          grassLight: '#7cbd42',
          stone: '#7d7d7d',
          stoneDark: '#4a4a4a',
          wood: '#9c7f4e',
          gold: '#fcee4b',
          diamond: '#4aedd9',
          emerald: '#17dd62',
          redstone: '#ff3333',
          obsidian: '#1b1429',
          panel: '#c6c6c6',
          panelDark: '#8b8b8b',
        }
      },
      boxShadow: {
        'mc': 'inset -4px -4px 0px 0px rgba(0,0,0,0.35), inset 4px 4px 0px 0px rgba(255,255,255,0.45), 0 4px 0 0 #1e1e1e',
        'mc-pressed': 'inset 4px 4px 0px 0px rgba(0,0,0,0.45), 0 1px 0 0 #1e1e1e',
        'mc-card': 'inset -3px -3px 0px 0px rgba(0,0,0,0.25), inset 3px 3px 0px 0px rgba(255,255,255,0.35), 0 6px 0 0 rgba(0,0,0,0.45)',
        'mc-slot': 'inset 3px 3px 0px 0px rgba(0,0,0,0.55), inset -2px -2px 0px 0px rgba(255,255,255,0.4)',
      }
    },
  },
  plugins: [],
}
