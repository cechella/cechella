/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // O renderer do VERVE usa satori + @resvg/resvg-js, que trazem binário nativo (.node). O webpack do Next 14 não sabe empacotá-lo
    // ("Module parse failed: Unexpected character" em resvgjs.linux-x64-gnu.node) e TODO deploy de produção falhava desde 22/10 13:43 UTC.
    // Mantê-los como pacotes externos do servidor resolve; o binário é incluído no deploy pelo rastreamento de arquivos.
    serverComponentsExternalPackages: ['@resvg/resvg-js', 'satori', 'sharp', 'playwright-core', '@sparticuz/chromium-min'],
  },
}

module.exports = nextConfig
