import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mediaUpload } from "./server/media";
import { fxExport } from "./server/export";
import { aiChat } from "./server/ai";

export default defineConfig({
  plugins: [react(), fxExport(), mediaUpload(), aiChat()],
  server: { port: 5188, strictPort: true },
});
