/** @type {import('next').NextConfig} */
// Updated: 2026-02-03 - Testing Codex auto-review hook v2
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:*;",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // sendright.jp → app.sendright.jp へのリダイレクト
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'sendright.jp' }],
        destination: 'https://app.sendright.jp/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.sendright.jp' }],
        destination: 'https://app.sendright.jp/:path*',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig

















