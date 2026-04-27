import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthHeader = (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('mw_token');
    const savedUser = localStorage.getItem('mw_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setAuthHeader(savedToken);
      } catch {
        localStorage.removeItem('mw_token');
        localStorage.removeItem('mw_user');
      }
    }

    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });

    const { token: t, user: u } = res.data;

    localStorage.setItem('mw_token', t);
    localStorage.setItem('mw_user', JSON.stringify(u));

    setToken(t);
    setUser(u);
    setAuthHeader(t);

    console.log(`✅ [AuthContext] Login success: "${u.username}" role="${u.role}"`);

    return u;
  }, []);

  // FEATURE: Manager Approval System
  // signup now returns the full response data so the caller can detect pendingApproval
  const signup = useCallback(async (data) => {
    const res = await api.post('/auth/signup', data);
    return res.data; // includes { pendingApproval: true } for managers
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mw_token');
    localStorage.removeItem('mw_user');
    setToken(null);
    setUser(null);
    setAuthHeader(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      signup,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};