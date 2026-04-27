import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MISPage from './pages/MISPage';
import AdminPage from './pages/AdminPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import './index.css';

function AppRoutes() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" />
            : <LoginPage />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis"
        element={
          <ProtectedRoute>
            <MISPage />
          </ProtectedRoute>
        }
      />

      {/* FEATURE: Admin Dashboard — only accessible by admin role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" />}
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;