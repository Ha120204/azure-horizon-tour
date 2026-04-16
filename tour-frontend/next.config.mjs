import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['next-intl/config'] = path.resolve('./i18n/request.ts');
    return config;
  }
};

export default nextConfig;
