// @ts-check
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
  vite: {
    plugins: [
      tailwindcss(),
      nodePolyfills({
        include: ["buffer", "crypto", "stream", "util"],
        globals: {
          Buffer: true,
        },
        exclude: ["@hiveio/wax", "@hiveio/wax-api-hafah"],
      }),
    ],
    ssr: {
      noExternal: ["@hiveio/wax", "@hiveio/wax-api-hafah"],
    },
    build: {
      target: "esnext",
    },
    esbuild: {
      target: "esnext",
      format: "esm",
    },
  },
});
