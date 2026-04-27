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

  // ================= LOGIN =================
  const login = useCallback(async (username, password) => {
    // ✅ FIX 1: SAFE VALUES
    const safeUsername = (username || "").trim();
    const safePassword = (password || "").trim();

    // ✅ FIX 2: PREVENT EMPTY REQUEST
    if (!safeUsername || !safePassword) {
      console.error("❌ LOGIN BLOCKED: Missing username/password");
      throw new Error("Username and password required");
    }

    try {
      console.log("🚀 LOGIN PAYLOAD:", {
        username: safeUsername,
        password: safePassword ? "****" : null
      });

      const res = await api.post('/auth/login', {
        username: safeUsername,
        password: safePassword
      });

      const { token: t, user: u } = res.data;

      localStorage.setItem('mw_token', t);
      localStorage.setItem('mw_user', JSON.stringify(u));

      setToken(t);
      setUser(u);
      setAuthHeader(t);

      console.log(`✅ [AuthContext] Login success: "${u.username}" role="${u.role}"`);

      return u;

    } catch (err) {
      console.error("❌ LOGIN ERROR:", err?.response?.data || err.message);
      throw err;
    }

  }, []);

  // ================= SIGNUP =================
  const signup = useCallback(async (data) => {
    // ✅ FIX 3: SAFE DATA HANDLING
    const safeData = {
      username: (data.username || "").trim(),
      password: (data.password || "").trim(),
      email: (data.email || "").trim(),
      role: data.role,
      departments: data.departments || []
    };

    // ✅ FIX 4: PREVENT EMPTY REQUEST
    if (!safeData.username || !safeData.password) {
      console.error("❌ SIGNUP BLOCKED: Missing username/password");
      throw new Error("Username and password required");
    }

    try {
      console.log("🚀 SIGNUP PAYLOAD:", {
        ...safeData,
        password: safeData.password ? "****" : null
      });

      const res = await api.post('/auth/signup', safeData);

      return res.data;

    } catch (err) {
      console.error("❌ SIGNUP ERROR:", err?.response?.data || err.message);
      throw err;
    }

  }, []);

  // ================= LOGOUT =================
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