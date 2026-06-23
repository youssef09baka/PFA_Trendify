/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.info('[AUTH] AUTH CONTEXT CHECK', { hasToken: Boolean(token) });
      if (token) {
        try {
          const { data } = await api.get('/users/profile');
          console.info('[AUTH] AUTH CONTEXT PROFILE LOADED', { hasUser: Boolean(data) });
          setUser(data);
        } catch {
          console.warn('[AUTH] AUTH CONTEXT TOKEN INVALID');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    console.info('[AUTH] AUTH CONTEXT UPDATED', { hasUser: Boolean(user), email: user?.email || null });
  }, [user]);

  const login = async (userData, token) => {
    console.info('[AUTH] TOKEN SAVED', { hasToken: Boolean(token) });
    localStorage.setItem('token', token);
    try {
      const { data } = await api.get('/users/profile');
      console.info('[AUTH] USER PROFILE LOADED AFTER LOGIN', { hasProfile: Boolean(data) });
      setUser(data || userData);
      console.info('[AUTH] USER UPDATED', { source: data ? 'profile' : 'login_response' });
    } catch {
      setUser(userData);
      console.info('[AUTH] USER UPDATED', { source: 'login_response_fallback' });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updates) => {
    console.info('[AUTH] AUTH CONTEXT UPDATE REQUEST', { keys: Object.keys(updates || {}) });
    setUser((current) => current ? { ...current, ...updates } : current);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
