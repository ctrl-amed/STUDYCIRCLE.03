import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import App from './App.jsx';
import Auth from './Auth.jsx';
import UserLayout from './layouts/UserLayout.jsx';
import UserHomepage from './pages/UserHomepage.jsx';
import UserRooms from './pages/UserRooms.jsx';
import UserStatistics from './pages/UserStatistics.jsx';
import UserProfile from './pages/UserProfile.jsx';
import UserSettings from './pages/UserSettings.jsx';
import { PlayerProvider } from './context/PlayerContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlayerProvider>
      <BrowserRouter basename="/STUDYCIRCLE.03/">
        <Routes>
          {/* Public Landing Pages */}
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<Auth />} />

          {/* Authenticated User Pages */}
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<UserHomepage />} />
            <Route path="/rooms" element={<UserRooms />} />
            <Route path="/statistics" element={<UserStatistics />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/settings" element={<UserSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PlayerProvider>
  </StrictMode>
);