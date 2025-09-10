
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from '../components/LandingPage';
import ReportPage from '../components/ReportPage';
import MapView from '../components/MapView';
import UserDashboard from '../components/UserDashboard';
import AdminDashboard from '../components/AdminDashboard';
import Navigation from '../components/Navigation';
import { useAuth } from '../hooks/useAuth';
import Profile from './Profile';
import MyReports from './MyReports';
import NotFound from './NotFound';
import { AnimatePresence, motion } from 'framer-motion';

function RequireAuth({ children, role }: { children: JSX.Element, role: 'admin' | 'user' }) {
  const { isAuthenticated, role: authRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (authRole !== role) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function RequireAnyAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

const Index = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background dark:bg-gray-950 transition-colors duration-500">
      <Navigation />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes - only home page */}
          <Route path="/" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><LandingPage /></motion.div>} />
          {/* Protected routes - require authentication */}
          <Route path="/report" element={<RequireAnyAuth><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><ReportPage /></motion.div></RequireAnyAuth>} />
          <Route path="/map" element={<RequireAnyAuth><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><MapView /></motion.div></RequireAnyAuth>} />
          {/* User routes - require user authentication */}
          <Route path="/dashboard/user" element={<RequireAuth role="user"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><UserDashboard /></motion.div></RequireAuth>} />
          <Route path="/profile" element={<RequireAnyAuth><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><Profile /></motion.div></RequireAnyAuth>} />
          <Route path="/my-reports" element={<RequireAnyAuth><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><MyReports /></motion.div></RequireAnyAuth>} />
          {/* Admin routes - require admin authentication */}
          <Route path="/dashboard/admin" element={<RequireAuth role="admin"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><AdminDashboard /></motion.div></RequireAuth>} />
          <Route path="/admin/reports" element={<RequireAuth role="admin"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><AdminDashboard /></motion.div></RequireAuth>} />
          <Route path="/admin/users" element={<RequireAuth role="admin"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><AdminDashboard /></motion.div></RequireAuth>} />
          <Route path="/admin/analytics" element={<RequireAuth role="admin"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><AdminDashboard /></motion.div></RequireAuth>} />
          {/* Legacy routes for backward compatibility */}
          <Route path="/user" element={<RequireAuth role="user"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><UserDashboard /></motion.div></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role="admin"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><AdminDashboard /></motion.div></RequireAuth>} />
          {/* 404 route */}
          <Route path="*" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }} style={{ willChange: 'opacity' }}><NotFound /></motion.div>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default Index;
