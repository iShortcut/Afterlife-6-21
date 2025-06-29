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
        const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
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
      if (ref?.nextElementSibling) {
        const dropdownContentElement = ref.nextElementSibling as HTMLElement;
        const rect = ref.getBoundingClientRect();
        const dropdownWidth = dropdownContentElement.offsetWidth > 0 ? dropdownContentElement.offsetWidth : 250;
        if (rect.left + dropdownWidth > viewportWidth - 20) {
          newPositions[key] = 'right-0';
        } else {
          newPositions[key] = 'left-0';
        }
      }
    }
    setDropdownPositions(newPositions);
  }, []);

  useEffect(() => {
    if (activeDropdown) calculateDropdownPosition();
    window.addEventListener('resize', calculateDropdownPosition);
    return () => window.removeEventListener('resize', calculateDropdownPosition);
  }, [activeDropdown, calculateDropdownPosition]);

  const handleMouseEnterDropdown = (dropdownName: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setActiveDropdown(dropdownName);
  };

  const handleMouseLeaveDropdown = () => {
    const timeout = setTimeout(() => setActiveDropdown(null), 150);
    setHoverTimeout(timeout);
  };

  const handleClickDropdownButton = (dropdownName: string) => {
    setActiveDropdown(prev => (prev === dropdownName ? null : dropdownName));
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownMenus = {
    dashboard: [ { label: 'Posts', path: '/dashboard?tab=posts', icon: BookHeart }, { label: 'Memorials', path: '/dashboard?tab=memorials', icon: Users }, { label: 'About', path: '/dashboard?tab=about', icon: User }, { label: 'Friends', path: '/dashboard?tab=friends', icon: UserPlus }, { label: 'Events', path: '/dashboard?tab=events', icon: Calendar }, { label: 'Media', path: '/dashboard?tab=media', icon: MessageCircle }, ],
    offerings: [ { label: 'Services', path: '/services', icon: Package }, { label: 'Products', path: '/products', icon: Package }, { label: 'Subscription', path: '/subscription', icon: CreditCard }, { label: 'Memorial Store', path: '/store', icon: ShoppingBag }, ],
    community: [ { label: 'Family members', path: '/family-members', icon: Users }, { label: 'Friends', path: '/find-friends', icon: UserPlus }, { label: 'Groups', path: '/groups', icon: Users }, { label: 'Shared', path: '/shared-memorials', icon: Users }, ],
    profile: [ { label: 'Profile Settings', path: '/profile-settings', icon: User }, { label: 'My Account', path: '/profile', icon: User }, { label: 'Messages', path: '/chat', icon: MessageCircle }, { label: 'Calendar', path: '/calendar/settings', icon: Calendar }, { label: 'My Subscription', path: '/subscription', icon: CreditCard }, { label: 'Sign Out', onClick: handleSignOut, icon: User, path: '/signout' }, ],
  };

  const getArrowRotationClass = (dropdownName: string) => activeDropdown === dropdownName ? '' : 'rotate-180';
  const getActiveDropdownClass = (dropdownName: string) => activeDropdown === dropdownName ? 'text-indigo-700 font-medium border-b-2 border-indigo-700' : '';
  const isSubMenuItemActive = (itemPath: string) => location.pathname.split('?')[0] === (itemPath ? itemPath.split('?')[0] : '');

  const renderDropdownItems = (menuName: keyof typeof dropdownMenus) => {
    return dropdownMenus[menuName].map((item) => (
      item.onClick ? (
        <button key={item.label} onClick={item.onClick} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap text-left w-full">
          <item.icon size={16} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ) : (
        <Link key={item.path} to={item.path!} className={`flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-indigo-700 whitespace-nowrap ${isSubMenuItemActive(item.path!) ? 'bg-indigo-100 text-indigo-700 font-semibold rounded-md' : ''}`}>
          <item.icon size={16} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      )
    ));
  };
  
  return (
    <header ref={headerRef} className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-start md:gap-x-4 lg:gap-x-12">
        <Link to="/" className="flex items-center gap-2 font-serif tracking-wide text-indigo-900 flex-shrink-0 text-lg md:text-xl" aria-label="Afterlife">
          <BookHeart size={28} className="text-indigo-700" aria-hidden="true" />
          <span className="font-medium">Afterlife</span>
        </Link>

        <div className="flex-grow flex justify-end md:hidden">
          <button onClick={toggleMenu} className="p-2 text-slate-700 hover:text-indigo-700" aria-label="Toggle Menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="hidden md:flex items-center flex-grow justify-start gap-4 lg:gap-6 xl:gap-8 min-w-0 flex-wrap">
          {user && (
            <Link to="/create-memorial" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap text-sm md:text-base">
              Create Memorial
            </Link>
          )}

          {/* Reverted to original structure and applied CSS Grid fix to dropdowns */}
          <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('dashboard')} onMouseLeave={handleMouseLeaveDropdown}>
            <button ref={dropdownRefs.dashboard} onClick={() => handleClickDropdownButton('dashboard')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 ...`}>
              <Settings size={18} /><span>Dashboard</span><ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('dashboard')}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'dashboard' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 gap-2 ${dropdownPositions.dashboard} bg-white grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] w-max max-w-screen-md`}>
                  {renderDropdownItems('dashboard')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('offerings')} onMouseLeave={handleMouseLeaveDropdown}>
            <button ref={dropdownRefs.offerings} onClick={() => handleClickDropdownButton('offerings')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 ...`}>
              <Store size={18} /><span>Curated Memorials</span><ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('offerings')}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'offerings' && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 gap-2 ${dropdownPositions.offerings} bg-white grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] w-max max-w-screen-md`}>
                  {renderDropdownItems('offerings')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('community')} onMouseLeave={handleMouseLeaveDropdown}>
             <button ref={dropdownRefs.community} onClick={() => handleClickDropdownButton('community')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 ...`}>
               <Globe size={18} /><span>Community</span><ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('community')}`} />
             </button>
             <AnimatePresence>
              {activeDropdown === 'community' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 gap-2 ${dropdownPositions.community} bg-white grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] w-max max-w-screen-md`}>
                    {renderDropdownItems('community')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user && (
            <>
              <div className="relative" onMouseEnter={() => handleMouseEnterDropdown('profile')} onMouseLeave={handleMouseLeaveDropdown}>
                <button ref={dropdownRefs.profile} onClick={() => handleClickDropdownButton('profile')} className={`flex items-center gap-1 text-slate-700 hover:text-indigo-700 ...`}>
                  <User size={18} /><span>Profile</span><ChevronDown size={16} className={`transition-transform duration-200 ${getArrowRotationClass('profile')}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'profile' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute mt-2 rounded-md shadow-lg z-10 p-4 gap-2 ${dropdownPositions.profile} bg-white grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] w-max max-w-screen-md`}>
                      {renderDropdownItems('profile')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <NotificationBell />
              <Link to="/developer/api" className="text-slate-700 hover:text-indigo-700 p-2 rounded-md"><Key size={18} /></Link>
              {isAdmin && <Link to="/admin" className="text-slate-700 hover:text-indigo-700 p-2 rounded-md"><Shield size={18} /></Link>}
            </>
          )}

          {!user && (
            <>
              <Link to="/login" className="text-slate-700 hover:text-indigo-700 transition-colors px-3 py-2 rounded-md text-sm md:text-base">Sign In</Link>
              <Link to="/register" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm md:text-base">Create Account</Link>
            </>
          )}
        </nav>
      </div>

       {/* Mobile Navigation (remains vertical) */}
       <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden overflow-hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {/* Mobile menu content goes here, simplified for clarity */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
