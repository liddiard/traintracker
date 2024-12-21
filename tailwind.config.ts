import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // https://paletton.com/#uid=33q0u0ksYy0i2HrnkANxCrpAwlv
        'amtrak-blue-300': '#5BA8C5',
        'amtrak-blue-400': '#358FB1',
        'amtrak-blue-500': '#167EA6',
        'amtrak-blue-600': '#056589',
        'amtrak-blue-700': '#044F6B',
        'amtrak-yellow-300': '#FFD66F',
        'amtrak-yellow-400': '#FFC945',
        'amtrak-yellow-500': '#FFBC18',
        'amtrak-yellow-600': '#DA9B00',
        'amtrak-yellow-700': '#AB7A00',
        'amtrak-red-300': '#FF886F',
        'amtrak-red-400': '#FF6545',
        'amtrak-red-500': '#FF4018',
        'amtrak-red-600': '#DA2600',
        'amtrak-red-700': '#AB1E00',
        'amtrak-green-300': '#5DD489',
        'amtrak-green-400': '#36C66C',
        'amtrak-green-500': '#12BD52',
        'amtrak-green-600': '#009E3B',
        'amtrak-green-700': '#007C2E',
        'amtrak-indigo-300': '#6878CE',
        'amtrak-indigo-400': '#4558BD',
        'amtrak-indigo-500': '#263CB4',
        'amtrak-indigo-600': '#122795',
        'amtrak-indigo-700': '#0C1D75',
        'amtrak-deep-blue': '#003b63',
        'amtrak-midnight-blue': '#002538',
        'positron-gray-100': '#dde4e6',
        'positron-gray-200': '#c1c8ca',
        'positron-gray-300': '#a6acae',
        'positron-gray-400': '#8c9294',
        'positron-gray-500': '#72787a',
        'positron-gray-600': '#595f61',
        'positron-gray-700': '#424849',
        'positron-gray-800': '#2c3133',
        'positron-gray-900': '#171c1e',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('progress-unfilled', ['&::-webkit-progress-bar', '&'])
      addVariant('progress-filled', [
        '&::-webkit-progress-value',
        '&::-moz-progress-bar',
      ])
      addVariant('before-after', ['&::before', '&::after'])
    }),
  ],
} satisfies Config
