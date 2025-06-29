import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const dropdownRefs = {
    dashboard: useRef<HTMLButtonElement>(null),
    offerings: useRef<HTMLButtonElement>(null),
    community: useRef<HTMLButtonElement>(null),
    profile: useRef<HTMLButtonElement>(null),
  };

  const headerRef = useRef<HTMLElement>(null);
  const [dropdownPositions, setDropdownPositions] = useState<{ [key: string]: string }>({});
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(prev => (prev === dropdownName ? null : dropdownName));
  };

  const calculateDropdownPosition = useCallback(() => {
    const newPositions: { [key: string]: string } = {};
    const viewportWidth = window.innerWidth;
    for (const key in dropdownRefs) {
      const ref = dropdownRefs[key as keyof typeof dropdownRefs].current;
      if (ref && ref.nextElementSibling) {
        const dropdownContentElement = ref.nextElementSibling as HTMLElement;
        let actualDropdownContentWidth = dropdownContentElement.scrollWidth;
        if (actualDropdownContentWidth === 0) {
          Array.from(dropdownContentElement.children).forEach(child => {
            actualDropdownContentWidth += child.getBoundingClientRect().width;
          });
          actualDropdownContentWidth += (Array.from(dropdownContentElement.children).length - 1) * 16;
          actualDropdownContentWidth += 32;
        }
        const rect = ref.getBoundingClientRect();
        if (rect.left + actualDropdownContentWidth > viewportWidth - 20) {
          newPositions[key] = 'right-0';
        } else {
          newPositions[key] = 'left-0';
        }
      }
    }
    setDropdownPositions(newPositions);
  }, []);

  useEffect(() => {
    calculateDropdownPosition();
    window.addEventListener('resize', calculateDropdownPosition);
    return () => window.removeEventListener('resize', calculateDropdownPosition);
  }, [calculateDropdownPosition]);

  const handleMouseEnterDropdown = (dropdownName: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setActiveDropdown(dropdownName);
  };

  const handleMouseLeaveDropdown = () => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
    setHoverTimeout(timeout);
  };

  const handleClickDropdownButton = (dropdownName: string) => {
    setActiveDropdown(prevActiveDropdown => {
      const nextActiveDropdown = prevActiveDropdown === dropdownName ? null : dropdownName;
      if (nextActiveDropdown) {
        calculateDropdownPosition();
      }
      return nextActiveDropdown;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        { label: 'Sign Out', onClick: handleSignOut, icon: User, path: '/signout' },
    ],
  };

  const getArrowRotationClass = (dropdownName: string) => {
    return activeDropdown === dropdownName ? '' : 'rotate-180';
  };

  const getActiveDropdownClass = (dropdownName: string) => {
    return activeDropdown === dropdownName ? 'text-indigo-700 font-medium border-b-2 border-indigo-700' : '';
  };

  const isSubMenuItemActive = (itemPath: string) => {
    const currentPath = location.pathname.split('?')[0];
    const itemBasePath = itemPath ? itemPath.split('?')[0] : '';
    return currentPath === itemBasePath;
  };

  return (
    <header ref={headerRef} className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-start md:gap-x-4 lg:gap-x-12">
        <Link
          to="/"
          // Responsive Text Added
          className="flex items-center gap-2 font-serif tracking-wide text-indigo-900 flex-shrink-0 text-lg md:text-xl"
          aria-label="Afterlife"
        >
          <BookHeart size={28} className="text-indigo-700" aria-hidden="true" />
          <span className="font-medium">Afterlife</span>
        </Link>

        <div className="flex-grow flex justify-end md:hidden">
            <button
              className="p-2 text-slate-700 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
        </div>

        <nav className="hidden md:flex items-center flex-grow justify-start gap-4 lg:gap-6 xl:gap-8 min-w-0 flex-wrap">
          {user && (
            // Responsive Text Added
            <Link to="/create-memorial" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex-shrink-0 whitespace-nowrap text-sm md:text-base">
              Create Memorial
            </Link>
          )}

            <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('dashboard')} onMouseLeave={handleMouseLeaveDropdown}>
                {/* Responsive Text Added */}
                <button ref={dropdownRefs.dashboard} onClick={() => handleClickDropdownButton('dashboard')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 whitespace-nowrap text-sm md:text-base ${getActiveDropdownClass('dashboard')}`} aria-expanded={activeDropdown === 'dashboard'} aria-haspopup="true">
                    <Settings size={18} aria-hidden="true" />
                    <span>Dashboard</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('dashboard')}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                    {activeDropdown === 'dashboard' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-x-4 gap-y-2 max-w-[calc(100vw-40px)] ${dropdownPositions.dashboard} ${activeDropdown === 'dashboard' ? 'bg-indigo-50' : 'bg-white'}`} role="menu" aria-orientation="horizontal">
                            {dropdownMenus.dashboard.map((item) => (
                                <Link key={item.path} to={item.path} className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap ${isSubMenuItemActive(item.path) ? 'bg-indigo-100 text-indigo-700 font-semibold rounded-md' : ''}`} role="menuitem">
                                    <item.icon size={16} aria-hidden="true" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          
            <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('offerings')} onMouseLeave={handleMouseLeaveDropdown}>
                {/* Responsive Text Added */}
                <button ref={dropdownRefs.offerings} onClick={() => handleClickDropdownButton('offerings')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 whitespace-nowrap text-sm md:text-base ${getActiveDropdownClass('offerings')}`} aria-expanded={activeDropdown === 'offerings'} aria-haspopup="true">
                    <Store size={18} aria-hidden="true" />
                    <span>Curated Memorials</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('offerings')}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                    {activeDropdown === 'offerings' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-x-4 gap-y-2 max-w-[calc(100vw-40px)] ${dropdownPositions.offerings} ${activeDropdown === 'offerings' ? 'bg-indigo-50' : 'bg-white'}`} role="menu" aria-orientation="horizontal">
                            {dropdownMenus.offerings.map((item) => (
                                <Link key={item.path} to={item.path} className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap ${isSubMenuItemActive(item.path) ? 'bg-indigo-100 text-indigo-700 font-semibold rounded-md' : ''}`} role="menuitem">
                                    <item.icon size={16} aria-hidden="true" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          
            <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('community')} onMouseLeave={handleMouseLeaveDropdown}>
                {/* Responsive Text Added */}
                <button ref={dropdownRefs.community} onClick={() => handleClickDropdownButton('community')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 whitespace-nowrap text-sm md:text-base ${getActiveDropdownClass('community')}`} aria-expanded={activeDropdown === 'community'} aria-haspopup="true">
                    <Globe size={18} aria-hidden="true" />
                    <span>Community</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('community')}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                    {activeDropdown === 'community' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-x-4 gap-y-2 max-w-[calc(100vw-40px)] ${dropdownPositions.community} ${activeDropdown === 'community' ? 'bg-indigo-50' : 'bg-white'}`} role="menu" aria-orientation="horizontal">
                            {dropdownMenus.community.map((item) => (
                                <Link key={item.path} to={item.path} className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap ${isSubMenuItemActive(item.path) ? 'bg-indigo-100 text-indigo-700 font-semibold rounded-md' : ''}`} role="menuitem">
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
                <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('profile')} onMouseLeave={handleMouseLeaveDropdown}>
                    {/* Responsive Text Added */}
                    <button ref={dropdownRefs.profile} onClick={() => handleClickDropdownButton('profile')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 whitespace-nowrap text-sm md:text-base ${getActiveDropdownClass('profile')}`} aria-expanded={activeDropdown === 'profile'} aria-haspopup="true">
                        <User size={18} aria-hidden="true" />
                        <span>Profile</span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('profile')}`} aria-hidden="true" />
                    </button>
                    <AnimatePresence>
                        {activeDropdown === 'profile' && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 flex flex-row flex-wrap gap-x-4 gap-y-2 max-w-[calc(100vw-40px)] ${dropdownPositions.profile} ${activeDropdown === 'profile' ? 'bg-indigo-50' : 'bg-white'}`} role="menu" aria-orientation="horizontal">
                                {dropdownMenus.profile.map((item) => (
                                    item.onClick ? (
                                    <button key={item.label} onClick={item.onClick} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap text-left" role="menuitem">
                                        <item.icon size={16} aria-hidden="true" />
                                        <span>{item.label}</span>
                                    </button>
                                    ) : (
                                    <Link key={item.path} to={item.path!} className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap ${isSubMenuItemActive(item.path!) ? 'bg-indigo-100 text-indigo-700 font-semibold rounded-md' : ''}`} role="menuitem">
                                        <item.icon size={16} aria-hidden="true" />
                                        <span>{item.label}</span>
                                    </Link>
                                    )
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              
              <NotificationBell />

              <Link to="/developer/api" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2 flex-shrink-0 text-sm md:text-base">
                <Key size={18} aria-hidden="true" />
                <span>API</span>
              </Link>
              
              {isAdmin && (
                <Link to="/admin" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex items-center gap-2 flex-shrink-0 text-sm md:text-base">
                  <Shield size={18} aria-hidden="true" />
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}
          
          {!user && (
            <>
              {/* Responsive Text Added */}
              <Link to="/login" className="text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-2 py-1 flex-shrink-0 text-sm md:text-base">
                Sign In
              </Link>
              {/* Responsive Text Added */}
              <Link to="/register" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex-shrink-0 text-sm md:text-base">
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
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white border-t border-slate-100"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {user && (
                <Link to="/create-memorial" className="py-2 text-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Create Memorial
                </Link>
              )}

              {user && (
                <div className="border-t border-slate-100 pt-2">
                  <button onClick={() => toggleDropdown('dashboard')} className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700">
                    <div className="flex items-center gap-2">
                      <Settings size={18} aria-hidden="true" />
                      <span>Dashboard</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('dashboard')}`} aria-hidden="true"/>
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'dashboard' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="pl-6 space-y-2 mt-2">
                        {dropdownMenus.dashboard.map((item) => (
                          <Link key={item.path} to={item.path} className={`flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 ${isSubMenuItemActive(item.path) ? 'bg-indigo-50 text-indigo-700 font-semibold rounded-md' : ''}`}>
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
                <button onClick={() => toggleDropdown('offerings')} className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700">
                  <div className="flex items-center gap-2">
                    <Store size={18} aria-hidden="true" />
                    <span>Curated Memorials</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('offerings')}`} aria-hidden="true"/>
                </button>
                <AnimatePresence>
                  {activeDropdown === 'offerings' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="pl-6 space-y-2 mt-2">
                      {dropdownMenus.offerings.map((item) => (
                        <Link key={item.path} to={item.path} className={`flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 ${isSubMenuItemActive(item.path) ? 'bg-indigo-50 text-indigo-700 font-semibold rounded-md' : ''}`}>
                          <item.icon size={16} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <button onClick={() => toggleDropdown('community')} className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700">
                  <div className="flex items-center gap-2">
                    <Globe size={18} aria-hidden="true" />
                    <span>Community</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('community')}`} aria-hidden="true"/>
                </button>
                <AnimatePresence>
                  {activeDropdown === 'community' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="pl-6 space-y-2 mt-2">
                      {dropdownMenus.community.map((item) => (
                        <Link key={item.path} to={item.path} className={`flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 ${isSubMenuItemActive(item.path) ? 'bg-indigo-50 text-indigo-700 font-semibold rounded-md' : ''}`}>
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
                  <button onClick={() => toggleDropdown('profile')} className="w-full flex items-center justify-between py-2 text-slate-700 hover:text-indigo-700">
                    <div className="flex items-center gap-2">
                      <User size={18} aria-hidden="true" />
                      <span>Profile</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('profile')}`} aria-hidden="true"/>
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'profile' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="pl-6 space-y-2 mt-2">
                        {dropdownMenus.profile.map((item) => (
                          item.onClick ? (
                            <button key={item.label} onClick={item.onClick} className={`flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 w-full text-left`}>
                              <item.icon size={16} aria-hidden="true" />
                              <span>{item.label}</span>
                            </button>
                          ) : (
                            <Link key={item.path} to={item.path!} className={`flex items-center gap-2 py-2 text-slate-600 hover:text-indigo-700 ${isSubMenuItemActive(item.path!) ? 'bg-indigo-50 text-indigo-700 font-semibold rounded-md' : ''}`}>
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
                  <Link to="/login" className="py-2 text-slate-700 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md">
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