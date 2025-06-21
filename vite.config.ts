// ---
// File: vite.config.ts
// Last Updated: 2025-06-20 17:23:18
// ---
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path'; // <--- [נוסף] ייבוא מודול נדרש

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-org-name",
      project: "memoriam",
      // Auth token can be obtained from Sentry dashboard
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Only enable in production
      disable: process.env.NODE_ENV !== 'production',
    }),
  ],

  // --- [נוסף] הגדרת נתיבים מקוצרים עבור Vite ---
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ---------------------------------------------

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Enable source maps for Sentry
    sourcemap: process.env.NODE_ENV === 'production',
    // Optimize build
    minify: 'terser',
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'react-hot-toast', 'lucide-react'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'data-vendor': ['@supabase/supabase-js', 'date-fns'],
        },
      },
    },
  },
});