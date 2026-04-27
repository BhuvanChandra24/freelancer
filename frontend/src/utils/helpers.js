export const DEPARTMENTS = {
  CRM: { label: 'CRM', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: '👥' },
  Production: { label: 'Production', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: '🏭' },
  Store: { label: 'Store', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '📦' },
  Commercial: { label: 'Commercial', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: '💼' },
  AfterSales: { label: 'After Sales', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: '🔧' },
};

export const STATUS_CONFIG = {
  Pending: { label: 'Pending', cls: 'status-pending', dot: '#F59E0B' },
  'In Progress': { label: 'In Progress', cls: 'status-inprogress', dot: '#3B82F6' },
  Completed: { label: 'Completed', cls: 'status-completed', dot: '#10B981' },
  'On Hold': { label: 'On Hold', cls: 'status-onhold', dot: '#6B7280' },
};

export const PRIORITY_CONFIG = {
  Low: { label: 'Low', cls: 'priority-low' },
  Medium: { label: 'Medium', cls: 'priority-medium' },
  High: { label: 'High', cls: 'priority-high' },
  Critical: { label: 'Critical', cls: 'priority-critical' },
};

export const DEADLINE_CONFIG = {
  overdue: { label: 'Overdue', cls: 'status-overdue', color: '#EF4444' },
  urgent: { label: 'Due Today', cls: 'status-urgent', color: '#F97316' },
  soon: { label: 'Due Soon', cls: 'status-inprogress', color: '#3B82F6' },
  normal: { label: 'On Track', cls: 'status-completed', color: '#10B981' },
  unknown: { label: 'No Date', cls: 'status-onhold', color: '#6B7280' },
};

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const diff = d - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function generateAvatarColor(name = '') {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#6366F1', '#D946EF'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}