import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { formatDate } from '../utils/helpers';

const TAB_LIST = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'approvals', label: '⏳ Pending Approvals' },
  { key: 'managers', label: '👔 Managers' },
  { key: 'employees', label: '👤 Employees' },
  { key: 'all', label: '📋 All Users' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pendingManagers, setPendingManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptInput, setDeptInput] = useState('');

  const loadData = useCallback(async () => {
  setLoading(true);
  setError('');

  try {
    // 🔥 DEBUG START
    console.log("TOKEN:", localStorage.getItem("mw_token"));

    const statsPromise = adminAPI.getStats().catch(e => {
      console.error("Stats API failed:", e);
      return { data: {} };
    });

    const usersPromise = adminAPI.getUsers().catch(e => {
      console.error("Users API failed:", e);
      return { data: [] };
    });

    const managersPromise = adminAPI.getManagers().catch(e => {
      console.error("Managers API failed:", e);
      return { data: [] };
    });

    const employeesPromise = adminAPI.getEmployees().catch(e => {
      console.error("Employees API failed:", e);
      return { data: [] };
    });

    const pendingPromise = adminAPI.getPendingManagers().catch(e => {
      console.error("Pending API failed:", e);
      return { data: [] };
    });

    const [statsRes, usersRes, managersRes, employeesRes, pendingRes] =
      await Promise.all([
        statsPromise,
        usersPromise,
        managersPromise,
        employeesPromise,
        pendingPromise
      ]);

    // 🔥 DEBUG LOGS
    console.log("STATS:", statsRes.data);
    console.log("USERS:", usersRes.data);
    console.log("MANAGERS:", managersRes.data);
    console.log("EMPLOYEES:", employeesRes.data);
    console.log("PENDING:", pendingRes.data);

    setStats(statsRes.data);
    setUsers(usersRes.data);
    setManagers(managersRes.data);
    setEmployees(employeesRes.data);
    setPendingManagers(pendingRes.data);

  } catch (err) {
    console.error("ADMIN LOAD ERROR:", err); // 🔥 ADDED
    setError(err?.response?.data?.message || 'Failed to load admin data');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id, approve) => {
    setApprovingId(id);
    try {
      const departments = deptInput.trim()
        ? deptInput.split(',').map(d => d.trim()).filter(Boolean)
        : [];
      await adminAPI.approveManager(id, approve, departments);
      setDeptInput('');
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user._id, { isActive: !user.isActive });
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Update failed');
    }
  };

  const roleBadge = (role, isApproved) => {
    const styles = {
      admin: { background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' },
      manager: { background: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
      employee: { background: 'rgba(16,185,129,0.15)', color: '#10B981' },
    };
    const s = styles[role] || styles.employee;
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
        ...s, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {role}
        {role === 'manager' && !isApproved && (
          <span style={{ color: '#F59E0B' }}>· Pending</span>
        )}
      </span>
    );
  };

  const UserTable = ({ data, emptyMsg }) => (
    data.length === 0
      ? <p style={{ color: 'var(--ink-40)', padding: '24px 0', textAlign: 'center' }}>{emptyMsg}</p>
      : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Departments</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td style={{ color: 'var(--ink-40)', fontSize: 13 }}>{u.email || '—'}</td>
                  <td>{roleBadge(u.role, u.isApproved)}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-40)' }}>
                    {u.departments?.length > 0 ? u.departments.join(', ') : '—'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                      background: u.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: u.isActive ? '#10B981' : '#EF4444',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{formatDate(u.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 12 }}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="main-content" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: 'white', borderBottom: '1px solid var(--surface-2)',
          padding: '20px 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-sm show-mobile" style={{ display: 'none' }}>☰</button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>
                ⚙️ Admin Dashboard
              </h1>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 1 }}>
                Manage users, approvals, and system records
              </div>
            </div>
          </div>
          <button onClick={loadData} className="btn btn-secondary btn-sm">↻ Refresh</button>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#B91C1C', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14,
            }}>{error}</div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--surface-2)', paddingBottom: 0 }}>
            {TAB_LIST.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-display)',
                color: tab === t.key ? 'var(--accent)' : 'var(--ink-40)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 150ms',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {t.label}
                {t.key === 'approvals' && pendingManagers.length > 0 && (
                  <span style={{
                    background: '#EF4444', color: 'white', borderRadius: 99,
                    fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>{pendingManagers.length}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-40)' }}>
              Loading admin data...
            </div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && stats && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                    {[
                      { label: 'Total Users', value: stats.totalUsers, color: '#3B82F6', icon: '👥' },
                      { label: 'Managers', value: stats.totalManagers, color: '#8B5CF6', icon: '👔' },
                      { label: 'Employees', value: stats.totalEmployees, color: '#10B981', icon: '👤' },
                      { label: 'Pending Approvals', value: stats.pendingApprovals, color: '#F59E0B', icon: '⏳' },
                    ].map(stat => (
                      <div key={stat.label} className="card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-40)', marginBottom: 8 }}>
                              {stat.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                              {stat.value}
                            </div>
                          </div>
                          <div style={{ fontSize: 28 }}>{stat.icon}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {stats.pendingApprovals > 0 && (
                    <div style={{
                      background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)',
                      borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#92400E', fontSize: 14 }}>
                          ⚠️ {stats.pendingApprovals} manager account{stats.pendingApprovals > 1 ? 's' : ''} awaiting approval
                        </div>
                        <div style={{ fontSize: 13, color: '#B45309', marginTop: 2 }}>
                          Review and approve manager accounts before they can access the system.
                        </div>
                      </div>
                      <button onClick={() => setTab('approvals')} className="btn btn-sm" style={{
                        background: '#F59E0B', color: 'white', border: 'none', flexShrink: 0,
                      }}>
                        Review Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING APPROVALS TAB ── */}
              {tab === 'approvals' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                    Manager Accounts Pending Approval
                  </h2>

                  {pendingManagers.length === 0 ? (
                    <div style={{
                      background: 'white', borderRadius: 16, padding: '48px 32px',
                      textAlign: 'center', border: '2px dashed var(--surface-2)',
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>No Pending Approvals</h3>
                      <p style={{ color: 'var(--ink-40)', marginTop: 8 }}>
                        All manager accounts have been reviewed.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {pendingManagers.map(m => (
                        <div key={m._id} className="card" style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                                {m.username}
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--ink-40)', marginBottom: 8 }}>
                                {m.email || 'No email provided'} · Registered {formatDate(m.createdAt)}
                              </div>
                              {roleBadge(m.role, m.isApproved)}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
                              <input
                                className="form-input"
                                style={{ fontSize: 12, padding: '6px 10px' }}
                                type="text"
                                placeholder="Assign departments (e.g. CRM, Production)"
                                value={approvingId === m._id ? deptInput : ''}
                                onChange={e => setDeptInput(e.target.value)}
                                onFocus={() => setApprovingId(m._id)}
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => handleApprove(m._id, true)}
                                  disabled={approvingId === m._id && !deptInput.trim() === false}
                                  className="btn btn-sm"
                                  style={{ background: '#10B981', color: 'white', border: 'none', flex: 1 }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleApprove(m._id, false)}
                                  className="btn btn-sm"
                                  style={{ background: '#EF4444', color: 'white', border: 'none', flex: 1 }}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MANAGERS TAB ── */}
              {tab === 'managers' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                    All Managers ({managers.length})
                  </h2>
                  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px 0' }} />
                    <UserTable data={managers} emptyMsg="No managers found." />
                  </div>
                </div>
              )}

              {/* ── EMPLOYEES TAB ── */}
              {tab === 'employees' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                    All Employees ({employees.length})
                  </h2>
                  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px 0' }} />
                    <UserTable data={employees} emptyMsg="No employees found." />
                  </div>
                </div>
              )}

              {/* ── ALL USERS TAB ── */}
              {tab === 'all' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                    All Users ({users.length})
                  </h2>
                  <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px 0' }} />
                    <UserTable data={users} emptyMsg="No users found." />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}