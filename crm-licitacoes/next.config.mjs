/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Anexos (base64) ficam bem abaixo disso (ver MAX_FILE_SIZE em actions/attachments.ts);
      // mantido um pouco acima do limite de payload de Serverless Functions da Vercel (~4.5MB
      // no plano Hobby) só para não ser o primeiro a rejeitar antes da plataforma.
      bodySizeLimit: "4mb",
    },
    // O @react-pdf/renderer usa o pdfkit por baixo dos panos, que lê os arquivos de
    // métrica das fontes padrão (Helvetica etc.) do disco em runtime via caminho montado
    // dinamicamente — o rastreamento automático de arquivos da Vercel (@vercel/nft) não
    // detecta essa leitura e deixa a pasta de fora da função serverless (erro "Cannot find
    // module '.../pdfkit/js/standard-fonts/Helvetica.cjs'" ao gerar a Proposta Comercial).
    // Força a inclusão explícita para todas as rotas, já que a Server Action de geração do
    // PDF não tem uma rota própria.
    outputFileTracingIncludes: {
      "/**": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
