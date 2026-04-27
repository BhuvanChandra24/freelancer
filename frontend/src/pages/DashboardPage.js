import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI } from '../services/api';
import { DEPARTMENTS, STATUS_CONFIG, DEADLINE_CONFIG } from '../utils/helpers';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

const DEPT_LIST = Object.keys(DEPARTMENTS);
const STATUS_LIST = ['', 'Pending', 'In Progress', 'Completed', 'On Hold'];
const PRIORITY_LIST = ['', 'Critical', 'High', 'Medium', 'Low'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState('cards'); // 'cards' | 'list'
  const [lastSync, setLastSync] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // ADDED: log fetch context
      console.log(`🔄 [DashboardPage] Fetching tasks for "${user?.username}" role="${user?.role}"`);

      const res = await tasksAPI.getTasks(search, deptFilter);

      let data = res.data;

      // FIX: ensure data is always an array — backend now always returns array,
      // but defensive handling kept for robustness
      if (!Array.isArray(data)) {
        console.warn('⚠️ [DashboardPage] API returned non-array, converting:', typeof data);
        data = Object.entries(data).flatMap(([dept, arr]) =>
          Array.isArray(arr)
            ? arr.map((item, index) => ({
                ...item,
                _department: item._department || dept,
                _rowIndex: item._rowIndex ?? index,
              }))
            : []
        );
      }

      // Safety: ensure all items have required keys
      data = data.map((item, index) => ({
        ...item,
        _department: item._department || 'General',
        _rowIndex: item._rowIndex ?? index,
      }));

      // ADDED: debug log
      console.log(`✅ [DashboardPage] Loaded ${data.length} tasks`);
      if (user?.role === 'employee') {
        console.log(`👤 [DashboardPage] Employee view — showing ${data.length} assigned tasks`);
      }

      setTasks(data);
      setLastSync(new Date());
    } catch (err) {
      // IMPROVED: show meaningful error
      const msg = err?.response?.data?.message || err?.message || 'Failed to load tasks from Google Sheets';
      console.error('❌ [DashboardPage] Fetch error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Client-side filter for status/priority (no extra API call)
  const filteredTasks = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => t.deadlineStatus === 'overdue').length,
    urgent: tasks.filter(t => t.deadlineStatus === 'urgent').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
  };

  // Group by department
  const grouped = filteredTasks.reduce((acc, t) => {
    const d = t._department || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {});

  // MODIFIED: admin and manager can create tasks
  const canCreate = user?.role === 'manager' || user?.role === 'admin';

  // ADDED: title by role
  const pageTitle = user?.role === 'admin'
    ? 'All Tasks — Admin View'
    : user?.role === 'manager'
    ? 'Department Tasks'
    : 'My Tasks';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="main-content" style={{ flex: 1, padding: '0', overflow: 'hidden' }}>
        {/* Top header */}
        <div style={{
          background: 'white', borderBottom: '1px solid var(--surface-2)',
          padding: '20px 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-sm show-mobile" style={{ display: 'none' }}>☰</button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>
                {pageTitle}
              </h1>
              {lastSync && (
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 1 }}>
                  Live from Google Sheets · Synced {lastSync.toLocaleTimeString()}
                  {/* ADDED: show role context */}
                  {user?.role === 'admin' && (
                    <span style={{ marginLeft: 8, color: '#8B5CF6', fontWeight: 600 }}>· Full Admin View</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, padding: 3 }}>
              {['cards', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} className="btn btn-sm" style={{
                  background: view === v ? 'white' : 'transparent',
                  color: view === v ? 'var(--ink)' : 'var(--ink-40)',
                  boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
                  border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13,
                }}>
                  {v === 'cards' ? '⊞ Cards' : '☰ List'}
                </button>
              ))}
            </div>
            <button onClick={fetchTasks} className="btn btn-secondary btn-sm" title="Refresh from Sheets">
              ↻ Sync
            </button>
            {canCreate && (
              <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
                + New Task
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Tasks', value: stats.total, color: '#3B82F6', icon: '📋' },
              { label: 'In Progress', value: stats.inProgress, color: '#8B5CF6', icon: '⚡' },
              { label: 'Completed', value: stats.completed, color: '#10B981', icon: '✅' },
              { label: 'Overdue', value: stats.overdue, color: '#EF4444', icon: '🔴' },
              { label: 'Due Today', value: stats.urgent, color: '#F97316', icon: '⚠️' },
            ].map((stat, i) => (
              <div key={stat.label} className={`card animate-fadein-delay-${i}`} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-40)', marginBottom: 8 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                    </div>
                  </div>
                  <div style={{ fontSize: 26 }}>{stat.icon}</div>
                </div>
                {stats.total > 0 && (
                  <div style={{ marginTop: 12, height: 3, background: 'var(--surface-2)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.round((stat.value / stats.total) * 100)}%`, background: stat.color, borderRadius: 2, transition: 'width 600ms ease' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card animate-fadein-delay-1" style={{ padding: '18px 22px', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Search Tasks</label>
                <input className="form-input" type="text" value={search}
                  onChange={e => setSearch(e.target.value)} placeholder="Search title, assignee, customer..." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select className="form-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  {DEPT_LIST.map(d => <option key={d} value={d}>{DEPARTMENTS[d].label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Priority</label>
                <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                  {PRIORITY_LIST.map(p => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Content area */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card" style={{ height: 200, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 18, width: '75%', borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 6 }} />
                  <div style={{ flex: 1 }} />
                  <div className="skeleton" style={{ height: 32, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{
              background: 'rgba(239,68,68,0.05)', border: '1.5px solid rgba(239,68,68,0.2)',
              borderRadius: 16, padding: '40px 32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>Failed to Load Data</h3>
              <p style={{ color: 'var(--ink-40)', fontSize: 14, maxWidth: 420, margin: '0 auto 20px' }}>{error}</p>
              <button onClick={fetchTasks} className="btn btn-primary btn-sm">↻ Retry</button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: 20, padding: '60px 32px',
              textAlign: 'center', border: '2px dashed var(--surface-2)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>No Tasks Found</h3>
              <p style={{ color: 'var(--ink-40)', marginBottom: 24 }}>
                {search || deptFilter || statusFilter || priorityFilter
                  ? 'Try adjusting your filters or search terms.'
                  : user?.role === 'employee'
                  ? 'No tasks are assigned to you yet. Contact your manager.'
                  : 'No tasks are assigned yet. Create one to get started.'}
              </p>
              {canCreate && <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Create First Task</button>}
            </div>
          ) : view === 'cards' ? (
            // Card view - grouped by department
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {Object.entries(grouped).map(([dept, dTasks]) => {
                const dConfig = DEPARTMENTS[dept] || {};
                return (
                  <section key={dept} className="animate-fadein">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${dConfig.color || 'var(--surface-2)'}20` }}>
                      <span style={{ fontSize: 20 }}>{dConfig.icon}</span>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: dConfig.color || 'var(--ink)' }}>
                        {dConfig.label || dept}
                      </h2>
                      <span style={{ background: `${dConfig.color || '#3B82F6'}18`, color: dConfig.color || '#3B82F6', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>
                        {dTasks.length}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {dTasks.map(task => (
                        <TaskCard key={`${task._department}-${task._rowIndex}`} task={task} onTaskUpdated={fetchTasks} isManager={canCreate} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            // List / table view
            <div className="card animate-fadein" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const dConfig = DEPARTMENTS[task._department] || {};
                    const deadline = DEADLINE_CONFIG[task.deadlineStatus] || DEADLINE_CONFIG['normal'];
                    return (
                      <tr key={`${task._department}-${task._rowIndex}`}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{task.title}</div>
                          {task.id && <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>#{task.id}</div>}
                        </td>
                        <td>
                          <span style={{ background: dConfig.bg, color: dConfig.color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>
                            {dConfig.icon} {dConfig.label || task._department}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{task.assignedTo || '—'}</td>
                        <td>
                          <span className={`badge priority-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || '—'}</span>
                        </td>
                        <td>
                          <select
                            value={task.status || 'Pending'}
                            onChange={async (e) => {
                              try {
                                await tasksAPI.updateTask(task._department, task._rowIndex, { status: e.target.value });
                                fetchTasks();
                              } catch (err) {
                                // ADDED: show update errors
                                console.error('❌ [DashboardPage] Status update failed:', err?.response?.data?.message || err.message);
                              }
                            }}
                            className={`badge status-${(task.status || 'pending').toLowerCase().replace(' ', '')}`}
                            style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, outline: 'none' }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                          </select>
                        </td>
                        <td style={{ fontSize: 13 }}>{task.deadline || '—'}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, color: deadline.color }}>
                            {deadline.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <TaskForm
          onSuccess={() => { setShowForm(false); fetchTasks(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
