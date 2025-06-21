// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { sentryVitePlugin } from "file:///home/project/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSBcIkBzZW50cnkvdml0ZS1wbHVnaW5cIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHNlbnRyeVZpdGVQbHVnaW4oe1xuICAgICAgb3JnOiBcInlvdXItb3JnLW5hbWVcIixcbiAgICAgIHByb2plY3Q6IFwibWVtb3JpYW1cIixcbiAgICAgIC8vIEF1dGggdG9rZW4gY2FuIGJlIG9idGFpbmVkIGZyb20gU2VudHJ5IGRhc2hib2FyZFxuICAgICAgYXV0aFRva2VuOiBwcm9jZXNzLmVudi5TRU5UUllfQVVUSF9UT0tFTixcbiAgICAgIC8vIE9ubHkgZW5hYmxlIGluIHByb2R1Y3Rpb25cbiAgICAgIGRpc2FibGU6IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicsXG4gICAgfSksXG4gIF0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gRW5hYmxlIHNvdXJjZSBtYXBzIGZvciBTZW50cnlcbiAgICBzb3VyY2VtYXA6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicsXG4gICAgLy8gT3B0aW1pemUgYnVpbGRcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIC8vIEVuYWJsZSBjb2RlIHNwbGl0dGluZ1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2ZyYW1lci1tb3Rpb24nLCAncmVhY3QtaG90LXRvYXN0JywgJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ3pvZCcsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJ10sXG4gICAgICAgICAgJ2RhdGEtdmVuZG9yJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLCAnZGF0ZS1mbnMnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsd0JBQXdCO0FBR2pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLGlCQUFpQjtBQUFBLE1BQ2YsS0FBSztBQUFBLE1BQ0wsU0FBUztBQUFBO0FBQUEsTUFFVCxXQUFXLFFBQVEsSUFBSTtBQUFBO0FBQUEsTUFFdkIsU0FBUyxRQUFRLElBQUksYUFBYTtBQUFBLElBQ3BDLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxPQUFPO0FBQUE7QUFBQSxJQUVMLFdBQVcsUUFBUSxJQUFJLGFBQWE7QUFBQTtBQUFBLElBRXBDLFFBQVE7QUFBQTtBQUFBLElBRVIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ3pELGFBQWEsQ0FBQyxpQkFBaUIsbUJBQW1CLGNBQWM7QUFBQSxVQUNoRSxlQUFlLENBQUMsbUJBQW1CLE9BQU8scUJBQXFCO0FBQUEsVUFDL0QsZUFBZSxDQUFDLHlCQUF5QixVQUFVO0FBQUEsUUFDckQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
