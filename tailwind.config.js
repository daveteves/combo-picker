/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { board: "#0F1720", tile: "#18232F", amber: { flap: "#FFB000" }, paper: "#DCE3EA" },
      fontFamily: { flap: ["var(--font-flap)", "sans-serif"], body: ["var(--font-body)", "sans-serif"] },
    },
  },
  plugins: [],
};
