/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        noc: {
          bg: '#0B0F19',
          surface: '#111827',
          surfaceHover: '#162235',
          card: '#131D2F',
          border: '#1F2937',
          borderGlow: 'rgba(6, 182, 212, 0.25)',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          dim: '#4B5563',
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.4)',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'noc-glow': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
        'noc-red-glow': '0 0 20px -5px rgba(244, 63, 94, 0.4)',
        'noc-green-glow': '0 0 20px -5px rgba(16, 185, 129, 0.35)',
        'noc-card': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
