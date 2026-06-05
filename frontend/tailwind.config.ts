import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#251a33",
        mist: "#f9f1ea",
        clay: "#c56f72",
        pine: "#5b8a69",
        sand: "#f3dfca",
        plum: "#5e2b63",
        lavender: "#e9dbf5",
        peach: "#f6c7b8"
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        body: ["Inter", "'Avenir Next'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 28px 80px rgba(73, 39, 86, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
