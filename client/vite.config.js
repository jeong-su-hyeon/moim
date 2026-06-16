import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      path: '/__vite_hmr',
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("origin", "http://localhost:3000");
          });
        },
      },
      "/ws": {
        target: "http://localhost:8000",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReqWs", (proxyReq) => {
            proxyReq.setHeader("origin", "http://localhost:3000");
          });
        },
      },
    },
  },
});
