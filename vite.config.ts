import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        // 로컬에서 3000이 이미 쓰이면 API_PORT=3001 npm run dev
        target: `http://127.0.0.1:${process.env.API_PORT || 3000}`,
        changeOrigin: true,
      },
      // 업로드 직후 파일이 Express public/ 에만 생기므로, Vite가 빈 404를 내지 않게 같은 서버로 넘긴다.
      '/images/uploads': {
        target: `http://127.0.0.1:${process.env.API_PORT || 3000}`,
        changeOrigin: true,
      },
    },
    // https: {
    //   key: fs.readFileSync('./localhost-key.pem'),
    //   cert: fs.readFileSync('./localhost.pem'),
    // },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
}));
