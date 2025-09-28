const primeui = require('tailwindcss-primeui');

module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: { extend: {} },
  plugins: [primeui],  // ← adds fade-in-10, slide-in-from-*, zoom-in-*, etc.
};