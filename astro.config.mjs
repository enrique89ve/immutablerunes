// @ts-check
import path from "node:path";
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [svelte()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      // Polyfill util/stream for keychain-sdk (client only)
      {
        ...nodePolyfills({
          include: ["util", "stream", "buffer"],
          globals: { global: true },
        }),
        // Only apply to client build, NOT SSR/server
        apply: (_config, { isSsrBuild }) => !isSsrBuild,
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
  },
});
