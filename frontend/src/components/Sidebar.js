import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, getInitials, generateAvatarColor } from '../utils/helpers';

// MODIFIED: admin also sees MIS Reports
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { path: '/mis', label: 'MIS Reports', icon: '📊', roles: ['manager', 'admin'] }, // ADDED admin
  { path: '/admin', label: 'Admin Panel', icon: '⚙️', roles: ['admin'] },
];

// ADDED: role badge color mapping
const ROLE_COLORS = {
  admin: { bg: 'rgba(139,92,246,0.25)', color: '#C4B5FD', label: 'Administrator' },
  manager: { bg: 'rgba(59,130,246,0.25)', color: '#93C5FD', label: 'Manager' },
  employee: { bg: 'rgba(16,185,129,0.25)', color: '#6EE7B7', label: 'Employee' },
};

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = getInitials(user?.username || '');
  const avatarColor = generateAvatarColor(user?.username || '');
  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.employee;

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>🏭</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'white', lineHeight: 1.1 }}>
              ManufactureOps
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              Workflow System
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '4px 12px 10px' }}>
          Navigation
        </div>
        {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role)).map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path}
              onClick={() => handleNav(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                transition: 'all 200ms', marginBottom: 2,
                outline: 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#3B82F6' }} />}
            </button>
          );
        })}

        {/* Department filters */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '4px 12px 10px' }}>
            Departments
          </div>
          {Object.entries(DEPARTMENTS).map(([key, dept]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, marginBottom: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{dept.label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* User profile */}
      <div style={{ padding: '16px 16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: avatarColor, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: 13, color: 'white',
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            {/* ADDED: Role badge */}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: roleStyle.bg, color: roleStyle.color,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              {roleStyle.label}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-sm" style={{
          width: '100%', justifyContent: 'center',
          background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: 'none',
        }}>
          <span>↪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
