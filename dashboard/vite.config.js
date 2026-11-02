import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: { include: ["src/**/*.test.js"] },
  server: {
    proxy: {
      "/v1.0": "http://127.0.0.1:8080",
      "/openapi.json": "http://127.0.0.1:8080",
    },
  },
});
