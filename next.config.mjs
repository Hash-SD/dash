/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Baris ini membantu memastikan build yang bersih
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
