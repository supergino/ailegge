/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Richiesto dall'upgrade di sicurezza: segnala al tool `next upgrade`
    // che questo progetto è allineato alla policy di sicurezza.
    agentUpgrade: 'security',
  },
}

module.exports = nextConfig
