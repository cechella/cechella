import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        surface: '#111113',
        border: '#1C1C1E',
        'surface-2': '#18181A',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',
        purple: {
          DEFAULT: '#7B3FE4',
          50: '#F3EAFD',
          100: '#E5D3FB',
          200: '#CBA8F7',
          300: '#B07CF3',
          400: '#9558EE',
          500: '#7B3FE4',
          600: '#6325C8',
          700: '#4C1B9B',
          800: '#35116E',
          900: '#1E0840',
        },
        blue: {
          DEFAULT: '#3B82F6',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7B3FE4 0%, #3B82F6 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, rgba(123,63,228,0.15) 0%, rgba(59,130,246,0.15) 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0B 0%, #0D0D0F 100%)',
        'mesh-gradient': 'radial-gradient(ellipse at 20% 20%, rgba(123,63,228,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.1) 0%, transparent 50%)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(123,63,228,0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(59,130,246,0.5)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'brand': '0 0 30px rgba(123,63,228,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        'glow-purple': '0 0 20px rgba(123,63,228,0.4)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
