/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        ms: {
          primary: '#6366f1',
          'primary-light': '#818cf8',
          secondary: '#8b5cf6',
          'secondary-light': '#a78bfa',
          success: '#22c55e',
          'success-light': '#4ade80',
          warning: '#f59e0b',
          'warning-light': '#fbbf24',
          danger: '#ef4444',
          'danger-light': '#f87171',
          info: '#3b82f6',
          'info-light': '#60a5fa',
          electric: '#06b6d4',
        },
        'role-song-leader': '#E0F7FA',
        'role-musician': '#E8F5E9',
        'role-sound-team': '#FFF3E0',
        'role-deacon': '#F3E5F5',
      },
      borderRadius: {
        'ms-sm': '12px',
        'ms-md': '16px',
        'ms-lg': '20px',
        'ms-xl': '24px',
      },
      boxShadow: {
        'ms-sm': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'ms-md': '0 4px 12px rgba(15, 23, 42, 0.06)',
        'ms-lg': '0 12px 32px rgba(15, 23, 42, 0.08)',
        'ms-xl': '0 24px 48px rgba(15, 23, 42, 0.12)',
        'ms-2xl': '0 32px 64px rgba(15, 23, 42, 0.18)',
        'ms-glow': '0 0 24px rgba(99, 102, 241, 0.24)',
        'dark-ms-sm': '0 1px 2px rgba(0, 0, 0, 0.24)',
        'dark-ms-md': '0 4px 12px rgba(0, 0, 0, 0.32)',
        'dark-ms-lg': '0 12px 32px rgba(0, 0, 0, 0.4)',
        'dark-ms-xl': '0 24px 48px rgba(0, 0, 0, 0.48)',
        'dark-ms-glow': '0 0 32px rgba(139, 92, 246, 0.28)',
      },
      transitionTimingFunction: {
        'ms-ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ms-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'ms-fast': '150ms',
        'ms-base': '250ms',
        'ms-slow': '350ms',
      },
      keyframes: {
        flyIn: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'ms-pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(99, 102, 241, 0)' },
          '50%': { boxShadow: '0 0 24px rgba(99, 102, 241, 0.28)' },
        },
        'ms-waveform': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'ms-live-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(34, 197, 94, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
        },
      },
      animation: {
        flyIn: 'flyIn 0.5s ease-in-out',
        'ms-pulse-glow': 'ms-pulse-glow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'ms-waveform': 'ms-waveform 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'ms-live-pulse': 'ms-live-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}

