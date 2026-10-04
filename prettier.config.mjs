/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  printWidth: 110,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/shared/styles/globals.css',
  tailwindFunctions: ['cn', 'cva'],
};

export default config;
