import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ["var(--font-cinzel)", "serif"],
        philosopher: ["var(--font-philosopher)", "serif"],
      },
      colors: {
        // Dark background colors
        dark: {
          950: '#050810',
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2234',
          600: '#243047',
          500: '#334155',
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
        // Gold/amber for special elements
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Deep purple for magical highlights
        mystic: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Warm parchment tones
        parchment: {
          50: '#fdfcfb',
          100: '#f5f0e8',
          200: '#e8dcc8',
          300: '#d4c4a8',
          400: '#bfaa85',
          500: '#a89068',
          600: '#8a7350',
          700: '#6b5a3e',
          800: '#4d4230',
          900: '#332c21',
        },
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'twinkle': 'twinkle 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 149, 255, 0.3), 0 0 40px rgba(0, 149, 255, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(0, 149, 255, 0.5), 0 0 60px rgba(0, 149, 255, 0.2)' 
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'arcane-glow': 'radial-gradient(ellipse at center, rgba(0, 149, 255, 0.15) 0%, transparent 70%)',
        'mystic-glow': 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
export default config;
