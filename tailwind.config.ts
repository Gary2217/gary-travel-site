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
        header: '3.5rem', // 56px
      },
      spacing: {
        header: '3.5rem', // 56px
      },
      zIndex: {
        header: '40',
        dropdown: '50',
        modal: '500',
        floating: '9000',
        'modal-top': '10000',
      },
    }
  },
  plugins: []
};

export default config;
