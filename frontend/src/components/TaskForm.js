import React, { useState, useEffect } from 'react';
import { tasksAPI, authAPI } from '../services/api';
import { DEPARTMENTS } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

export default function TaskForm({ onSuccess, onCancel, editTask = null }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '', description: '', assignedTo: '',
    priority: 'Medium', deadline: '', status: 'Pending',
    ...editTask,
  });
  const [department, setDepartment] = useState(editTask?._department || (user?.departments?.[0]) || 'CRM');
  const [schema, setSchema] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState('');

  const availableDepts = user?.role === 'admin'
  ? Object.keys(DEPARTMENTS)
  : (user?.departments && user.departments.length > 0
      ? user.departments
      : Object.keys(DEPARTMENTS)); // ✅ fallback to all

  // Load schema for selected department
  useEffect(() => {
    if (!department) return;
    setSchemaLoading(true);
    tasksAPI.getSchema(department)
      .then(res => setSchema(res.data.fields || []))
      .catch(() => setSchema([]))
      .finally(() => setSchemaLoading(false));
  }, [department]);

  // Load users for assignment
  useEffect(() => {
    authAPI.getUsers()
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]));
  }, []);

  const handleChange = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editTask) {
        await tasksAPI.updateTask(editTask._department, editTask._rowIndex, formData);
      } else {
        await tasksAPI.createTask({ department, ...formData });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  // Core fields always shown
  const coreFields = ['title', 'description', 'assignedTo', 'priority', 'deadline', 'status'];
  // Extra fields from schema (department-specific)
  const extraFields = schema.filter(f => !coreFields.includes(f.key) && f.editable && f.key !== 'id' && f.key !== 'createdAt' && f.key !== 'createdBy' && f.key !== 'completedAt');

  const renderField = (field) => {
    if (!field.editable) return null;
    const val = formData[field.key] || '';
    return (
      <div className="form-group" key={field.key}>
        <label className="form-label">{field.label}{field.required && ' *'}</label>
        {field.type === 'select' ? (
          <select className="form-select" value={val} onChange={e => handleChange(field.key, e.target.value)}>
            <option value="">Select {field.label}</option>
            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea className="form-textarea" value={val} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.label} rows={3} />
        ) : field.type === 'number' ? (
          <input className="form-input" type="number" value={val} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.label} />
        ) : field.type === 'date' ? (
          <input className="form-input" type="date" value={val} onChange={e => handleChange(field.key, e.target.value)} />
        ) : (
          <input className="form-input" type={field.type || 'text'} value={val} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.label} />
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && onCancel) onCancel(); }}>
      <div className="modal-box">
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>
              {editTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button onClick={onCancel} className="btn btn-ghost btn-sm" style={{ fontSize: 20, padding: '4px 10px' }}>✕</button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#B91C1C', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14,
            }}>{error}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Department (only for new tasks) */}
            {!editTask && (
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                  {availableDepts.map(d => (
                    <option key={d} value={d}>{DEPARTMENTS[d]?.label || d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Core fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Task Title *</label>
                <input className="form-input" type="text" value={formData.title}
                  onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Follow up with client" required />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={formData.description}
                  onChange={e => handleChange('description', e.target.value)} placeholder="Task details..." rows={3} />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned To *</label>
                <select className="form-select" value={formData.assignedTo}
                  onChange={e => handleChange('assignedTo', e.target.value)} required>
                  <option value="">Select Employee</option>
                  {users.map(u => (
                    <option key={u._id} value={u.username}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority *</label>
                <select className="form-select" value={formData.priority}
                  onChange={e => handleChange('priority', e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className="form-input" type="date" value={formData.deadline}
                  onChange={e => handleChange('deadline', e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status}
                  onChange={e => handleChange('status', e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Department-specific extra fields */}
            {!schemaLoading && extraFields.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--surface-2)', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-40)', marginBottom: 14 }}>
                    {DEPARTMENTS[department]?.label} Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {extraFields.map(field => (
                      <div key={field.key} style={{ gridColumn: field.type === 'textarea' ? '1/-1' : '' }}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Saving...</> : (editTask ? 'Update Task' : '+ Create Task')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}