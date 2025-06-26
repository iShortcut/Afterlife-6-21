// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { sentryVitePlugin } from "file:///home/project/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-org-name",
      project: "memoriam",
      // Auth token can be obtained from Sentry dashboard
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Only enable in production
      disable: process.env.NODE_ENV !== "production"
    })
  ],
  // --- [נוסף] הגדרת נתיבים מקוצרים עבור Vite ---
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // ---------------------------------------------
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    // Enable source maps for Sentry
    sourcemap: process.env.NODE_ENV === "production",
    // Optimize build
    minify: "terser",
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["framer-motion", "react-hot-toast", "lucide-react"],
          "form-vendor": ["react-hook-form", "zod", "@hookform/resolvers"],
          "data-vendor": ["@supabase/supabase-js", "date-fns"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjsvLyAtLS1cbi8vIEZpbGU6IHZpdGUuY29uZmlnLnRzXG4vLyBMYXN0IFVwZGF0ZWQ6IDIwMjUtMDYtMjAgMTc6MjM6MThcbi8vIC0tLVxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgc2VudHJ5Vml0ZVBsdWdpbiB9IGZyb20gXCJAc2VudHJ5L3ZpdGUtcGx1Z2luXCI7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJzsgLy8gPC0tLSBbXHUwNUUwXHUwNUQ1XHUwNUUxXHUwNUUzXSBcdTA1RDlcdTA1RDlcdTA1RDFcdTA1RDVcdTA1RDAgXHUwNURFXHUwNUQ1XHUwNUQzXHUwNUQ1XHUwNURDIFx1MDVFMFx1MDVEM1x1MDVFOFx1MDVFOVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgc2VudHJ5Vml0ZVBsdWdpbih7XG4gICAgICBvcmc6IFwieW91ci1vcmctbmFtZVwiLFxuICAgICAgcHJvamVjdDogXCJtZW1vcmlhbVwiLFxuICAgICAgLy8gQXV0aCB0b2tlbiBjYW4gYmUgb2J0YWluZWQgZnJvbSBTZW50cnkgZGFzaGJvYXJkXG4gICAgICBhdXRoVG9rZW46IHByb2Nlc3MuZW52LlNFTlRSWV9BVVRIX1RPS0VOLFxuICAgICAgLy8gT25seSBlbmFibGUgaW4gcHJvZHVjdGlvblxuICAgICAgZGlzYWJsZTogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyxcbiAgICB9KSxcbiAgXSxcblxuICAvLyAtLS0gW1x1MDVFMFx1MDVENVx1MDVFMVx1MDVFM10gXHUwNUQ0XHUwNUQyXHUwNUQzXHUwNUU4XHUwNUVBIFx1MDVFMFx1MDVFQVx1MDVEOVx1MDVEMVx1MDVEOVx1MDVERCBcdTA1REVcdTA1RTdcdTA1RDVcdTA1RTZcdTA1RThcdTA1RDlcdTA1REQgXHUwNUUyXHUwNUQxXHUwNUQ1XHUwNUU4IFZpdGUgLS0tXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxuICBidWlsZDoge1xuICAgIC8vIEVuYWJsZSBzb3VyY2UgbWFwcyBmb3IgU2VudHJ5XG4gICAgc291cmNlbWFwOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgIC8vIE9wdGltaXplIGJ1aWxkXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICAvLyBFbmFibGUgY29kZSBzcGxpdHRpbmdcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAndWktdmVuZG9yJzogWydmcmFtZXItbW90aW9uJywgJ3JlYWN0LWhvdC10b2FzdCcsICdsdWNpZGUtcmVhY3QnXSxcbiAgICAgICAgICAnZm9ybS12ZW5kb3InOiBbJ3JlYWN0LWhvb2stZm9ybScsICd6b2QnLCAnQGhvb2tmb3JtL3Jlc29sdmVycyddLFxuICAgICAgICAgICdkYXRhLXZlbmRvcic6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJywgJ2RhdGUtZm5zJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBSUEsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsd0JBQXdCO0FBQ2pDLE9BQU8sVUFBVTtBQVBqQixJQUFNLG1DQUFtQztBQVV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixpQkFBaUI7QUFBQSxNQUNmLEtBQUs7QUFBQSxNQUNMLFNBQVM7QUFBQTtBQUFBLE1BRVQsV0FBVyxRQUFRLElBQUk7QUFBQTtBQUFBLE1BRXZCLFNBQVMsUUFBUSxJQUFJLGFBQWE7QUFBQSxJQUNwQyxDQUFDO0FBQUEsRUFDSDtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBLElBRUwsV0FBVyxRQUFRLElBQUksYUFBYTtBQUFBO0FBQUEsSUFFcEMsUUFBUTtBQUFBO0FBQUEsSUFFUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDekQsYUFBYSxDQUFDLGlCQUFpQixtQkFBbUIsY0FBYztBQUFBLFVBQ2hFLGVBQWUsQ0FBQyxtQkFBbUIsT0FBTyxxQkFBcUI7QUFBQSxVQUMvRCxlQUFlLENBQUMseUJBQXlCLFVBQVU7QUFBQSxRQUNyRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
