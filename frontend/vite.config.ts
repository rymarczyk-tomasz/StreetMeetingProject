import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

// public/css/custom.css keeps its name between deploys, so browsers could keep
// an old copy next to a new index.html. The build adds ?v=<content hash>.
function versionCustomCss(): Plugin {
    return {
        name: "version-custom-css",
        apply: "build",
        transformIndexHtml(html) {
            const css = readFileSync(new URL("./public/css/custom.css", import.meta.url));
            const version = createHash("sha256").update(css).digest("hex").slice(0, 10);
            return html.replace('href="/css/custom.css"', `href="/css/custom.css?v=${version}"`);
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), versionCustomCss()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:33000",
                changeOrigin: true,
            },
            "/uploads": {
                target: "http://localhost:33000",
                changeOrigin: true,
            },
        },
    },
});
