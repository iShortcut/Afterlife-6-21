// src/components/layout/Header.tsx

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, BookHeart, User, Package, MessageCircle, Shield, Users, CreditCard, ShoppingBag, UserPlus, Key, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../notifications/NotificationBell';
import AIChatbotWidget from '../ai/AIChatbotWidget';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate(); // Not used in the snippet you provided, but kept if needed elsewhere
  const location = useLocation();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // console.log('[Header] Checking admin status for user:', user.id); // Optional: for debugging
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle(); // <<<--- This is the corrected part

        // console.log('[Header] Admin status check - Data:', data, 'Error:', error); // Optional: for debugging

        if (error) {
          // With maybeSingle(), an error here implies a more significant issue than just "0 rows".
          // PGRST116 (0 rows) would result in data being null, not an error object here.
          console.error('Error checking admin status (Supabase query failed):', error);
          setIsAdmin(false); // Default to false on any actual query error
          return;
        }
        // If data is null (profile not found or role is null), isAdmin will correctly be false.
        setIsAdmin(data?.role === 'ADMIN');
      } catch (err) { 
        console.error('Unexpected error in checkAdminStatus catch block:', err);
        setIsAdmin(false);
      }
    };

    // Call checkAdminStatus only if user object exists
    if (user) {
        checkAdminStatus();
    } else {
        setIsAdmin(false); // No user, so not an admin
    }
  }, [user]); // supabase can be added to dependencies if it's not stable, but usually it is.

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/'; 
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-serif tracking-wide text-indigo-900"
          aria-label="Afterlife Home"
        >
          <BookHeart size={28} className="text-indigo-700" aria-hidden="true" />
          <span className="font-medium">Afterlife</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-8">
          <Link to="/" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1"> Home </Link>
          <Link to="/products" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <span>Products</span> </Link>
          <Link to="/store" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <ShoppingBag size={18} aria-hidden="true" /> <span>Store</span> </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1"> Dashboard </Link>
              <Link to="/shared-memorials" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <Users size={18} aria-hidden="true" /> <span>Shared</span> </Link>
              <Link to="/groups" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <UserPlus size={18} aria-hidden="true" /> <span>Groups</span> </Link>
              <Link to="/chat" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <MessageCircle size={18} aria-hidden="true" /> <span>Messages</span> </Link>
              <Link to="/subscription" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <CreditCard size={18} aria-hidden="true" /> <span>Subscription</span> </Link>
              <Link to="/create-memorial" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"> Create Memorial </Link>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Link to="/profile-settings" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <User size={18} aria-hidden="true" /> <span>Profile</span> </Link>
              </div>
              <Link to="/calendar/settings" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <Calendar size={18} aria-hidden="true" /> <span>Calendar</span> </Link>
              <Link to="/developer/api" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <Key size={18} aria-hidden="true" /> <span>API</span> </Link>
              {isAdmin && ( <Link to="/admin" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2"> <Shield size={18} aria-hidden="true" /> <span>Admin</span> </Link> )}
              <button onClick={handleSignOut} className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1"> Sign Out </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1"> Sign In </Link>
              <Link to="/register" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"> Create Account </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 text-slate-700 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md" onClick={toggleMenu} aria-expanded={isMenuOpen} aria-controls="mobile-menu" aria-label={isMenuOpen ? "Close menu" : "Open menu"}>
          {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav id="mobile-menu" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="md:hidden overflow-hidden bg-white border-t border-slate-100">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link to="/" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"> Home </Link>
              <Link to="/products" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <span>Products</span> </Link>
              <Link to="/store" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <ShoppingBag size={18} aria-hidden="true" /> <span>Store</span> </Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"> Dashboard </Link>
                  <Link to="/shared-memorials" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <Users size={18} aria-hidden="true" /> <span>Shared With Me</span> </Link>
                  <Link to="/groups" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <UserPlus size={18} aria-hidden="true" /> <span>Groups</span> </Link>
                  <Link to="/chat" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <MessageCircle size={18} aria-hidden="true" /> <span>Messages</span> </Link>
                  <Link to="/subscription" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <CreditCard size={18} aria-hidden="true" /> <span>Subscription</span> </Link>
                  <Link to="/create-memorial" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"> Create Memorial </Link>
                  <Link to="/profile-settings" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <User size={18} aria-hidden="true" /> <span>Profile</span> </Link>
                  <Link to="/calendar/settings" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <Calendar size={18} aria-hidden="true" /> <span>Calendar</span> </Link>
                  <Link to="/developer/api" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <Key size={18} aria-hidden="true" /> <span>API</span> </Link>
                  {isAdmin && ( <Link to="/admin" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2"> <Shield size={18} aria-hidden="true" /> <span>Admin</span> </Link> )}
                  <button onClick={handleSignOut} className="py-2 text-left text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md w-full"> Sign Out </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"> Sign In </Link>
                  <Link to="/register" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"> Create Account </Link>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* AI Chatbot Widget */}
      {user && <AIChatbotWidget />}
    </header>
  );
};

export default Header;