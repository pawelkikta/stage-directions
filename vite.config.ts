import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// Base path: the GitHub Pages workflow sets BASE_PATH=/<repo-name>/, locally it is "/".
const base = process.env.BASE_PATH || "/";

// release channel shown next to the version ("" = stable)
const CHANNEL = "";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // a new version loads by itself on the next visit; progress (localStorage) stays
      registerType: "autoUpdate",
      // icons and the favicon go into the cache through globPatterns below
      includeManifestIcons: false,
      manifest: {
        name: "Stage Directions",
        short_name: "Stage Directions",
        description: "Learn OpenUSD step by step, with exam practice for NVIDIA NCP-OUSD.",
        lang: "en",
        display: "standalone",
        background_color: "#f7f9fc",
        theme_color: "#f7f9fc",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,usdz}"],
        // the Drone Factory chunk (three.js) is about 1 MB
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // only the Latin font subsets are needed
        globIgnores: ["**/*-cyrillic*", "**/*-vietnamese-*", "**/*-greek*"],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_CHANNEL__: JSON.stringify(CHANNEL),
  },
  build: {
    // three.js ships only in the lazy chunk of the Drone Factory page
    chunkSizeWarningLimit: 1100,
  },
});
