import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          900: "#171A21",
          800: "#20242E",
          700: "#2B303C",
          600: "#3A4051",
        },
        asphalt: {
          50: "#F6F6F4",
          100: "#EEEEEA",
        },
        amber: {
          500: "#E8A33D",
          600: "#CC8A28",
        },
        signal: {
          green: "#3F7D58",
          red: "#C1462F",
          blue: "#3B6EA5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
