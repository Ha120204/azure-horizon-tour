import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
  webpack(config) {
    config.resolve.alias['next-intl/config'] = path.resolve('./i18n/request.ts');
    return config;
  },
  turbopack: {}
};

export default nextConfig;
