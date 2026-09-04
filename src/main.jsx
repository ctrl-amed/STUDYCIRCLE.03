import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

import App from './App.jsx';
import Auth from './Auth.jsx';
import ProtectedRoute from './ProtectedRoute.jsx'; 

// Layouts
import UserLayout from './layouts/UserLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

// User Pages
import UserHomepage from './pages/UserHomepage.jsx';
import UserRooms from './pages/UserRooms.jsx';
import UserStatistics from './pages/UserStatistics.jsx';
import UserProfile from './pages/UserProfile.jsx';
import UserSettings from './pages/UserSettings.jsx';
import UserCustomizer from './pages/UserCustomizer.jsx';
import KitsuAI from './pages/KitsuAI.jsx';
import CreateSession from './pages/CreateSession.jsx';
import ChangePassword from './pages/ChangePassword.jsx';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRooms from './pages/AdminRooms.jsx';
import AdminUsers from './pages/AdminUsers.jsx';

import { PlayerProvider } from './context/PlayerContext.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';

const GOOGLE_CLIENT_ID = "365895404933-6jedmd58bc6494im8ibku5q4k0gs6eut.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PlayerProvider>
        <LoadingProvider>
          <BrowserRouter basename={import.meta.env.DEV ? '/' : '/STUDYCIRCLE.03/'}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* 
                ================================================================================
                BACKEND INTEGRATION GUIDELINES: PASSWORD RESET FLOW
                ================================================================================
                1. EMAIL LINK FORMAT:
                   When a user requests a password reset, the backend should send an email with 
                   a link formatted like this:
                   
                   https://<YOUR_DOMAIN_OR_HOST>/STUDYCIRCLE.03/reset-password/<SECURE_RESET_TOKEN>
                   
                2. HOW FRONTEND READS THE TOKEN:
                   The ChangePassword component reads the `:token` dynamic route parameter via React 
                   Router's `useParams()` hook (`const { token } = useParams()`).

                3. ALTERNATIVE QUERY PARAMETER SUPPORT:
                   If your backend framework generates links with query parameters instead:
                   e.g. /STUDYCIRCLE.03/change-password?token=XYZ&email=user@example.com
                   The secondary route `/change-password` below catches it, and the component can 
                   parse it using `useSearchParams()`.
                ================================================================================
              */}
              <Route path="/changepassword" element={<ChangePassword />} />
              <Route path="/reset-password/:token" element={<ChangePassword />} />
              <Route path="/change-password" element={<ChangePassword />} />

              <Route element={
                <ProtectedRoute>
                  <UserLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<UserHomepage />} />
                <Route path="/rooms" element={<UserRooms />} />
                <Route path="/statistics" element={<UserStatistics />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/settings" element={<UserSettings />} />
                <Route path="/customization" element={<UserCustomizer />} />
                <Route path="/kitsuai" element={<KitsuAI />} />
                <Route path="/create-session" element={<CreateSession />} />
              </Route>

              {/* Standalone Embed Routes for UserLayout Overlay Iframes */}
              <Route path="/kitsuai-embed" element={<KitsuAI />} />
              <Route path="/create-session-embed" element={<CreateSession />} />

              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/rooms" element={<AdminRooms />} />
                <Route path="/admin/users" element={<AdminUsers />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </LoadingProvider>
      </PlayerProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);