/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          sidebar: '#132038',
          heading: '#152238',
          dark: '#0f172a',
        },
        teal: {
          brand: '#009688',
          hover: '#00796b',
          light: '#e0f2f1',
        },
        card: {
          soft: '#f1f6fa',
          badge: '#dcf4e8',
          badgeText: '#18794e',
        },
      },
    },
  },
  plugins: [],
}
