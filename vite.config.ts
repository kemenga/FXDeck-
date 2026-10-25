import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mediaUpload } from "./server/media";
import { fxExport } from "./server/export";

export default defineConfig({
  plugins: [react(), fxExport(), mediaUpload()],
  server: { port: 5188, strictPort: true },
});
