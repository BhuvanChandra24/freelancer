import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEPTS = ['CRM', 'Production', 'Store', 'Commercial', 'AfterSales'];

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'employee', department: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  // FEATURE: Manager Approval System — track pending approval state
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
      if (isSignup) {
        console.log("🟡 SIGNUP DATA:", form);

        const result = await signup({
          username: form.username.trim(),
          password: form.password.trim(),
          email: form.email.trim(),
          role: form.role,
          departments: form.department ? [form.department] : [],
        });

        console.log("✅ SIGNUP SUCCESS");

        // FEATURE: Manager Approval System
        // If a manager signs up, show pending approval notice instead of logging in
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
        console.log("🔐 LOGIN REQUEST:", form.username);

        const user = await login(
          form.username.trim(),
          form.password.trim()
        );

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

      // FEATURE: Manager Approval System — show friendly pending approval message
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
      {/* Left decorative panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 80px', position: 'relative', overflow: 'hidden',
      }}
        className="hide-mobile"
      >
        {/* Geometric background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: -100, right: -100,
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, left: -80,
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          }} />
          <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 60 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
            }}>🏭</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'white' }}>ManufactureOps</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Workflow Management</div>
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: 'white', lineHeight: 1.05, marginBottom: 20 }}>
            Unified<br />
            <span style={{ background: 'linear-gradient(90deg, #3B82F6, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Operations
            </span><br />
            Dashboard.
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 380, marginBottom: 50 }}>
            Real-time task management across all departments — directly connected to your live Google Sheets data.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'CRM', color: '#3B82F6' },
              { label: 'Production', color: '#10B981' },
              { label: 'Store', color: '#F59E0B' },
              { label: 'Commercial', color: '#8B5CF6' },
              { label: 'After Sales', color: '#EF4444' },
            ].map(d => (
              <span key={d.label} style={{
                padding: '6px 14px', borderRadius: 99,
                background: d.color + '18', color: d.color,
                fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                border: `1px solid ${d.color}30`,
              }}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        width: 460, background: 'white', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 50px', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
          background: 'linear-gradient(180deg, #3B82F6, #10B981, #8B5CF6)',
        }} />

        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
            {isSignup ? 'Create Account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-40)' }}>
            {isSignup ? 'Sign up to join your team.' : 'Sign in to your workspace.'}
          </p>
        </div>

        {/* FEATURE: Manager Approval System — pending approval banner */}
        {pendingApproval && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.35)',
            color: '#92400E', padding: '16px 18px', borderRadius: 12, marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              ⏳ Account Pending Approval
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Your manager account has been created and is awaiting admin approval.
              You will be able to log in once an administrator reviews and approves your account.
            </div>
          </div>
        )}

        {error && !pendingApproval && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#B91C1C', padding: '13px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14,
          }}>{error}</div>
        )}
        {success && !pendingApproval && (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            color: '#065F46', padding: '13px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14,
          }}>{success}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {isSignup && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" value={form.username} onChange={e => set('username', e.target.value)} placeholder="Enter username" required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter password" required />
          </div>

          {isSignup && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select Dept.</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* FEATURE: Manager Approval — show info hint when manager role selected */}
          {isSignup && form.role === 'manager' && (
            <div style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
              color: '#1E40AF', padding: '10px 14px', borderRadius: 8, fontSize: 13,
            }}>
              ℹ️ Manager accounts require admin approval before login is enabled.
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
            {loading
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> {isSignup ? 'Creating...' : 'Signing in...'}</>
              : isSignup ? 'Create Account' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => { setIsSignup(!isSignup); setError(''); setSuccess(''); setPendingApproval(false); }} style={{
            background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
          }}>
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 20, right: 24, fontSize: 10, color: 'var(--ink-40)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
          v2.0 · Sheets-Driven
        </div>
      </div>
    </div>
  );
}