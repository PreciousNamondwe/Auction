import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mariadb"],
};

export default nextConfig;
