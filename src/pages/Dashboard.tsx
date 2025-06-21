import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Users, Edit, Calendar, MessageSquare, FileImage, Info, UserPlus, MoreHorizontal, BookOpen, Settings as SettingsIcon, ChevronDown, Heart, SlidersHorizontal, ArrowUpDown, X, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import MemorialList, { MemorialFilterType } from '../components/memorials/MemorialList';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ContentSuggestionWidget from '../components/ai/ContentSuggestionWidget';
import UserProfileView from '../components/profile/UserProfileView';
import { Profile, Memorial } from '../types';
import { supabase } from '../lib/supabase';
import EditCoverModal from '../components/profile/EditCoverModal';
// >>> הסרתי את השורה הזו: import { UpcomingEventsWidget } from '../components/Dashboard';

interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

const sortOptions: SortOption[] = [
  { field: 'created_at', direction: 'desc', label: 'Newest First' },
  { field: 'created_at', direction: 'asc', label: 'Oldest First' },
  { field: 'title', direction: 'asc', label: 'Title (A-Z)' },
  { field: 'title', direction: 'desc', label: 'Title (Z-A)' },
];

interface TabConfig {
  id: 'Posts' | 'Memorials' | 'About' | 'Friends' | 'Events' | 'Media';
  label: string;
  icon: React.ElementType;
}

const ALL_TABS_CONFIG: TabConfig[] = [
  { id: 'Posts', label: 'Posts', icon: BookOpen },
  { id: 'Memorials', label: 'Memorials', icon: Users },
  { id: 'About', label: 'About', icon: Info },
  { id: 'Friends', label: 'Friends', icon: UserPlus },
  { id: 'Events', label: 'Events', icon: Calendar },
  { id: 'Media', label: 'Media', icon: FileImage },
];

const MORE_BUTTON_MIN_WIDTH = 100;

// Utility debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
};

const MoreDropdownPortal = ({ isOpen, targetRef, children, onClose }: { isOpen: boolean; targetRef: React.RefObject<HTMLButtonElement>; children: React.ReactNode; onClose: () => void; }) => {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // Example width, adjust as needed
      let leftPosition = rect.left + window.scrollX;
      if (rect.left + window.scrollX + dropdownWidth > window.innerWidth) {
        leftPosition = rect.right + window.scrollX - dropdownWidth;
      }
      setPosition({ top: rect.bottom + window.scrollY, left: leftPosition, width: dropdownWidth });
    }
  }, [isOpen, targetRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          targetRef.current && !targetRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, targetRef]);

  if (!isOpen || !position) return null;

  return ReactDOM.createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{ position: 'absolute', top: `${position.top + 8}px`, left: `${position.left}px`, width: `${position.width}px` }}
      className="bg-white rounded-md shadow-lg z-[100] border border-slate-200 overflow-y-auto max-h-60"
    >
      {children}
    </motion.div>,
    document.body
  );
};

const Dashboard = () => {
  const { user, profile: authContextProfile, setProfile: setAuthContextProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [userProfileData, setUserProfileData] = useState<Profile | null>(authContextProfile || null);
  const [profileLoading, setProfileLoading] = useState(!authContextProfile && !!user);
  const [activeContentTabId, setActiveContentTabId] = useState<TabConfig['id']>('Memorials');
  const [visibleTabs, setVisibleTabs] = useState<TabConfig[]>([...ALL_TABS_CONFIG]);
  const [moreDropdownTabs, setMoreDropdownTabs] = useState<TabConfig[]>([]);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const individualTabRefs = useRef<(HTMLButtonElement | null)[]>(ALL_TABS_CONFIG.map(() => null));
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterType, setFilterType] = useState<MemorialFilterType>(user ? 'owned' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);

  const handleEditCoverClick = () => {
    setIsEditCoverModalOpen(true);
  };

  const refreshUserProfileAndAuthContext = useCallback(async () => {
    if (user && user.id) {
      setProfileLoading(true);
      if (refreshUser) {
        await refreshUser();
      } else {
        await supabase.auth.refreshSession();
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error refetching profile for Dashboard after cover update:", profileError);
        // Potentially show a user-facing error
      } else {
        setUserProfileData(profileData as Profile | null);
        if (setAuthContextProfile) {
          setAuthContextProfile(profileData as Profile | null);
        }
      }
      setProfileLoading(false);
    }
  }, [user, setAuthContextProfile, refreshUser]);

  useEffect(() => {
    setFilterType(user ? 'owned' : 'all');
  }, [user]);

  useEffect(() => {
    if (authContextProfile) {
      setUserProfileData(authContextProfile);
      setProfileLoading(false);
    } else if (user && user.id) {
      const fetchInitialProfileDetails = async () => {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching initial profile for Dashboard:", error);
          setUserProfileData(null); // Or handle error more gracefully
        } else {
          setUserProfileData(data as Profile | null);
        }
        setProfileLoading(false);
      };
      fetchInitialProfileDetails();
    } else {
      setUserProfileData(null);
      setProfileLoading(false);
    }
  }, [user, authContextProfile]);

  const fetchMemorials = useCallback(async () => {
    setIsLoading(true);
    let selectString = `
      id, title, bio, birth_date, death_date, visibility, profile_image_url, 
      cover_image_url, owner_id, created_at, updated_at, status, 
      relationship_description, org_id, theme_id, tier,
      owner:profiles (id, full_name, username, avatar_url),
      tributes:tributes(count)
    `;
    let query = supabase.from('memorials').select(selectString);

    if (user) {
      if (filterType === 'owned') {
        query = query.eq('owner_id', user.id);
      } else if (filterType === 'shared') {
        const { data: sharedData, error: sharesError } = await supabase.from('memorial_shares').select('memorial_id').eq('shared_with_user_id', user.id);
        if (sharesError) { console.error("[Dashboard] Error fetching shared memorial IDs:", sharesError); setIsLoading(false); setMemorials([]); return; }
        const idsFromShares = sharedData?.map((s) => s.memorial_id) || [];
        
        if (searchQuery && searchQuery.trim() !== '') {
          let ownedIdsForSearch: string[] = [];
          const { data: ownedDataResult, error: ownedError } = await supabase.from('memorials').select('id').eq('owner_id', user.id);
          if (ownedError) { console.error("Error fetching owned for 'shared' search:", ownedError); } 
          else { ownedIdsForSearch = ownedDataResult?.map(m => m.id) || []; }
          const searchableIds = Array.from(new Set([...ownedIdsForSearch, ...idsFromShares]));
          if (searchableIds.length === 0) { setMemorials([]); setIsLoading(false); return; }
          query = query.in('id', searchableIds);
        } else {
          if (idsFromShares.length === 0) { setMemorials([]); setIsLoading(false); return; }
          query = query.in('id', idsFromShares);
        }
      } else if (filterType === 'all') {
        let ownedIds: string[] = [];
        let sharedIdsFromShares: string[] = [];
        const { data: ownedDataResult, error: ownedError } = await supabase.from('memorials').select('id').eq('owner_id', user.id);
        if (ownedError) { console.error("Error fetching owned for 'all':", ownedError); } 
        else { ownedIds = ownedDataResult?.map(m => m.id) || []; }
        
        const { data: sharedDataResult, error: sharedError } = await supabase.from('memorial_shares').select('memorial_id').eq('shared_with_user_id', user.id);
        if (sharedError) { console.error("Error fetching shared for 'all':", sharedError); } 
        else { sharedIdsFromShares = sharedDataResult?.map(s => s.memorial_id) || []; }
        
        const allRelevantIds = Array.from(new Set([...ownedIds, ...sharedIdsFromShares]));
        if (allRelevantIds.length === 0 && (ownedError || sharedError)) { }
        if (allRelevantIds.length > 0) {
            query = query.in('id', allRelevantIds);
        } else if (!ownedError && !sharedError) { setMemorials([]); setIsLoading(false); return; }
      }
    } else {
      query = query.eq('visibility', 'public');
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const plainQuery = searchQuery.trim().split(/\s+/).filter(Boolean).join(' & ');
      if (plainQuery) {
        query = query.textSearch('fts_document_vector', plainQuery, { config: 'english', type: 'plain' });
      }
    }

    if (statusFilter) query = query.eq('status', statusFilter);
    if (dateRange.from) query = query.gte('created_at', dateRange.from);
    if (dateRange.to) query = query.lte('created_at', dateRange.to);

    query = query.order(selectedSort.field, { ascending: selectedSort.direction === 'asc' });

    const { data, error: fetchDbError } = await query;

    if (fetchDbError) {
      console.error("Error in fetchMemorials query:", fetchDbError);
      setMemorials([]);
    } else {
      const processedData = (data || []).map((m: any) => ({ 
        ...m, 
        tributes_count: Array.isArray(m.tributes) ? (m.tributes[0]?.count || 0) : 0 
      }));
      setMemorials(processedData as Memorial[]);
    }
    setIsLoading(false);
  }, [user, filterType, searchQuery, statusFilter, dateRange, selectedSort]);

  useEffect(() => {
    fetchMemorials();
  }, [fetchMemorials]);

  const calculateTabsLayout = useCallback(() => {
    if (!tabsContainerRef.current || individualTabRefs.current.some((ref, idx) => ALL_TABS_CONFIG[idx] && ref === null && ALL_TABS_CONFIG.length > 0)) {
      return;
    }

    const containerWidth = tabsContainerRef.current.getBoundingClientRect().width;
    let cumulativeWidth = 0;
    const newVisible: TabConfig[] = [];
    const newMore: TabConfig[] = [];

    for (let i = 0; i < ALL_TABS_CONFIG.length; i++) {
      const tabConfig = ALL_TABS_CONFIG[i];
      const tabElement = individualTabRefs.current[i];
      let tabWidth;

      if (!tabElement) {
        tabWidth = 120;
      } else {
        const style = getComputedStyle(tabElement);
        tabWidth = tabElement.offsetWidth + parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
      }
      
      const spaceForMoreButtonIfNeeded = (newMore.length === 0 && i < ALL_TABS_CONFIG.length - 1 && (cumulativeWidth + tabWidth + MORE_BUTTON_MIN_WIDTH > containerWidth) ) ? MORE_BUTTON_MIN_WIDTH : 0;

      if (cumulativeWidth + tabWidth + spaceForMoreButtonIfNeeded <= containerWidth) {
        newVisible.push(tabConfig);
        cumulativeWidth += tabWidth;
      } else {
        newMore.push(tabConfig);
      }
    }
    
    if (newMore.length > 0 && newVisible.length > 0) {
      let tempVisibleWidth = 0;
      newVisible.forEach((vt) => {
        const elIndex = ALL_TABS_CONFIG.findIndex(t => t.id === vt.id);
        const el = individualTabRefs.current[elIndex];
        if (el) {
          const style = getComputedStyle(el);
          tempVisibleWidth += el.offsetWidth + parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        } else {
          tempVisibleWidth += 120;
        }
      });

      if (tempVisibleWidth + MORE_BUTTON_MIN_WIDTH > containerWidth) {
        const lastVisible = newVisible.pop();
        if (lastVisible) {
          newMore.unshift(lastVisible);
        }
      }
    }

    setVisibleTabs(newVisible);
    setMoreDropdownTabs(newMore);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateTabsLayout();
    }, 150);

    const debouncedCalculateLayout = debounce(calculateTabsLayout, 150);
    window.addEventListener('resize', debouncedCalculateLayout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', debouncedCalculateLayout);
    };
  }, [calculateTabsLayout]);

  const handleTabClick = (tabId: TabConfig['id'] | 'More') => {
    if (tabId === 'More') {
      setIsMoreDropdownOpen(prev => !prev);
    } else {
      setActiveContentTabId(tabId);
      setIsMoreDropdownOpen(false);
    }
  };
  
  const debouncedSetSearchQuery = useCallback(debounce((value: string) => {
    setSearchQuery(value);
  }, 500), []);

  const handleDashboardSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearchQuery(event.target.value);
  };

  const clearAdvancedFilters = () => {
    setStatusFilter(null);
    setDateRange({ from: null, to: null });
    setSelectedSort(sortOptions[0]);
  };

  const coverImageUrl = userProfileData?.cover_image_url || user?.user_metadata?.cover_image_url || 'https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  const avatarImageUrl = userProfileData?.avatar_url || user?.user_metadata?.avatar_url || 'https://images.pexels.com/photos/19721600/pexels-photo-19721600.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  
  const heroStyle = { backgroundImage: `url(${coverImageUrl})` };
  const avatarStyle = { backgroundImage: `url(${avatarImageUrl})` };

  const getVisuallyActiveTabInBar = () => {
    if (moreDropdownTabs.some(t => t.id === activeContentTabId) && moreDropdownTabs.length > 0) {
      return 'More';
    }
    return activeContentTabId;
  };
  const currentActiveTabInBar = getVisuallyActiveTabInBar();

  const controlButtonWidth = "w-[180px]"; 
  const outlineButtonHoverClasses = "hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700";
  const outlineButtonActiveClasses = "active:bg-indigo-100 active:border-indigo-500";

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero Area */}
      <div className="bg-slate-700 h-48 md:h-64 w-full mb-4 relative rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={heroStyle}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        <div className="absolute top-4 right-4">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
            onClick={handleEditCoverClick}
          >
            <Edit size={14} className="mr-1.5" /> Edit Cover
          </Button>
        </div>
        <div className="absolute -bottom-12 md:-bottom-16 left-6">
          <div className="relative group">
            <div 
              className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-900 shadow-lg"
              style={avatarStyle}
            ></div>
            <Link 
              to="/profile-settings" 
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              title="Edit Profile Photo"
            >
              <Edit size={24} className="text-white" />
            </Link>
          </div>
        </div>
        <div className="absolute bottom-4 left-36 md:left-44 text-white">
          <h1 className="text-xl md:text-2xl font-bold drop-shadow-md">{userProfileData?.full_name || user?.user_metadata?.full_name || 'User Name'}</h1>
          <p className="text-xs md:text-sm text-slate-200 drop-shadow-sm">Memorial Curator</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-16 md:mt-20">
        <div className="w-full md:flex-grow space-y-6">
          {/* Tabs Navigation */}
          <div className="bg-white rounded-lg shadow-sm p-1">
            <div ref={tabsContainerRef} className="flex justify-between items-center overflow-x-hidden relative">
              <div className="flex items-center flex-nowrap flex-grow">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors duration-150 ${
                      currentActiveTabInBar === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              {moreDropdownTabs.length > 0 && (
                <div className="relative ml-auto">
                  <button
                    ref={moreButtonRef}
                    onClick={() => handleTabClick('More')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors duration-150 ${
                      currentActiveTabInBar === 'More' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MoreHorizontal size={16} />
                    <span>More</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>
            {/* Hidden tabs for measurement */}
            <div className="absolute -left-[9999px] top-0 flex opacity-0 pointer-events-none" aria-hidden="true">
              {ALL_TABS_CONFIG.map((tab, index) => (
                <button
                  key={`measure-${tab.id}`}
                  ref={el => { individualTabRefs.current[index] = el; }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap"
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm min-h-[300px]">
            {activeContentTabId === 'Posts' && ( <div> {/* Posts Content */} </div> )}

            {activeContentTabId === 'Memorials' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">Memorials</h2>
                  <Button variant="primary" size="sm" onClick={() => navigate('/create-memorial')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-sm h-9 ${controlButtonWidth}`}>
                    <Plus size={16} /> Create Memorial
                  </Button>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-end gap-x-3 gap-y-3 mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-end flex-shrink-0">
                      {user && (
                        <div className="flex items-center gap-x-1.5 h-9">
                          <Button variant={filterType === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('all')} 
                            className={`h-full px-3 whitespace-nowrap ${filterType !== 'all' ? `${outlineButtonHoverClasses} ${outlineButtonActiveClasses}` : ''}`}>All</Button>
                          <Button variant={filterType === 'owned' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('owned')} 
                            className={`h-full px-3 whitespace-nowrap ${filterType !== 'owned' ? `${outlineButtonHoverClasses} ${outlineButtonActiveClasses}` : ''}`}>Owned</Button>
                          <Button variant={filterType === 'shared' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('shared')} 
                            className={`flex items-center justify-center gap-1 h-full px-3 whitespace-nowrap ${filterType !== 'shared' ? `${outlineButtonHoverClasses} ${outlineButtonActiveClasses}` : ''}`}><Users size={14}/>Shared</Button>
                        </div>
                      )}
                      <div className="text-sm text-slate-600 whitespace-nowrap ml-3 self-end pb-[3px]"> 
                        {!isLoading && memorials ? `${memorials.length} results found` : (isLoading ? 'Loading...' : '')}
                      </div>
                    </div>
                    <div className="flex-grow order-first sm:order-none w-full sm:w-auto mx-0 sm:mx-3 h-9">
                      <Input ref={searchInputRef} type="search" placeholder="Search your memorials..."
                        defaultValue={searchQuery} onChange={handleDashboardSearchChange}
                        icon={<Search size={18} className="text-slate-400" />} 
                        className="text-sm w-full h-full px-3 py-1.5 box-border focus:ring-indigo-500 focus:border-indigo-500 border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="flex-shrink-0 h-9"> 
                      <Button variant="outline" size="sm" onClick={() => setShowFilters(prev => !prev)}
                        className={`flex items-center justify-center gap-1.5 h-full px-3 text-sm whitespace-nowrap ${controlButtonWidth} ${outlineButtonHoverClasses} ${outlineButtonActiveClasses}`}>
                        <SlidersHorizontal size={15} />
                        <span>{showFilters ? 'Hide' : 'Show'} Filters & Sort</span>
                      </Button>
                    </div>
                </div>
                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }} className="mb-6 bg-slate-50 p-4 rounded border border-slate-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div> <label className="block text-sm font-medium text-slate-700 mb-1">Status</label> <select value={statusFilter || ''} onChange={(e) => setStatusFilter(e.target.value || null)} className="w-full h-9 text-sm px-3 py-2 border border-slate-300 rounded focus:ring-indigo-500"> <option value="">All</option> <option value="published">Published</option> <option value="draft">Draft</option> <option value="archived">Archived</option> </select> </div>
                        <div> <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label> <input type="date" value={dateRange.from || ''} onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value || null }))} className="w-full h-9 text-sm px-3 py-2 border border-slate-300 rounded"/> </div>
                        <div> <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label> <input type="date" value={dateRange.to || ''} onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value || null }))} className="w-full h-9 text-sm px-3 py-2 border border-slate-300 rounded"/> </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <select
                            value={sortOptions.findIndex(o => o.field === selectedSort.field && o.direction === selectedSort.direction).toString()}
                            onChange={(e) => setSelectedSort(sortOptions[parseInt(e.target.value)])}
                            className="text-sm px-3 py-2 border border-slate-300 rounded h-9"
                        >
                            {sortOptions.map((opt, idx) => ( <option key={idx} value={idx}>{opt.label}</option>))}
                        </select>
                        <Button onClick={clearAdvancedFilters} variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"> <X size={16} /> Clear </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <MemorialList
                  memorials={memorials}
                  isLoading={isLoading}
                  onNavigateToCreate={() => navigate('/create-memorial')}
                  isOwnerView={filterType === 'owned'}
                />
              </div>
            )}
            {activeContentTabId === 'About' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">About Me</h2>
                  <Link to="/profile-settings">
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <Edit size={14} /> Edit Profile
                    </Button>
                  </Link>
                </div>
                {profileLoading && <p className="text-slate-500">Loading profile information...</p>}
                {!profileLoading && userProfileData && <UserProfileView profile={userProfileData} />}
                {!profileLoading && !userProfileData && <p className="text-red-500">Could not load profile information.</p>}
              </div>
            )}
            {activeContentTabId === 'Friends' && ( <div> <h2 className="text-xl font-semibold text-slate-800 mb-4">Friends</h2> <p className="text-slate-600">Your friends list and connection management will appear here.</p> </div> )}
            {activeContentTabId === 'Events' && ( <div> <h2 className="text-xl font-semibold text-slate-800 mb-4">Events</h2> <p className="text-slate-600">Your events list and management will appear here.</p> </div> )}
            {activeContentTabId === 'Media' && ( <div> <h2 className="text-xl font-semibold text-slate-800 mb-4">Media Gallery</h2> <p className="text-slate-600">Your media gallery will appear here.</p> </div> )}
          </div>
        </div>
        <div className="w-full md:w-1/3 space-y-6"> 
          <ContentSuggestionWidget /> 
          {/* UpcomingEventsWidget הוסר מפה */}
          <div className="bg-white p-6 rounded-lg shadow-sm"> 
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Contacts</h2> 
            <div className="space-y-3"> 
              <p className="text-sm text-slate-500">No recent contacts.</p> 
              <Link to="/find-friends" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"> 
                <Users size={14} /> <span>Find Friends</span> 
              </Link> 
            </div> 
          </div> 
          <div className="bg-white p-6 rounded-lg shadow-sm"> 
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Memorial Assistant</h2> 
            <p className="text-sm text-slate-600 mb-3"> Need help with creating or managing memorials? Ask our AI assistant. </p> 
            <Button variant="outline" size="sm" className="w-full"> 
              <MessageSquare size={16} className="mr-2" /> Start Conversation 
            </Button> 
          </div> 
        </div>
      </div>

      {isEditCoverModalOpen && (
        <EditCoverModal
          isOpen={isEditCoverModalOpen}
          onClose={() => setIsEditCoverModalOpen(false)}
          onCoverImageUploaded={refreshUserProfileAndAuthContext}
        />
      )}

      <MoreDropdownPortal isOpen={isMoreDropdownOpen} targetRef={moreButtonRef} onClose={() => setIsMoreDropdownOpen(false)}>
        {moreDropdownTabs.map(tab_dd => (
          <button
            key={tab_dd.id}
            onClick={() => handleTabClick(tab_dd.id)}
            className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm ${
              activeContentTabId === tab_dd.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <tab_dd.icon size={16} />
            <span>{tab_dd.label}</span>
          </button>
        ))}
        {moreDropdownTabs.length === 0 && isMoreDropdownOpen && <p className="p-2 text-sm text-slate-500">No more items.</p>}
      </MoreDropdownPortal>
    </div>
  );
};

export default Dashboard;
