const dns = require('dns');

// Some ISP DNS servers refuse the SRV lookups that "mongodb+srv://" URLs need
// (error: querySrv ECONNREFUSED). Locally, fall back to public DNS servers.
// Not needed on Vercel, whose DNS resolves these normally.
const usePublicDnsForAtlas = () => {
  const uri = process.env.MONGO_URI || '';
  if (process.env.VERCEL || !uri.startsWith('mongodb+srv://')) return;
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
};

module.exports = usePublicDnsForAtlas;
