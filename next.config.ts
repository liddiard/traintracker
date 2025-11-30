import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // https://stackoverflow.com/a/72186766
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  turbopack: {
    rules: {
      // https://github.com/vercel/next.js/discussions/33161#discussioncomment-4137836
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: { babel: false },
          },
        ],
        as: '*.js',
      },
    },
  },
}

export default nextConfig
