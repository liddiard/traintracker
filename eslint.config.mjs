import nextPlugin from 'eslint-config-next'

const eslintConfig = [
  ...nextPlugin,
  {
    rules: {
      // 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['db/generated/'] },
]

export default eslintConfig
