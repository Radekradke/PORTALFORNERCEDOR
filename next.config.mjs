/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // @node-rs/argon2 é um addon nativo (.node); nunca deve ser processado pelo
  // bundler do webpack, só carregado diretamente pelo runtime do servidor.
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
};

export default nextConfig;
