import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Le paquet partagé est en TypeScript source : Next le compile.
  transpilePackages: ["@factureplus/core"],
  // Lien court du PDF d'un document (WhatsApp) → fonction Edge « lien-pdf », qui redirige vers le fichier
  async redirects() {
    return [{
      source: "/d/:code",
      destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lien-pdf?c=:code`,
      permanent: false,
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
