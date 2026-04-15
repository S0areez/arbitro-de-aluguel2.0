import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Permite que qualquer host (incluindo o LocalTunnel) acesse o servidor
    allowedHosts: true, 
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg"],
      manifest: {
        name: "Árbitro de Aluguel",
        short_name: "Arbitro",
        description: "Marketplace de árbitros esportivos",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#2563EB",
        background_color: "#0B1220",
        icons: [
          { src: "favicon.ico", sizes: "64x64 32x32 16x16", type: "image/x-icon" },
          { src: "placeholder.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: "placeholder.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp}"],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
