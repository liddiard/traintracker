import nextPlugin from 'eslint-config-next'

const eslintConfig = [...nextPlugin, { ignores: ['db/generated/'] }]

export default eslintConfig
