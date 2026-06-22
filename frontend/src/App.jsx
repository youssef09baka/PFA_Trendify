import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import AssistantWidget from './components/AssistantWidget';

import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/Login';
import SignupPage   from './pages/Signup';
import Preferences  from './pages/Preferences';
import Dashboard    from './pages/Dashboard';
import Feed         from './pages/Feed';
import TrendDetail  from './pages/TrendDetail';
import AIWorkspace  from './pages/AIWorkspace';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/"            element={<LandingPage />} />
            <Route path="/login"       element={<LoginPage />} />
            <Route path="/signup"      element={<SignupPage />} />
            <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
            <Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/feed"        element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/feed/:id"    element={<PrivateRoute><TrendDetail /></PrivateRoute>} />
            <Route path="/ai/:id"      element={<PrivateRoute><AIWorkspace /></PrivateRoute>} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
          <AssistantWidget />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
