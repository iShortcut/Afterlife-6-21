// ---
// File: src/main.tsx
// Last Updated: 2025-06-20 18:05:12
// ---
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// --- [נוסף] ייבוא הרכיבים הנדרשים ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// --- [נוסף] יצירת מופע של ה-client ---
// This client object will manage the data cache for the entire application.
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* --- [נוסף] עטיפת האפליקציה בספק --- */}
      {/* This makes the data client available to all components and hooks. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster position="bottom-center" />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);