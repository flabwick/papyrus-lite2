/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      colors: {
        'terminal': {
          'bg': '#1a1a1a',
          'text': '#00ff00',
          'prompt': '#ffff00',
          'error': '#ff4444',
          'success': '#44ff44'
        }
      }
    },
  },
  plugins: [],
}
