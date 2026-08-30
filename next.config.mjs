/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.instagram.com https://*.cdninstagram.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://*.supabase.co https://*.r2.dev https://images.unsplash.com https://www.google.com https://*.cdninstagram.com https://*.fbcdn.net https://i.ytimg.com data: blob:",
              "connect-src 'self' https://*.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://www.google.com https://www.instagram.com",
              "font-src 'self'",
              "worker-src 'self' blob:",
              "frame-src 'self' https://www.instagram.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
