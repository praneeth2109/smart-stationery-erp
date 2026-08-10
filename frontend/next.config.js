/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",   // Capacitor requires a fully static export (reads from webDir: 'out')
  trailingSlash: true, // Ensures sub-routes resolve correctly as index.html inside each folder
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;


