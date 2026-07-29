import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const sslCertPath = path.join(process.cwd(), "ssl/termelix.crt");
const sslKeyPath = path.join(process.cwd(), "ssl/termelix.key");

const hasSSL = fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath);
const useHTTPS = process.env.VITE_HTTPS === "true" && hasSSL;
const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
) as { version?: string };

const manualChunkGroups: Record<string, string[]> = {
  "react-vendor": ["react", "react-dom"],
  "ui-vendor": [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-switch",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-separator",
    "lucide-react",
    "clsx",
    "tailwind-merge",
    "class-variance-authority",
  ],
  monaco: ["@monaco-editor/react", "monaco-editor"],
  "terminal-vendor": [
    "@xterm/addon-clipboard",
    "@xterm/addon-fit",
    "@xterm/addon-unicode11",
    "@xterm/addon-web-links",
    "@xterm/xterm",
    "react-xtermjs",
  ],
  "graph-vendor": ["cytoscape", "react-cytoscapejs"],
};

/*
 * `codemirror` and `file-preview-vendor` were groups here and are deliberately NOT any more.
 *
 * A manual group is a promise that everything in it belongs together. When it is wrong, the
 * cost is invisible and large: the entry chunk needed a couple of small bindings that happened
 * to be grouped with CodeMirror and with the PDF/markdown/photo viewers, so the bundler made
 * both mega-chunks static dependencies of the entry — and `index.html` `modulepreload`ed them
 * on EVERY page load. 2.8 MB raw, ~940 KB gzipped, fetched and parsed before the host list
 * could render, to support a code editor and a file previewer that most sessions never open.
 *
 * Letting the bundler split those naturally puts CodeMirror in `CodeEditor-*.js` and the
 * viewers in `MarkdownRenderer-*.js` / `PdfPreview-*.js`, loaded when those features are, and
 * takes the eager payload from 3296 KB to 756 KB (236 KB gzipped). Total shipped bytes move by
 * 12 KB, so nothing was duplicated — the code was simply being downloaded at the wrong time.
 *
 * The groups that remain are ones the entry does not reach into: xterm, monaco, cytoscape and
 * the radix/ui set, which the shell genuinely uses. Before adding a group here, check what the
 * entry ends up importing from it — a two-binding import is enough to make a megabyte eager.
 */
function getManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  const normalizedId = id.replaceAll("\\", "/");

  for (const [chunkName, packages] of Object.entries(manualChunkGroups)) {
    if (
      packages.some((packageName) =>
        normalizedId.includes(`/node_modules/${packageName}/`),
      )
    ) {
      return chunkName;
    }
  }

  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      packageJson.version || "0.0.0",
    ),
  },
  resolve: {
    alias: {
      "@/types": path.resolve(__dirname, "./src/types"),
      "@": path.resolve(__dirname, "./src/ui"),
    },
  },
  base: process.env.VITE_BASE_PATH || "./",
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    https: useHTTPS
      ? {
          cert: fs.readFileSync(sslCertPath),
          key: fs.readFileSync(sslKeyPath),
        }
      : false,
    port: 5173,
    host: "localhost",
  },
});
