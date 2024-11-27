import type { Config } from 'tailwindcss'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
} satisfies Config
