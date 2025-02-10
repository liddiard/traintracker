import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    })
    // https://github.com/vercel/next.js/discussions/33161#discussioncomment-4137836
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        options.defaultLoaders.babel,
        {
          loader: '@svgr/webpack',
          options: { babel: false },
        },
      ],
    })
    return config
  },
}

export default nextConfig
