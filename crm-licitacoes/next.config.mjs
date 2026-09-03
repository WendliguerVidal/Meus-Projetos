/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Anexos (base64) ficam bem abaixo disso (ver MAX_FILE_SIZE em actions/attachments.ts);
      // mantido um pouco acima do limite de payload de Serverless Functions da Vercel (~4.5MB
      // no plano Hobby) só para não ser o primeiro a rejeitar antes da plataforma.
      bodySizeLimit: "4mb",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
