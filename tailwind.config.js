/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAFA',
        ink: '#1F1F1F',
        accent: '#4A90D9',
        success: '#3CB371',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        checkPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        toastLife: {
          '0%': { opacity: '0', transform: 'translate(-50%, -8px)' },
          '10%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '80%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out both',
        'fade-in-quick': 'fadeIn 200ms ease-out both',
        'fade-out': 'fadeOut 200ms ease-in both',
        'fade-in-modal': 'fadeIn 150ms ease-out both',
        'check-pop': 'checkPop 300ms ease-out',
        toast: 'toastLife 2000ms ease-out both',
      },
    },
  },
  plugins: [],
};
