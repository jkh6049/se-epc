import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// React 신규 화면은 /next/ 아래에서 서비스 (기존 대시보드는 / 유지, 화면 단위로 옮겨옴)
export default defineConfig({
  root: "app",
  base: "/next/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../dist/next", emptyOutDir: true },
  server: {
    // npm run dev 때 /api 는 wrangler dev(8787)로 넘김
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
});
