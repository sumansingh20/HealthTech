/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@icu/shared'],
  reactStrictMode: true,
  // Ensure proper asset prefixes for production
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // trailingSlash: true,
  // Environment variables are automatically exposed to client
  // via NEXT_PUBLIC_ prefix in runtime
  env: {
    // Backend API URL - configure in Vercel project settings
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4003/ws'
  },
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel.app'
      }
    ]
  },
  // WebSocket support for Vercel (requires Vercel Pro)
  // Note: For production WebSocket, consider using a separate service
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
