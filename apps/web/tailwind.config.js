// Tailwind v4 reads its theme from `@theme` in app/globals.css — that file is
// the source of truth for the Broadsheet tokens. This config is kept only for
// tooling that still looks for it; keep the two in sync.
module.exports = {
  content: ["./components/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f2f2",
        surface: "#eae9e9",
        ink: "#201e1d",
        cyan: { DEFAULT: "#0088b0", ink: "#006786" },
        magenta: { DEFAULT: "#d6006c", ink: "#aa0b56" },
        n300: "#d7d3d3",
        n400: "#bab6b6",
        n500: "#9b9797",
        n800: "#444141",
        n900: "#2d2b2b",
      },
      fontFamily: {
        sans: [
          "ui-rounded",
          '"SF Pro Rounded"',
          '"Hiragino Maru Gothic ProN"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: { sm: "1px", DEFAULT: "2px", md: "2px", lg: "4px" },
    },
  },
  plugins: [],
};
