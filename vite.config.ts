import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // three.js 一式（3D星座）は遅延読み込みの別チャンクなので、初期表示には影響しない
  build: { chunkSizeWarningLimit: 1100 },
});
