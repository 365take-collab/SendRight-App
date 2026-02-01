/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // X-Frame-Optionsを削除（Content-Security-Policyで制御）
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:*;",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

















