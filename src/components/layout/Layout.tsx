import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import FloatingEventsTab from '../events/FloatingEventsTab';
import { useAuth } from '../../context/AuthContext';
import { Toaster } from 'react-hot-toast'; // --- ADDED THIS IMPORT ---

const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* --- ADDED THIS COMPONENT --- */}
      {/* This component listens for toast() calls and displays them */}
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 5000,
        }}
      />

      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      
      {user && !isAdminPage && <FloatingEventsTab />}
    </div>
  );
};

export default Layout;