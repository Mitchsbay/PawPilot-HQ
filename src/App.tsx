import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import ToastProvider from './components/Toast/ToastProvider';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import NotificationService from './components/Notifications/NotificationService';
import PushNotificationManager from './components/Notifications/PushNotificationManager';
import MobileWrapper from './features/mobile/MobileWrapper';
import OfflineManager from './features/offline/OfflineManager';
import AchievementSystem from './features/gamification/AchievementSystem';

// Import all pages
import Landing from './pages/Landing';
import SignUp from './pages/auth/SignUp';
import Login from './pages/auth/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Pets from './pages/Pets';
import Health from './pages/Health';
import Settings from './pages/Settings';
import Feed from './pages/Feed';
import Messages from './pages/Messages';
import Groups from './pages/Groups';
import Events from './pages/Events';
import LostFoundPage from './pages/LostFound';
import Notifications from './pages/Notifications';
import Photos from './pages/Photos';
import Reels from './pages/Reels';
import UserProfile from './pages/Profile';
import Donations from './pages/Donations';
import HelpPage from './pages/Help';
import Admin from './pages/Admin';
import Billing from './features/payments/Billing';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth/login" />;
  }
  
  return <>{children}</>;
};

// Public Route component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Placeholder components for now - we'll implement these next
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">This page is coming soon...</p>
    </div>
  </div>
);

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PawPilot HQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <Sidebar />
      <NotificationService />
      <PushNotificationManager />
      <main className="flex-grow lg:pl-64 pb-16 lg:pb-0">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected Routes */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Main App Routes - Placeholders for now */}
          <Route path="/pets" element={<ProtectedRoute><Pets /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute><Health /></ProtectedRoute>} />
          <Route path="/photos" element={<ProtectedRoute><Photos /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
          <Route path="/lostfound" element={<ProtectedRoute><LostFoundPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
          <Route path="/help/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
          <Route path="/help/terms" element={<PlaceholderPage title="Terms of Use" />} />
          <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AuthProvider>
          <MobileWrapper>
            <OfflineManager />
            <AppContent />
            <AchievementSystem />
          </MobileWrapper>
        </AuthProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;