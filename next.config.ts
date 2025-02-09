import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    })
    return config
  },
  // webpack: (config, options) => {
  // https://github.com/vercel/next.js/discussions/33161#discussioncomment-4137836
  //   config.module.rules.push({
  //     test: /\.svg$/,
  //     use: [
  //       options.defaultLoaders.babel,
  //       {
  //         loader: '@svgr/webpack',
  //         options: { babel: false },
  //       },
  //     ],
  //   })
  //   return config
  // },
}

export default nextConfig
