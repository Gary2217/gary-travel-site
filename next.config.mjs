/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
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
        hostname: 'dcimg.travel.net.tw',
      },
      {
        protocol: 'https',
        hostname: 'www.pwgotravel.com.tw',
      },
    ],
  },
};

export default nextConfig;
