import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: "build",
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
                        return "vendor";
                    }
                    if (id.includes("node_modules/react-router")) {
                        return "router";
                    }
                    if (id.includes("node_modules/@tanstack")) {
                        return "query";
                    }
                    if (id.includes("node_modules/@radix-ui")) {
                        return "ui";
                    }
                },
            },
        },
    },
});
