import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pg"],

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "glorious-computing-machine-r4rx67jrqr74hxj6q-3000.app.github.dev",
        "turbo-umbrella-4qjpx64954p6hwg6-34221.app.github.dev",
        "localhost:3000",
        "127.0.0.1:3000",
      ],
    },
  },
};

export default nextConfig;