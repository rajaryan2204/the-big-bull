/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Avoid double-mounting socket connections in development
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
