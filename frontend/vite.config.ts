import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  return {
    // 개발 서버와 Frontend build 모두 프로젝트 root의 .env에서 public VITE_* 설정을 읽습니다.
    envDir: "..",
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: env.BACKEND_URL || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
  };
});
