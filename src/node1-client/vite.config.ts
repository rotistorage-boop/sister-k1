import { defineConfig } from "vite";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Muat file .env dari root project
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/rpc/student": {
        target: process.env.STUDENT_SERVICE_URL || "http://localhost:3002",
        changeOrigin: true,
        rewrite: () => "/rpc",
      },
      "/rpc/course": {
        target: process.env.COURSE_SERVICE_URL || "http://localhost:3003",
        changeOrigin: true,
        rewrite: () => "/rpc",
      },
      "/rpc/krs": {
        target: process.env.KRS_SERVICE_URL || "http://localhost:3004",
        changeOrigin: true,
        rewrite: () => "/rpc",
      },
      "/rpc/schedule": {
        target: process.env.SCHEDULE_SERVICE_URL || "http://localhost:3005",
        changeOrigin: true,
        rewrite: () => "/rpc",
      },
      "/rmi/schedule": {
        target: process.env.SCHEDULE_SERVICE_URL || "http://localhost:3005",
        changeOrigin: true,
        rewrite: () => "/rmi",
      },
    },
  },
});

