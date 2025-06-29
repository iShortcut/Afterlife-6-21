import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, BookHeart, User, Package, MessageCircle, Shield, Users, CreditCard, ShoppingBag, UserPlus, Key, Calendar, Settings, ChevronDown, Store, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../notifications/NotificationBell';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data?.role === 'ADMIN');
      } catch (err) {
        console.error('Unexpected error in checkAdminStatus catch block:', err);
        setIsAdmin(false);
      }
    };

    if (user) {
        checkAdminStatus();
    } else {
        setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
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
    setActiveDropdown(null);
  };

  // Adjusted dropdown toggle logic for the specified arrow behavior
  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const dropdownMenus = {
    dashboard: [
      { label: 'Posts', path: '/dashboard?tab=posts', icon: BookHeart },
      { label: 'Memorials', path: '/dashboard?tab=memorials', icon: Users },
      { label: 'About', path: '/dashboard?tab=about', icon: User },
      { label: 'Friends', path: '/dashboard?tab=friends', icon: UserPlus },
      { label: 'Events', path: '/dashboard?tab=events', icon: Calendar },
      { label: 'Media', path: '/dashboard?tab=media', icon: MessageCircle },
    ],
    offerings: [
      { label: 'Services', path: '/services', icon: Package },
      { label: 'Products', path: '/products', icon: Package },
      { label: 'Subscription', path: '/subscription', icon: CreditCard },
      { label: 'Memorial Store', path: '/store', icon: ShoppingBag },
    ],
    community: [
      { label: 'Family members', path: '/family-members', icon: Users },
      { label: 'Friends', path: '/find-friends', icon: UserPlus },
      { label: 'Groups', path: '/groups', icon: Users },
      { label: 'Shared', path: '/shared-memorials', icon: Users },
    ],
    profile: [
      { label: 'Profile Settings', path: '/profile-settings', icon: User },
      { label: 'My Account', path: '/profile', icon: User },
      { label: 'Messages', path: '/chat', icon: MessageCircle },
      { label: 'Calendar', path: '/calendar/settings', icon: Calendar },
      { label: 'My Subscription', path: '/subscription', icon: CreditCard },
      { label: 'Sign Out', onClick: handleSignOut, icon: User },
    ],
  };

  // Helper for arrow rotation class based on active dropdown
  const getArrowRotationClass = (dropdownName: string) => {
    // Arrow UP (^) when closed (default), DOWN (v) when open
    return activeDropdown === dropdownName ? 'rotate-180' : '';
  };
  
  // Helper for active dropdown class with underline
  const getActiveDropdownClass = (dropdownName: string) => {
    return activeDropdown === dropdownName ? 'text-indigo-700 font-medium border-b-2 border-indigo-700' : '';
    // You might need to adjust border-b-2 to border-b-4 or more if the 'bold' effect isn't enough,
    // or use custom CSS for the exact Shopify-like underline.
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Afterlife Logo/Link (serves as Home) */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-serif tracking-wide text-indigo-900"
          aria-label="Afterlife"
        >
          <BookHeart size={28} className="text-indigo-700" aria-hidden="true" />
          <span className="font-medium">Afterlife</span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-700 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8"> {/* Adjusted gap for better spacing */}
          {user && (
            <Link to="/create-memorial" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Create Memorial
            </Link>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('dashboard')}
                className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 ${getActiveDropdownClass('dashboard')}`}
                aria-expanded={activeDropdown === 'dashboard'}
                aria-haspopup="true"
              >
                <Settings size={18} aria-hidden="true" /> {/* Dashboard icon - assuming this is the correct existing one */}
                <span>Dashboard</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${getArrowRotationClass('dashboard')}`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {activeDropdown === 'dashboard' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    // --- Horizontal Layout Changes ---
                    className="absolute left-0 mt-2 bg-white rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-4 min-w-max" // Added flex-row, flex-wrap, gap, min-w-max
                    role="menu"
                    aria-orientation="horizontal" // Changed to horizontal
                  >
                    {dropdownMenus.dashboard.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-700 whitespace-nowrap" // Added whitespace-nowrap
                        role="menuitem"
                      >
                        <item.icon size={16} aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => toggleDropdown('offerings')}
              className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 ${getActiveDropdownClass('offerings')}`}
              aria-expanded={activeDropdown === 'offerings'}
              aria-haspopup="true"
            >
              <Store size={18} aria-hidden="true" /> {/* Icon for Our Offerings */}
              <span>Our Offerings</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${getArrowRotationClass('offerings')}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {activeDropdown === 'offerings' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  // --- Horizontal Layout Changes ---
                  className="absolute left-0 mt-2 bg-white rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-4 min-w-max" // Added flex-row, flex-wrap, gap, min-w-max
                  role="menu"
                  aria-orientation="horizontal"
                >
                  {dropdownMenus.offerings.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-700 whitespace-nowrap" // Added whitespace-nowrap
                      role="menuitem"
                    >
                      <item.icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => toggleDropdown('community')}
              className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 ${getActiveDropdownClass('community')}`}
              aria-expanded={activeDropdown === 'community'}
              aria-haspopup="true"
            >
              <Globe size={18} aria-hidden="true" /> {/* Icon for Community */}
              <span>Community</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${getArrowRotationClass('community')}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {activeDropdown === 'community' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  // --- Horizontal Layout Changes ---
                  className="absolute left-0 mt-2 bg-white rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-4 min-w-max" // Added flex-row, flex-wrap, gap, min-w-max
                  role="menu"
                  aria-orientation="horizontal"
                >
                  {dropdownMenus.community.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-700 whitespace-nowrap" // Added whitespace-nowrap
                      role="menuitem"
                    >
                      <item.icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user && (
            <>
              <NotificationBell /> {/* Bell icon, remains as is */}

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('profile')}
                  className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 ${getActiveDropdownClass('profile')}`}
                  aria-expanded={activeDropdown === 'profile'}
                  aria-haspopup="true"
                >
                  <User size={18} aria-hidden="true" />
                  <span>Profile</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${getArrowRotationClass('profile')}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'profile' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      // --- Horizontal Layout Changes ---
                      className="absolute right-0 mt-2 bg-white rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-4 min-w-max" // Adjusted right-0 for dropdown placement
                      role="menu"
                      aria-orientation="horizontal"
                    >
                      {dropdownMenus.profile.map((item, index) => (
                        item.onClick ? (
                          <button
                            key={index}
                            onClick={item.onClick}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-700 whitespace-nowrap" // Adjusted padding/gap, whitespace
                            role="menuitem"
                          >
                            <item.icon size={16} aria-hidden="true" />
                            <span>{item.label}</span>
                          </button>
                        ) : (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-700 whitespace-nowrap" // Adjusted padding/gap, whitespace
                            role="menuitem"
                          >
                            <item.icon size={16} aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/developer/api" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2">
                <Key size={18} aria-hidden="true" />
                <span>API</span>
              </Link>

              {isAdmin && (
                <Link to="/admin" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2">
                  <Shield size={18} aria-hidden="true" />
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}

          {!user && (
            <>
              <Link to="/login" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Create Account
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white border-t border-slate-100"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {/* Removed explicit "Home" link from mobile */}
              {user && (
                <Link to="/create-memorial" className="py-2 text-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Create Memorial
                </Link>
              )}

              {/* Mobile Dropdowns (These remain vertical as per standard mobile UX) */}
              {user && (
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => toggleDropdown('dashboard')}
                    className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700"
                  >
                    <div className="flex items-center gap-2">
                      <Settings size={18} aria-hidden="true" />
                      <span>Dashboard</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${getArrowRotationClass('dashboard')}`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === 'dashboard' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pl-6 space-y-2 mt-2" // Mobile dropdowns remain vertical
                      >
                        {dropdownMenus.dashboard.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700"
                          >
                            <item.icon size={16} aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={() => toggleDropdown('offerings')}
                  className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700"
                >
                  <div className="flex items-center gap-2">
                    <Store size={18} aria-hidden="true" />
                    <span>Our Offerings</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${getArrowRotationClass('offerings')}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'offerings' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pl-6 space-y-2 mt-2" // Mobile dropdowns remain vertical
                    >
                      {dropdownMenus.offerings.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700"
                        >
                          <item.icon size={16} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={() => toggleDropdown('community')}
                  className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700"
                >
                  <div className="flex items-center gap-2">
                    <Globe size={18} aria-hidden="true" />
                    <span>Community</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${getArrowRotationClass('community')}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'community' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pl-6 space-y-2 mt-2" // Mobile dropdowns remain vertical
                    >
                      {dropdownMenus.community.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700"
                        >
                          <item.icon size={16} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {user && (
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => toggleDropdown('profile')}
                    className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700"
                  >
                    <div className="flex items-center gap-2">
                      <User size={18} aria-hidden="true" />
                      <span>Profile</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${getArrowRotationClass('profile')}`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === 'profile' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pl-6 space-y-2 mt-2" // Mobile dropdowns remain vertical
                      >
                        {dropdownMenus.profile.map((item, index) => (
                          item.onClick ? (
                            <button
                              key={index}
                              onClick={item.onClick}
                              className="flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 w-full text-left"
                            >
                              <item.icon size={16} aria-hidden="true" />
                              <span>{item.label}</span>
                            </button>
                          ) : (
                            <Link
                              key={item.path}
                              to={item.path}
                              className="flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700"
                            >
                              <item.icon size={16} aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          )
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {user && (
                <>
                  <Link to="/developer/api" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2">
                    <Key size={18} aria-hidden="true" />
                    <span>API</span>
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md flex items-center gap-2">
                      <Shield size={18} aria-hidden="true" />
                      <span>Admin</span>
                    </Link>
                  )}
                </>
              )}

              {!user && (
                <>
                  <Link to="/login" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ring-indigo-500 focus:ring-offset-2 rounded-md">
                    Sign In
                  </Link>
                  <Link to="/register" className="py-2 text-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;