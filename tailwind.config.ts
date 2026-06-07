import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./public/index.html"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
