import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        icu: {
          bg: '#05090d',
          panel: '#091116',
          panel2: '#0d171c',
          line: '#18313a',
          cyan: '#2ee8d6',
          green: '#62ff9b',
          amber: '#ffc857',
          red: '#ff5470'
        }
      },
      boxShadow: {
        monitor: '0 0 0 1px rgba(46,232,214,.13), 0 24px 70px rgba(0,0,0,.38)',
        glow: '0 0 34px rgba(46,232,214,.28)'
      }
    }
  },
  plugins: []
};

export default config;
