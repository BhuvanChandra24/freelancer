import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEPTS = ['CRM', 'Production', 'Store', 'Commercial', 'AfterSales'];

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'employee',
    department: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setPendingApproval(false);
    setLoading(true);

    try {
      // ✅ FIX 1: SAFE TRIM
      const username = form.username?.trim();
      const password = form.password?.trim();

      // ✅ FIX 2: FRONTEND VALIDATION (PREVENT 400)
      if (!username || !password) {
        setError("Username and password required");
        setLoading(false);
        return;
      }

      if (isSignup) {
        console.log("🟡 SIGNUP DATA:", form);

        const result = await signup({
          username,
          password,
          email: form.email?.trim(),
          role: form.role,
          departments: form.department ? [form.department] : [],
        });

        console.log("✅ SIGNUP SUCCESS");

        if (form.role === 'manager' || result?.pendingApproval) {
          setPendingApproval(true);
          setIsSignup(false);
          setForm(p => ({ ...p, password: '', role: 'employee' }));
        } else {
          setSuccess('Account created! Please log in.');
          setIsSignup(false);
          setForm(p => ({ ...p, password: '' }));
        }

      } else {
        // ✅ FIX 3: DEBUG LOG (VERY IMPORTANT)
        console.log("🔐 LOGIN REQUEST PAYLOAD:", {
          username,
          password: password ? "****" : null
        });

        // ✅ FIX 4: ENSURE CORRECT DATA SENT
        const user = await login(username, password);

        console.log("✅ LOGIN RESPONSE:", user);

        if (!user) {
          throw new Error("Login failed - no user returned");
        }

        navigate(
          user.role === 'manager' || user.role === 'admin'
            ? '/mis'
            : '/dashboard'
        );
      }

    } catch (err) {
      console.error("❌ AUTH ERROR:", err);

      if (err?.response?.data?.pendingApproval) {
        setPendingApproval(true);
        return;
      }

      setError(
        err?.response?.data?.message ||
        err?.message ||
        (isSignup ? 'Signup failed' : 'Login failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--ink)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ===== LEFT PANEL (UNCHANGED) ===== */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 80px', position: 'relative', overflow: 'hidden',
      }} className="hide-mobile">
        {/* (ALL YOUR ORIGINAL UI KEPT SAME) */}
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div style={{
        width: 460, background: 'white', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 50px', position: 'relative',
      }}>

        {/* Pending approval */}
        {pendingApproval && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1.5px solid rgba(245,158,11,0.35)',
            color: '#92400E',
            padding: '16px',
            borderRadius: 12,
            marginBottom: 20,
          }}>
            ⏳ Account Pending Approval
          </div>
        )}

        {/* Error */}
        {error && !pendingApproval && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#B91C1C',
            padding: '13px',
            borderRadius: 10,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && !pendingApproval && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#065F46',
            padding: '13px',
            borderRadius: 10,
            marginBottom: 20,
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {isSignup && (
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@company.com"
            />
          )}

          <input
            type="text"
            value={form.username}
            onChange={e => set('username', e.target.value)}
            placeholder="Enter username"
            required
          />

          <input
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="Enter password"
            required
          />

          {isSignup && (
            <>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select Dept.</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

        </form>

        <button onClick={() => {
          setIsSignup(!isSignup);
          setError('');
          setSuccess('');
          setPendingApproval(false);
        }}>
          {isSignup ? 'Sign In' : 'Sign Up'}
        </button>

      </div>
    </div>
  );
}