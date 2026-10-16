import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
const AssistantWidget = lazy(() => import('./components/AssistantWidget'));
const Ambient3DBackground = lazy(() => import('./components/Ambient3DBackground'));

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/Login'));
const SignupPage = lazy(() => import('./pages/Signup'));
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Favorites = lazy(() => import('./pages/Favorites'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Feed = lazy(() => import('./pages/Feed'));
const TrendDetail = lazy(() => import('./pages/TrendDetail'));
const AIWorkspace = lazy(() => import('./pages/AIWorkspace'));

export default function App() {
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAmbientEnabled(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          {ambientEnabled ? (
            <Suspense fallback={null}>
              <Ambient3DBackground />
            </Suspense>
          ) : null}
          <Suspense fallback={null}>
            <Routes>
              <Route path="/"            element={<LandingPage />} />
              <Route path="/login"       element={<LoginPage />} />
              <Route path="/signup"      element={<SignupPage />} />
              <Route path="/home"        element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/profile"     element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/favorites"   element={<PrivateRoute><Favorites /></PrivateRoute>} />
              <Route path="/search"      element={<PrivateRoute><SearchPage /></PrivateRoute>} />
              <Route path="/preferences" element={<PrivateRoute><Navigate to="/profile" replace /></PrivateRoute>} />
              <Route path="/dashboard"   element={<PrivateRoute><Navigate to="/home" replace /></PrivateRoute>} />
              <Route path="/feed"        element={<PrivateRoute><Feed /></PrivateRoute>} />
              <Route path="/feed/:id"    element={<PrivateRoute><TrendDetail /></PrivateRoute>} />
              <Route path="/ai/:id"      element={<PrivateRoute><AIWorkspace /></PrivateRoute>} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Suspense fallback={null}>
            <AssistantWidget />
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
