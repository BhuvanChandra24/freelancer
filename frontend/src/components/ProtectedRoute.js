import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  // ✅ ADD loading + user (no removal)
  const { isAuthenticated, loading, user } = useAuth();

  // ✅ WAIT until auth state is restored
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

  // ✅ SAFER CHECK (fallback to user)
  if (!isAuthenticated && !user) {
    return <Navigate to="/" replace />;
  }

  // ✅ ALLOW ACCESS
  return children;
};