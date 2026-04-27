import React, { useState, useEffect } from 'react';
import { tasksAPI, authAPI } from '../services/api';
import {
  DEPARTMENTS, STATUS_CONFIG, PRIORITY_CONFIG, DEADLINE_CONFIG,
  formatDate, daysUntil, getInitials, generateAvatarColor
} from '../utils/helpers';

export default function TaskCard({ task, onTaskUpdated, isManager }) {
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // FEATURE: Task Reassignment
  const [showReassign, setShowReassign] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const dept = DEPARTMENTS[task._department] || {};
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG['Pending'];
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['Medium'];
  const deadline = DEADLINE_CONFIG[task.deadlineStatus] || DEADLINE_CONFIG['normal'];
  const days = daysUntil(task.deadline);
  const initials = getInitials(task.assignedTo || '');
  const avatarColor = generateAvatarColor(task.assignedTo || '');

  // FEATURE: Deadline System — highlight overdue tasks
  const isOverdue = task.deadlineStatus === 'overdue' && task.status !== 'Completed';

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await tasksAPI.updateTask(task._department, task._rowIndex, { status: newStatus });
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Failed to update status: ' + (err?.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  // FEATURE: Task Reassignment — load users when reassign panel opens
  useEffect(() => {
    if (!showReassign) return;
    authAPI.getUsers()
      .then(res => {
        // Filter to employees in the same department
        const filtered = res.data.filter(u =>
          u.role === 'employee' &&
          u.username !== task.assignedTo &&
          (u.departments?.length === 0 || u.departments?.includes(task._department))
        );
        setUsers(filtered);
        setSelectedUser('');
      })
      .catch(() => setUsers([]));
  }, [showReassign, task._department, task.assignedTo]);

  const handleReassign = async () => {
    if (!selectedUser) return;
    setReassigning(true);
    try {
      await tasksAPI.reassignTask(task._department, task._rowIndex, selectedUser);
      setShowReassign(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Failed to reassign: ' + (err?.response?.data?.message || err.message));
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="card animate-fadein" style={{
      border: isOverdue
        ? '1.5px solid rgba(239,68,68,0.4)'
        : `1px solid rgba(${dept.color?.replace('#', '')},0.1)`,
      transition: 'all 200ms',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    >
      {/* Color accent bar — red for overdue */}
      <div style={{ height: 4, background: isOverdue ? '#EF4444' : dept.color, opacity: 0.8 }} />

      <div style={{ padding: '18px 18px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${priority.cls}`}>{task.priority || 'Medium'}</span>
            {/* FEATURE: Deadline System — show overdue badge prominently */}
            <span className={`badge ${deadline.cls}`} style={{ fontSize: 10 }}>
              {task.deadlineStatus === 'overdue' ? `${Math.abs(days)}d overdue` :
               days !== null ? (days === 0 ? 'Due today' : `${days}d left`) : deadline.label}
            </span>
            {/* FEATURE: Deadline System — explicit "OVERDUE" label if not completed */}
            {isOverdue && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#EF4444',
                background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                ⚠ Overdue
              </span>
            )}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            color: dept.color, background: dept.bg || 'transparent',
            padding: '2px 8px', borderRadius: 6, flexShrink: 0,
          }}>
            {dept.icon} {dept.label}
          </div>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
          color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3,
        }}>
          {task.title || 'Untitled Task'}
        </h3>

        {task.description && (
          <p style={{ fontSize: 13, color: 'var(--ink-40)', lineHeight: 1.5, marginBottom: 10 }}>
            {expanded ? task.description : task.description.slice(0, 80) + (task.description.length > 80 ? '...' : '')}
            {task.description.length > 80 && (
              <button onClick={() => setExpanded(!expanded)} style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}> {expanded ? 'less' : 'more'}</button>
            )}
          </p>
        )}

        {/* Extra fields */}
        {(task.customerName || task.productName || task.itemName || task.vendorName) && (
          <div style={{
            background: 'var(--surface)', borderRadius: 8, padding: '8px 12px',
            marginBottom: 10, fontSize: 12, color: 'var(--ink-80)',
          }}>
            <span style={{ fontWeight: 600 }}>
              {task.customerName || task.productName || task.itemName || task.vendorName}
            </span>
            {task.contactNumber && <span style={{ marginLeft: 8, color: 'var(--ink-40)' }}>📞 {task.contactNumber}</span>}
          </div>
        )}

        {/* Footer: assignee + deadline + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: 'white',
              flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{task.assignedTo || '—'}</div>
              <div style={{ fontSize: 11, color: isOverdue ? '#EF4444' : 'var(--ink-40)', fontWeight: isOverdue ? 700 : 400 }}>
                📅 {formatDate(task.deadline)}
              </div>
            </div>
          </div>

          <select
            value={task.status || 'Pending'}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updating}
            className={`badge ${status.cls}`}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', outline: 'none', padding: '4px 10px',
            }}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        {/* FEATURE: Task Reassignment — button visible to managers */}
        {isManager && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--surface-2)', paddingTop: 10 }}>
            {!showReassign ? (
              <button
                onClick={() => setShowReassign(true)}
                className="btn btn-sm btn-secondary"
                style={{ width: '100%', fontSize: 12 }}
              >
                🔄 Reassign Task
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-40)' }}>
                  Reassign to another employee in {task._department}:
                </div>
                <select
                  className="form-select"
                  style={{ fontSize: 12, padding: '6px 10px' }}
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                >
                  <option value="">Select employee...</option>
                  {users.map(u => (
                    <option key={u._id} value={u.username}>{u.username}</option>
                  ))}
                </select>
                {users.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>
                    No other employees available in this department.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleReassign}
                    disabled={!selectedUser || reassigning}
                    className="btn btn-sm"
                    style={{ flex: 1, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12 }}
                  >
                    {reassigning ? 'Reassigning...' : '✓ Confirm'}
                  </button>
                  <button
                    onClick={() => setShowReassign(false)}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Task ID */}
        {task.id && (
          <div style={{ marginTop: 10, fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.05em' }}>
            #{task.id}
          </div>
        )}
      </div>
    </div>
  );
}