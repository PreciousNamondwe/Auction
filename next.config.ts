import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mariadb"],
  
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "glorious-computing-machine-r4rx67jrqr74hxj6q-3000.app.github.dev",
        "localhost:3000"
      ],
    },
  },
};

export default nextConfig;