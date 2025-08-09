module.exports = {
  plugins: [require('prettier-plugin-tailwindcss')],
  printWidth: 100,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  tailwindFunctions: ['clsx', 'cn'],
};
