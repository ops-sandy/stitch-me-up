'use strict'

module.exports = {
  extends: 'airbnb-base',
  plugins: [],
  parserOptions: {
    sourceType: 'script',
  },
  rules: {
    semi: [2, 'never'],
    'no-use-before-define': ['error', { 'functions': false, 'classes': true }],
    'prefer-arrow-callback': 0,
    'no-console': 0,
  },
  env: {
    node: true,
  },
}
