import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/mensalidades", destination: "/faturamento", permanent: false },
      { source: "/mensalidades/:path*", destination: "/faturamento/:path*", permanent: false },
    ]
  },
};

export default nextConfig;
