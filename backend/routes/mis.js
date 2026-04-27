const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { readAllDepartmentTasks, getCacheStats, invalidateCache } = require('../services/Sheetsadapter');
const { DEPARTMENTS } = require('../config/Sheetsmapping');

function getDeadlineStatus(deadlineStr) {
  if (!deadlineStr) return 'unknown';
  const deadline = new Date(deadlineStr);
  if (isNaN(deadline)) return 'unknown';
  const now = new Date();
  const diff = deadline - now;
  const hoursLeft = diff / (1000 * 60 * 60);
  if (diff < 0) return 'overdue';
  if (hoursLeft <= 24) return 'urgent';
  if (hoursLeft <= 72) return 'soon';
  return 'normal';
}

// ─── GET /api/mis ─────────────────────────────────────────────────────────────
// MODIFIED: admin now also has access (was manager-only)
router.get('/', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const user = req.user;

    // MODIFIED: admin sees ALL departments, manager sees their own
    const deptsToQuery =
      user.role === 'admin'
        ? Object.keys(DEPARTMENTS)
        : user.departments.filter(d => DEPARTMENTS[d]);

    // ADDED: log query context
    console.log(`📊 [GET /mis] user="${user.username}" role="${user.role}" querying depts: [${deptsToQuery.join(', ')}]`);

    let allTasks = await readAllDepartmentTasks(deptsToQuery);

    // ADDED: ensure allTasks is always an array
    if (!Array.isArray(allTasks)) {
      console.error('⚠️ [GET /mis] readAllDepartmentTasks returned non-array');
      allTasks = [];
    }

    // ── Summary stats ───────────────────────────────────────────────────────
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const pending = allTasks.filter(t => t.status?.toLowerCase() === 'pending').length;
    const inProgress = allTasks.filter(t => t.status?.toLowerCase() === 'in progress').length;
    const onHold = allTasks.filter(t => t.status?.toLowerCase() === 'on hold').length;

    const overdue = allTasks.filter(t => {
      if (t.status?.toLowerCase() === 'completed') return false;
      const d = new Date(t.deadline);
      return !isNaN(d) && d < now;
    }).length;

    const upcoming = allTasks.filter(t => {
      if (t.status?.toLowerCase() === 'completed') return false;
      const d = new Date(t.deadline);
      return !isNaN(d) && d >= now && d <= sevenDaysLater;
    }).length;

    const urgent = allTasks.filter(t => {
      if (t.status?.toLowerCase() === 'completed') return false;
      const status = getDeadlineStatus(t.deadline);
      return status === 'urgent';
    }).length;

    // ── Department stats ────────────────────────────────────────────────────
    const departmentMap = {};
    allTasks.forEach(task => {
      const dept = task._department;
      if (!departmentMap[dept]) {
        departmentMap[dept] = {
          department: dept,
          // ADDED: include display label
          label: DEPARTMENTS[dept]?.label || dept,
          color: DEPARTMENTS[dept]?.color || '#6366F1',
          total: 0, completed: 0, pending: 0, inProgress: 0, onHold: 0, overdue: 0
        };
      }
      departmentMap[dept].total++;
      const s = (task.status || '').toLowerCase();
      if (s === 'completed') departmentMap[dept].completed++;
      else if (s === 'pending') departmentMap[dept].pending++;
      else if (s === 'in progress') departmentMap[dept].inProgress++;
      else if (s === 'on hold') departmentMap[dept].onHold++;
      const deadline = new Date(task.deadline);
      if (!isNaN(deadline) && deadline < now && s !== 'completed') departmentMap[dept].overdue++;
    });

    const departmentStats = Object.values(departmentMap).map(d => ({
      ...d,
      completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    }));

    // ── Employee performance ────────────────────────────────────────────────
    const employeeMap = {};
    allTasks.forEach(task => {
      const name = (task.assignedTo || '').trim() || 'Unassigned';
      if (!employeeMap[name]) {
        employeeMap[name] = {
          employeeName: name,
          // ADDED: track which departments this employee works in
          departments: new Set(),
          totalAssigned: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0
        };
      }
      employeeMap[name].totalAssigned++;
      employeeMap[name].departments.add(task._department);
      const s = (task.status || '').toLowerCase();
      if (s === 'completed') employeeMap[name].completed++;
      else if (s === 'pending') employeeMap[name].pending++;
      else if (s === 'in progress') employeeMap[name].inProgress++;
      const deadline = new Date(task.deadline);
      if (!isNaN(deadline) && deadline < now && s !== 'completed') employeeMap[name].overdue++;
    });

    const employeePerformance = Object.values(employeeMap)
      .map(e => ({
        ...e,
        departments: Array.from(e.departments), // ADDED: convert Set to array for JSON
        completionRate: e.totalAssigned > 0 ? Math.round((e.completed / e.totalAssigned) * 100) : 0,
      }))
      .sort((a, b) => b.totalAssigned - a.totalAssigned);

    // ── Priority distribution ───────────────────────────────────────────────
    const priorityMap = {};
    allTasks.forEach(task => {
      const p = task.priority || 'Unknown';
      priorityMap[p] = (priorityMap[p] || 0) + 1;
    });
    const priorityStats = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

    // ── Status trend (last 30 days completed) ──────────────────────────────
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trendMap = {};
    allTasks.forEach(task => {
      if ((task.status || '').toLowerCase() === 'completed' && task.completedAt) {
        const d = new Date(task.completedAt);
        if (!isNaN(d) && d >= thirtyDaysAgo) {
          const key = d.toISOString().split('T')[0];
          trendMap[key] = (trendMap[key] || 0) + 1;
        }
      }
    });
    const completionTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // ── Overdue tasks detail ────────────────────────────────────────────────
    const overdueDetail = allTasks
      .filter(t => {
        const d = new Date(t.deadline);
        return !isNaN(d) && d < now && (t.status || '').toLowerCase() !== 'completed';
      })
      .slice(0, 15)
      .map(t => ({
        id: t.id,
        title: t.title,
        assignedTo: t.assignedTo,
        department: t._department,
        deadline: t.deadline,
        priority: t.priority,
        daysOverdue: Math.floor((now - new Date(t.deadline)) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // ADDED: manager performance (for admin view)
    // ADDED: track which managers manage which departments
    const managerPerformance = [];
    if (user.role === 'admin') {
      // This would be populated from User model in a real scenario
      // For now, we group by department and report stats
      departmentStats.forEach(d => {
        managerPerformance.push({
          department: d.department,
          label: d.label,
          total: d.total,
          completed: d.completed,
          overdue: d.overdue,
          completionRate: d.completionRate,
        });
      });
    }

    console.log(`✅ [GET /mis] Stats computed: total=${total}, completed=${completed}, overdue=${overdue}`);

    res.json({
      summary: {
        total,
        completed,
        pending,
        inProgress,
        onHold,
        overdue,
        upcoming,
        urgent,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        // ADDED: totals and pending aliased for frontend compatibility
        totalTasks: total,
        completedTasks: completed,
        overdueTasks: overdue,
        upcomingTasks: upcoming,
        pendingTasks: pending,
        inProgressTasks: inProgress,
      },
      departmentStats,
      employeePerformance,
      priorityStats,
      completionTrend,
      overdueDetail,
      managerPerformance, // ADDED: for admin view
      // ADDED: metadata
      meta: {
        generatedAt: new Date().toISOString(),
        role: user.role,
        departmentsQueried: deptsToQuery,
      },
    });
  } catch (err) {
    console.error('❌ [GET /mis] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/mis/sync ───────────────────────────────────────────────────────
router.post('/sync', auth, requireRole('admin', 'manager'), (req, res) => {
  const { department } = req.body;
  invalidateCache(department || null);
  console.log(`🔄 [POST /mis/sync] Cache cleared for: ${department || 'ALL'}`);
  res.json({ message: department ? `Cache cleared for ${department}` : 'All caches cleared' });
});

// ─── GET /api/mis/cache-stats ─────────────────────────────────────────────────
router.get('/cache-stats', auth, requireRole('admin'), (req, res) => {
  res.json(getCacheStats());
});

module.exports = router;
