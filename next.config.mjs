/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
