import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "urql-vendor": ["urql", "@urql/core", "@urql/exchange-auth"],
          "icons-vendor": ["lucide-react"],
          "ui-vendor": ["radix-ui", "cmdk"],
          "dnd-vendor": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "form-vendor": ["react-hook-form", "zod", "@hookform/resolvers"],
          "markdown-vendor": ["react-markdown", "rehype-highlight", "rehype-sanitize", "remark-gfm"],
          "misc-vendor": ["next-themes", "sonner", "tailwind-merge", "clsx", "class-variance-authority", "subscriptions-transport-ws"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/graphql": {
        target: "http://localhost:8080",
        ws: true,
      },
      "/mcp": "http://localhost:8080",
      "/health": "http://localhost:8080",
    },
  },
});
