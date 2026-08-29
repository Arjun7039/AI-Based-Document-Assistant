/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#040711',
          900: '#0a0e1a',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
        accent: {
          violet: '#8b5cf6',
          indigo: '#6366f1',
          cyan: '#06b6d4',
          blue: '#3b82f6',
        },
      },
      boxShadow: {
        // Layered soft shadows — quiet depth without harsh edges
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.06)',
        lift: '0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.14)',
        glow: '0 0 0 1px rgba(99, 102, 241, 0.15), 0 8px 24px -6px rgba(99, 102, 241, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'typing-dot': 'typingDot 1.4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pop': 'pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        typingDot: {
          '0%, 60%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '30%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

