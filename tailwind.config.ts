import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f1923',
          card: '#1a3347',
          'card-dark': '#182838',
        },
        platform: {
          line: '#06C755',
          fb: '#1877F2',
          ig: '#E4405F',
        },
      },
      maxWidth: {
        site: '1100px',
      },
      height: {
        header: '5rem', // 80px
      },
      spacing: {
        header: '5rem', // 80px
      },
      zIndex: {
        header: '40',
        dropdown: '50',
        modal: '500',
        floating: '9000',
        'modal-top': '10000',
      },
      keyframes: {
        'float-up': {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-52px) scale(2)' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translate(-50%, -8px)' },
          '15%':  { opacity: '1', transform: 'translate(-50%, 0)' },
          '80%':  { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -8px)' },
        },
      },
      animation: {
        'float-up': 'float-up 0.8s ease-out forwards',
        'toast-in': 'toast-in 2.5s ease forwards',
      },
    }
  },
  plugins: []
};

export default config;
