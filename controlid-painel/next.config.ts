import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.10.109"],
  output: "standalone",
  // Garante que o cliente Prisma gerado e o schema entram no bundle standalone
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*", "./prisma/schema.prisma"],
  },
};

export default nextConfig;
