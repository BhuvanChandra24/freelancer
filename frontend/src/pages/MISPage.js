import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { misAPI } from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Color palette ─────────────────────────────────────────────────────────────
const PALETTE = {
  blue: '#3B82F6',
  indigo: '#6366F1',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  orange: '#F97316',
  purple: '#8B5CF6',
  teal: '#14B8A6',
};

const STATUS_COLORS = [PALETTE.yellow, PALETTE.blue, PALETTE.green, PALETTE.indigo];
const PRIORITY_COLORS = [PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.green];

// ─── Utility ──────────────────────────────────────────────────────────────────
function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const KPICard = ({ title, value, subtitle, color, icon, trend }) => (
  <div style={{
    background: 'white',
    borderRadius: 16,
    padding: '22px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid #F1F5F9',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 8 }}>
          {title}
        </p>
        <p style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, fontFamily: '"Inter", sans-serif' }}>
          {value ?? 0}
        </p>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {icon}
      </div>
    </div>
    {trend !== undefined && (
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(trend, 100)}%`, background: color, borderRadius: 4, transition: 'width 800ms ease' }} />
        </div>
        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{trend}% of total</p>
      </div>
    )}
  </div>
);

const SectionCard = ({ title, subtitle, children, action }) => (
  <div style={{
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid #F1F5F9',
    overflow: 'hidden',
  }}>
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid #F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
    <div style={{ padding: '20px 24px' }}>
      {children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0',
      fontSize: 13,
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, color: '#1E293B' }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || '#64748B', margin: '2px 0' }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

const Badge = ({ value, color, bg }) => (
  <span style={{
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
    color: color,
    background: bg || `${color}18`,
  }}>
    {value}
  </span>
);

// ─── Main MIS Page ─────────────────────────────────────────────────────────────
const MISPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // ADDED: tabbed navigation

  useEffect(() => {
    // MODIFIED: both admin and manager can access MIS
    if (user?.role !== 'manager' && user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const fetchMISData = async () => {
      try {
        setLoading(true);
        const response = await misAPI.getStats();
        console.log('📊 [MISPage] Data loaded:', response.data?.summary);
        setData(response?.data || {});
        setError('');
      } catch (err) {
        console.error('❌ [MISPage] Error:', err);
        setError(err?.response?.data?.message || 'Failed to fetch MIS data');
      } finally {
        setLoading(false);
      }
    };

    fetchMISData();
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/'); };
  const handleSync = async () => {
    try {
      await misAPI.sync();
      window.location.reload();
    } catch {}
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `4px solid ${PALETTE.blue}30`,
          borderTopColor: PALETTE.blue,
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#64748B', fontWeight: 500 }}>Loading MIS Reports…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{
          background: 'white', borderRadius: 20, padding: 40,
          boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
          textAlign: 'center', maxWidth: 420,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Failed to Load Reports</h3>
          <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>{error}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 24px', background: PALETTE.blue, color: 'white',
              border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
            }}>
              Retry
            </button>
            <button onClick={() => navigate('/dashboard')} style={{
              padding: '10px 24px', background: '#F1F5F9', color: '#64748B',
              border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
            }}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const total = s.total || s.totalTasks || 0;

  // Pie chart data for task status
  const statusPieData = [
    { name: 'Pending', value: s.pending || s.pendingTasks || 0 },
    { name: 'In Progress', value: s.inProgress || s.inProgressTasks || 0 },
    { name: 'Completed', value: s.completed || s.completedTasks || 0 },
    { name: 'On Hold', value: s.onHold || 0 },
  ].filter(d => d.value > 0);

  // Priority pie data
  const priorityPieData = (data?.priorityStats || []);

  // Dept bar data
  const deptBarData = (data?.departmentStats || []).map(d => ({
    name: d.label || d.department,
    Total: d.total,
    Completed: d.completed,
    Overdue: d.overdue,
  }));

  // Trend line data
  const trendData = data?.completionTrend || [];

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'departments', label: '🏭 Departments' },
    { id: 'employees', label: '👥 Employees' },
    { id: 'overdue', label: '🔴 Overdue', badge: data?.overdueDetail?.length || 0 },
  ];

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: '"Inter", -apple-system, sans-serif' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 100%)',
        boxShadow: '0 4px 24px rgba(30,64,175,0.25)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => navigate('/dashboard')} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10,
              padding: '8px 14px', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              ← Back
            </button>
            <div>
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                📊 MIS Reports
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }}>
                {user?.role === 'admin' ? 'Full organization view' : 'Department performance dashboard'}
                {data?.meta?.generatedAt && ` · Updated ${new Date(data.meta.generatedAt).toLocaleTimeString()}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSync} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10,
              padding: '9px 18px', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ↻ Sync
            </button>
            <button onClick={handleLogout} style={{
              background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 10, padding: '9px 18px', color: '#FCA5A5',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── TABS ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 68, zIndex: 90 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              color: activeTab === tab.id ? PALETTE.indigo : '#64748B',
              borderBottom: `3px solid ${activeTab === tab.id ? PALETTE.indigo : 'transparent'}`,
              transition: 'all 150ms',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  background: PALETTE.red, color: 'white',
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                  padding: '1px 7px', minWidth: 20, textAlign: 'center',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <KPICard title="Total Tasks" value={total} icon="📋" color={PALETTE.blue} subtitle="All departments" />
              <KPICard title="Completed" value={s.completed || s.completedTasks || 0} icon="✅" color={PALETTE.green}
                subtitle={`${s.completionRate || 0}% completion rate`}
                trend={pct(s.completed || s.completedTasks || 0, total)} />
              <KPICard title="Overdue" value={s.overdue || s.overdueTasks || 0} icon="🚨" color={PALETTE.red}
                subtitle="Needs attention"
                trend={pct(s.overdue || s.overdueTasks || 0, total)} />
              <KPICard title="Due This Week" value={s.upcoming || s.upcomingTasks || 0} icon="⏳" color={PALETTE.orange}
                subtitle="Next 7 days" />
            </div>

            {/* Row 2 KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <KPICard title="In Progress" value={s.inProgress || s.inProgressTasks || 0} icon="⚡" color={PALETTE.blue} />
              <KPICard title="Pending" value={s.pending || s.pendingTasks || 0} icon="📥" color={PALETTE.yellow} />
              <KPICard title="On Hold" value={s.onHold || 0} icon="⏸️" color={PALETTE.indigo} />
              <KPICard title="Urgent Today" value={s.urgent || 0} icon="🔔" color={PALETTE.purple} />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              {/* Pie: Task Status */}
              <SectionCard title="Task Status Breakdown" subtitle="Distribution across all statuses">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>

              {/* Bar: Dept comparison */}
              <SectionCard title="Department Overview" subtitle="Total vs completed per department">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptBarData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Total" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

            </div>

            {/* Trend line (if data exists) */}
            {trendData.length > 0 && (
              <SectionCard title="Completion Trend" subtitle="Tasks completed per day (last 30 days)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke={PALETTE.blue} strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>
            )}
          </>
        )}

        {/* ═══ DEPARTMENTS TAB ═══ */}
        {activeTab === 'departments' && (
          <>
            {/* Dept cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 28 }}>
              {(data?.departmentStats || []).map((dept) => (
                <div key={dept.department} style={{
                  background: 'white', borderRadius: 16, padding: 24,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                  border: `1px solid ${dept.color || PALETTE.indigo}20`,
                  borderLeft: `4px solid ${dept.color || PALETTE.indigo}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, color: '#1E293B', fontSize: 15 }}>{dept.label || dept.department}</h3>
                    <Badge value={`${dept.completionRate}%`} color={dept.completionRate >= 70 ? PALETTE.green : PALETTE.orange} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Total', value: dept.total, color: '#64748B' },
                      { label: 'Completed', value: dept.completed, color: PALETTE.green },
                      { label: 'In Progress', value: dept.inProgress, color: PALETTE.blue },
                      { label: 'Overdue', value: dept.overdue, color: PALETTE.red },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${dept.completionRate}%`, background: dept.color || PALETTE.indigo, borderRadius: 3, transition: 'width 800ms ease' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dept bar chart */}
            <SectionCard title="Department Comparison" subtitle="Side-by-side task breakdown">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={deptBarData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Total" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Overdue" fill={PALETTE.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        )}

        {/* ═══ EMPLOYEES TAB ═══ */}
        {activeTab === 'employees' && (
          <SectionCard
            title="Employee Performance"
            subtitle={`${(data?.employeePerformance || []).length} contributors across departments`}
          >
            {(data?.employeePerformance || []).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0' }}>No employee data available</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                      {['Employee', 'Departments', 'Assigned', 'Completed', 'In Progress', 'Overdue', 'Rate', 'Performance'].map(h => (
                        <th key={h} style={{
                          padding: '12px 14px', textAlign: h === 'Employee' ? 'left' : 'center',
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: '#94A3B8', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.employeePerformance || []).map((emp, i) => {
                      const rate = emp.completionRate;
                      const barColor = rate >= 80 ? PALETTE.green : rate >= 50 ? PALETTE.yellow : PALETTE.red;
                      // Build initials
                      const initials = (emp.employeeName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      const avatarColors = [PALETTE.blue, PALETTE.indigo, PALETTE.purple, PALETTE.teal, PALETTE.green];
                      const avatarBg = avatarColors[i % avatarColors.length];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 150ms' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, background: avatarBg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                              }}>{initials}</div>
                              <div>
                                <p style={{ fontWeight: 600, color: '#1E293B', fontSize: 14 }}>{emp.employeeName}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {(emp.departments || []).map(d => (
                                <span key={d} style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                  background: '#EFF6FF', color: PALETTE.blue,
                                }}>{d}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px', fontWeight: 700, color: '#1E293B' }}>{emp.totalAssigned}</td>
                          <td style={{ textAlign: 'center', padding: '14px' }}>
                            <span style={{ fontWeight: 700, color: PALETTE.green }}>{emp.completed}</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px' }}>
                            <span style={{ fontWeight: 700, color: PALETTE.blue }}>{emp.inProgress}</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px' }}>
                            <span style={{ fontWeight: 700, color: emp.overdue > 0 ? PALETTE.red : '#94A3B8' }}>{emp.overdue}</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px' }}>
                            <Badge value={`${rate}%`} color={barColor} />
                          </td>
                          <td style={{ padding: '14px 14px 14px 8px', minWidth: 120 }}>
                            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${rate}%`, background: barColor, borderRadius: 4, transition: 'width 800ms ease' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {/* ═══ OVERDUE TAB ═══ */}
        {activeTab === 'overdue' && (
          <SectionCard
            title="Overdue Tasks"
            subtitle="Tasks past their deadline that need immediate attention"
            action={
              <span style={{ fontSize: 13, color: PALETTE.red, fontWeight: 700 }}>
                {(data?.overdueDetail || []).length} tasks overdue
              </span>
            }
          >
            {(data?.overdueDetail || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p style={{ fontWeight: 700, color: '#1E293B', fontSize: 16 }}>No overdue tasks!</p>
                <p style={{ color: '#94A3B8', marginTop: 4 }}>Everything is on track.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                      {['Task', 'Assigned To', 'Department', 'Deadline', 'Days Overdue', 'Priority'].map(h => (
                        <th key={h} style={{
                          padding: '12px 14px', textAlign: 'left',
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: '#94A3B8',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.overdueDetail || []).map((task, i) => {
                      const urgency = task.daysOverdue > 7 ? PALETTE.red : task.daysOverdue > 3 ? PALETTE.orange : PALETTE.yellow;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FFF7F7'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px' }}>
                            <p style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{task.title}</p>
                            {task.id && <p style={{ fontSize: 11, color: '#94A3B8' }}>#{task.id}</p>}
                          </td>
                          <td style={{ padding: '14px', fontSize: 13, color: '#475569' }}>{task.assignedTo || '—'}</td>
                          <td style={{ padding: '14px' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', color: PALETTE.blue }}>
                              {task.department}
                            </span>
                          </td>
                          <td style={{ padding: '14px', fontSize: 13, color: '#475569' }}>{task.deadline || '—'}</td>
                          <td style={{ padding: '14px' }}>
                            <span style={{ fontWeight: 800, color: urgency, fontSize: 15 }}>
                              {task.daysOverdue}d
                            </span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <Badge
                              value={task.priority || 'Unknown'}
                              color={
                                task.priority === 'Critical' ? PALETTE.red :
                                task.priority === 'High' ? PALETTE.orange :
                                task.priority === 'Medium' ? PALETTE.yellow : '#64748B'
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

      </main>
    </div>
  );
};

export default MISPage;
