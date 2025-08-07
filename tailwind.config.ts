import { type Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007BFF',
          600: '#007BFF',
          700: '#0069D9',
          800: '#0056B3',
          focus: '#80BDFF',
        },
      },
    },
  },
  plugins: [],
};

export default config;
