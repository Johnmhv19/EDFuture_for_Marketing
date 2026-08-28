/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pathway colors — keep in sync with the database seed and any
        // admin UI that uses these for badges.
        pathway: {
          robotics: '#2563eb',
          business: '#f97316',
          creative: '#a855f7',
          health:   '#16a34a',
          science:  '#0891b2',
          cs:       '#6b7280',
          whole:    '#ef4444',
        },
        level: {
          l1: '#2563eb',
          l2: '#16a34a',
          l3: '#a855f7',
          l23: '#f97316',
          whole: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
