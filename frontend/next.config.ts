import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:4000' : 'http://127.0.0.1:5000');

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: backendUrl + '/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: backendUrl + '/socket.io/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: backendUrl + '/uploads/:path*',
      }
    ];
  },
};

const pwa = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

export default pwa(nextConfig);
