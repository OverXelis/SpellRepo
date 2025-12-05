import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark background colors
        dark: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2234',
          600: '#243047',
        },
        // Magical blue accent colors
        arcane: {
          50: '#e0f2ff',
          100: '#b3e0ff',
          200: '#80ccff',
          300: '#4db8ff',
          400: '#26a6ff',
          500: '#0095ff',
          600: '#0077cc',
          700: '#005a99',
          800: '#003d66',
          900: '#002040',
        },
      },
    },
  },
  plugins: [],
};
export default config;
