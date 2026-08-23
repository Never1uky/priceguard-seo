import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.wb.ru' },
      { protocol: 'https', hostname: '**.wbbasket.ru' },
      { protocol: 'https', hostname: '**.ozone.ru' },
      { protocol: 'https', hostname: '**.ozon.ru' },
      { protocol: 'https', hostname: '**.yandex.net' },
      { protocol: 'https', hostname: '**.yandex.ru' },
    ],
  },
};

export default nextConfig;
