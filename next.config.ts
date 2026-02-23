import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // https://stackoverflow.com/a/72186766
  reactStrictMode: false,
  output: 'standalone',
  // Disable Next.js gzip so responses reach Cloudflare uncompressed,
  // allowing Cloudflare to apply Brotli/zstd at the edge.
  compress: false,
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
