
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; 
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import CreateMemorial from './pages/CreateMemorial';
import EditMemorial from './pages/EditMemorial';
import ViewMemorial from './pages/ViewMemorial';
import EventDetailsPage from './pages/events/EventDetailsPage';
import CreateEventPage from './pages/events/CreateEventPage';
import EditEventPage from './pages/events/EditEventPage'; // <-- ייבוא קומפוננטת עריכת אירוע
import UserSearch from './pages/UserSearch';
import NotFound from './pages/NotFound';
import Products from './pages/Products';
import StoreItemPage from './pages/StoreItemPage';
import UserProfile from './pages/UserProfile';
import BlockedUsers from './pages/BlockedUsers';
import FollowedMemorials from './pages/FollowedMemorials';
import SharedMemorials from './pages/SharedMemorials';
import Chat from './pages/Chat';
import SubscriptionPage from './pages/SubscriptionPage';
import DonationPage from './pages/DonationPage';
import CheckoutSuccessPage from './pages/checkout/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/checkout/CheckoutCancelPage';
import DeveloperAPISettings from './pages/DeveloperAPISettings';
import CalendarSettings from './pages/CalendarSettings';
import CalendarCallbackPage from './pages/calendar/CalendarCallbackPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';

// Legal and Help Pages
import Privacy from './pages/privacy';
import Terms from './pages/terms';
import Help from './pages/help';
import Contact from './pages/contact';
import Accessibility from './pages/accessibility';

// Community Groups Pages
import CommunityGroups from './pages/community/CommunityGroups';
import GroupDetail from './pages/community/GroupDetail';
import CreateGroup from './pages/community/CreateGroup';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserListPage from './pages/admin/UserListPage';
import ModerationQueuePage from './pages/admin/ModerationQueuePage';
import AuditLogViewerPage from './pages/admin/AuditLogViewerPage';
import FeedbackListPage from './pages/admin/FeedbackListPage';

import { supabase } from './lib/supabase'; 
import { useState, useEffect } from 'react';


// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element, requiredRole?: string }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasRole, setHasRole] = useState(!requiredRole); 
  const [checkingRole, setCheckingRole] = useState(!!requiredRole);

  useEffect(() => {
    if (requiredRole && user && !loading) {
      const checkRole = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          setHasRole(data?.role === requiredRole);
        } catch (error) {
          console.error('Error checking role:', error);
          setHasRole(false);
        } finally {
          setCheckingRole(false);
        }
      };
      checkRole();
    } else if (!requiredRole) {
      setCheckingRole(false);
    }
  }, [user, loading, requiredRole]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole) {
    return <Navigate to="/dashboard" replace />; 
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setChecking(false);
        setIsAdmin(false); 
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(data?.role === 'ADMIN' || data?.role === 'MODERATOR');
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };
    if (!loading) { 
        checkAdminStatus();
    }
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) { 
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Main Layout Routes */}
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="memorials/:id" element={<ViewMemorial />} />
          
          {/* Event Routes */}
          <Route path="events/create" element={
            <ProtectedRoute>
              <CreateEventPage />
            </ProtectedRoute>
          } />
          <Route path="events/create/:memorialId" element={
            <ProtectedRoute>
              <CreateEventPage />
            </ProtectedRoute>
          } />
          {/* --- הנתיב החדש לעריכת אירוע --- */}
          <Route path="events/:id/edit" element={
            <ProtectedRoute>
              <EditEventPage />
            </ProtectedRoute>
          } />
          {/* ------------------------------- */}
          <Route path="events/:id" element={<EventDetailsPage />} /> 
          
          <Route path="products" element={<Products />} />
          <Route path="store" element={<StoreItemPage />} />
          <Route path="store/:memorialId" element={<StoreItemPage />} />
          
          {/* Legal and Help Pages */}
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="help" element={<Help />} />
          <Route path="contact" element={<Contact />} />
          <Route path="accessibility" element={<Accessibility />} />
          
          {/* Checkout Routes */}
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="checkout/cancel" element={<CheckoutCancelPage />} />
          
          {/* Calendar Callback Route */}
          <Route path="calendar/callback" element={<CalendarCallbackPage />} />
          
          {/* Protected Routes */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="create-memorial" element={
            <ProtectedRoute>
              <CreateMemorial />
            </ProtectedRoute>
          } />
          
          <Route path="edit-memorial/:id" element={
            <ProtectedRoute>
              <EditMemorial />
            </ProtectedRoute>
          } />
                      
          <Route path="find-friends" element={
            <ProtectedRoute>
              <UserSearch />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          
          <Route path="profile/:id" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          
          <Route path="profile-settings" element={
            <ProtectedRoute>
              <ProfileSettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="blocked-users" element={
            <ProtectedRoute>
              <BlockedUsers />
            </ProtectedRoute>
          } />
          
          <Route path="followed-memorials" element={
            <ProtectedRoute>
              <FollowedMemorials />
            </ProtectedRoute>
          } />
          
          <Route path="shared-memorials" element={
            <ProtectedRoute>
              <SharedMemorials />
            </ProtectedRoute>
          } />
          
          <Route path="chat" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          
          <Route path="subscription" element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          } />
          
          <Route path="donate/:memorialId" element={
            <ProtectedRoute>
              <DonationPage />
            </ProtectedRoute>
          } />

          <Route path="developer/api" element={
            <ProtectedRoute>
              <DeveloperAPISettings />
            </ProtectedRoute>
          } />
          
          <Route path="calendar/settings" element={
            <ProtectedRoute>
              <CalendarSettings />
            </ProtectedRoute>
          } />

          {/* Community Groups Routes */}
          <Route path="groups" element={
            <ProtectedRoute>
              <CommunityGroups />
            </ProtectedRoute>
          } />
          
          <Route path="groups/create" element={
            <ProtectedRoute>
              <CreateGroup />
            </ProtectedRoute>
          } />
          
          <Route path="groups/:id" element={
            <ProtectedRoute>
              <GroupDetail />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="moderation" element={<ModerationQueuePage />} />
          <Route path="feedback" element={<FeedbackListPage />} />
          <Route path="audit-log" element={<AuditLogViewerPage />} />
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;