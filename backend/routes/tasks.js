const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const {
  readDepartmentTasks,
  readAllDepartmentTasks,
  appendTask,
  updateTaskRow,
  deleteTaskRow,
} = require('../services/Sheetsadapter');
const {
  DEPARTMENTS,
  getVisibleColumns,
  getEditableColumns,
} = require('../config/Sheetsmapping');
const User = require('../models/User');

// ─── Deadline helper ──────────────────────────────────────────────────────────
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

function normalizeIdentifier(value = '') {
  return (value || '').trim().toLowerCase();
}

function isTaskAssignedToUser(task, user) {
  const assignedTo = normalizeIdentifier(task.assignedTo);
  const username = normalizeIdentifier(user.username);
  const email = normalizeIdentifier(user.email || '');

  if (assignedTo === username) return true;
  if (email && assignedTo === email) return true;
  if (email) {
    const emailLocal = normalizeIdentifier(email.split('@')[0]);
    if (assignedTo === emailLocal) return true;
    if (emailLocal === username) return true;
  }
  const nameParts = assignedTo.split(/\s+/);
  if (nameParts.includes(username)) return true;
  if (username.length >= 3 && assignedTo.startsWith(username)) return true;
  return false;
}

// ─── Filter tasks by role ──────────────────────────────────────────────────────
function filterByRole(tasks, user) {
  if (user.role === 'employee') {
    const filtered = tasks.filter(t => isTaskAssignedToUser(t, user));
    console.log(`🔍 [Assignment Filter] User: "${user.username}" | Total tasks: ${tasks.length} | Matched: ${filtered.length}`);
    if (filtered.length === 0 && tasks.length > 0) {
      const sample = tasks.slice(0, 3).map(t => t.assignedTo);
      console.log(`⚠️  [Assignment Filter] No match found. Sample assignedTo values:`, sample);
    }
    return filtered;
  }
  if (user.role === 'manager') {
    return tasks.filter(t => user.departments.includes(t._department));
  }
  return tasks;
}

// ─── Apply visible field mask ──────────────────────────────────────────────────
function maskFields(task, role) {
  const visible = getVisibleColumns(task._department, role);
  const visibleKeys = Object.values(visible).map(v => v.key);
  const masked = { _rowIndex: task._rowIndex, _department: task._department };
  visibleKeys.forEach(k => {
    if (task[k] !== undefined) masked[k] = task[k];
  });
  return masked;
}

// ─── GET /api/tasks ────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { search, department } = req.query;
    const user = req.user;

    console.log(`📋 [GET /tasks] user="${user.username}" role="${user.role}" dept="${department || 'ALL'}" search="${search || ''}"`);

    let deptsToRead;
    if (user.role === 'employee') {
      deptsToRead = Object.keys(DEPARTMENTS);
    } else if (user.role === 'manager') {
      deptsToRead = user.departments.filter(d => DEPARTMENTS[d]);
    } else {
      deptsToRead = department ? [department] : Object.keys(DEPARTMENTS);
    }

    if (department && deptsToRead.includes(department)) {
      deptsToRead = [department];
    } else if (department && !deptsToRead.includes(department)) {
      deptsToRead = [];
    }

    let allTasks = await readAllDepartmentTasks(deptsToRead);

    if (!Array.isArray(allTasks)) {
      console.error('⚠️ [GET /tasks] readAllDepartmentTasks returned non-array:', typeof allTasks);
      allTasks = [];
    }

    allTasks = filterByRole(allTasks, user);

    if (search) {
      const q = search.toLowerCase();
      allTasks = allTasks.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.assignedTo || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q)
      );
    }

    // FEATURE: Deadline System — compute deadline status per task
    // Tasks past their deadline that are not completed get 'overdue' status
    const tasks = allTasks.map(task => {
      const deadlineStatus = getDeadlineStatus(task.deadline);
      return {
        ...maskFields(task, user.role),
        deadlineStatus,
      };
    });

    console.log(`✅ [GET /tasks] Returning ${tasks.length} tasks for "${user.username}"`);
    res.json(tasks);
  } catch (err) {
    console.error('❌ [GET /tasks] Error:', err.message);
    res.status(500).json({ message: err.message, tasks: [] });
  }
});

// ─── GET /api/tasks/:department/:rowIndex ──────────────────────────────────────
router.get('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const user = req.user;

    if (user.role === 'manager' && !user.departments.includes(department)) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(department);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (user.role === 'employee' && !isTaskAssignedToUser(task, user)) {
      console.log(`⛔ [GET /tasks/:dept/:row] Employee "${user.username}" cannot view task assigned to "${task.assignedTo}"`);
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json({
      ...maskFields(task, user.role),
      deadlineStatus: getDeadlineStatus(task.deadline),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/tasks ───────────────────────────────────────────────────────────
router.post('/', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const user = req.user;
    const { department, ...fields } = req.body;

    if (!department || !DEPARTMENTS[department]) {
      return res.status(400).json({ message: 'Valid department is required' });
    }
    // ✅ normalize departments (FIX)
// ✅ SAFE NORMALIZATION (FINAL FIX)
const normalizedDepartments = (user.departments || []).map(dep => {
  if (typeof dep === "string") {
    try {
      const parsed = JSON.parse(dep);
      return Array.isArray(parsed) ? parsed[0].trim() : dep.trim();
    } catch {
      return dep.trim();
    }
  }
  return dep;
});

// 🔥 DEBUG LOGS (VERY IMPORTANT — CHECK RENDER LOGS)
console.log("USER:", user.username);
console.log("USER DEPARTMENTS RAW:", user.departments);
console.log("NORMALIZED:", normalizedDepartments);
console.log("REQUESTED DEPARTMENT:", department);

// ✅ FINAL CHECK
// ✅ FINAL SAFE CHECK (ALLOW IF DEPARTMENTS EMPTY OR MATCH)
if (
  user.role === 'manager' &&
  normalizedDepartments.length > 0 &&
  !normalizedDepartments.includes(department)
) {
  return res.status(403).json({ message: 'No access to this department' });
}
    if (!fields.title || !fields.assignedTo || !fields.deadline) {
      return res.status(400).json({ message: 'title, assignedTo, and deadline are required' });
    }

    const normalizedAssignedTo = (fields.assignedTo || '').trim();
    const taskId = `TASK-${department.substring(0, 3).toUpperCase()}-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];

    const taskData = {
      id: taskId,
      ...fields,
      assignedTo: normalizedAssignedTo,
      status: fields.status || 'Pending',
      priority: fields.priority || 'Medium',
      createdAt: now,
      createdBy: user.username,
      completedAt: '',
    };

    console.log(`📝 [POST /tasks] Creating task "${taskData.id}" in dept "${department}" assigned to "${normalizedAssignedTo}" by "${user.username}"`);

    await appendTask(department, taskData);

    console.log(`✅ [POST /tasks] Task created successfully: ${taskData.id}`);

    res.status(201).json({
      message: 'Task created successfully',
      task: { ...taskData, _department: department, deadlineStatus: getDeadlineStatus(fields.deadline) },
    });
  } catch (err) {
    console.error('❌ [POST /tasks] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/tasks/:department/:rowIndex ──────────────────────────────────────
router.put('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const user = req.user;
    const updates = req.body;

    if (!DEPARTMENTS[department]) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    if (user.role === 'manager' && !user.departments.includes(department)) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(department);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (user.role === 'employee' && !isTaskAssignedToUser(task, user)) {
      return res.status(403).json({ message: 'Not authorized to edit this task' });
    }

    const editableKeys = getEditableColumns(department, user.role);
    const allowedUpdates = {};
    Object.entries(updates).forEach(([key, val]) => {
      if (editableKeys.includes(key)) {
        allowedUpdates[key] = val;
      }
    });

    // FEATURE: Deadline System — auto-set completedAt when marking complete
    if (allowedUpdates.status === 'Completed' && !task.completedAt) {
      allowedUpdates.completedAt = new Date().toISOString().split('T')[0];
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: 'No editable fields provided for your role' });
    }

    console.log(`✏️  [PUT /tasks] User "${user.username}" updating row ${rowIndex} in "${department}":`, Object.keys(allowedUpdates));

    await updateTaskRow(department, parseInt(rowIndex), allowedUpdates);

    res.json({ message: 'Task updated successfully', updated: allowedUpdates });
  } catch (err) {
    console.error('❌ [PUT /tasks] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── FEATURE: Task Reassignment ───────────────────────────────────────────────
// POST /api/tasks/:department/:rowIndex/reassign
// Manager can reassign a task to another employee within the same department
router.post('/:department/:rowIndex/reassign', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const { newAssignee } = req.body;
    const user = req.user;

    if (!DEPARTMENTS[department]) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    if (!newAssignee || !newAssignee.trim()) {
      return res.status(400).json({ message: 'newAssignee (username) is required' });
    }

    // Managers can only reassign within their own departments
    if (user.role === 'manager' && !user.departments.includes(department)) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    // Verify task exists
    const tasks = await readDepartmentTasks(department);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Verify the new assignee exists and is an employee in the same department
    const newEmployee = await User.findOne({
      username: newAssignee.trim(),
      isActive: true,
    });

    if (!newEmployee) {
      return res.status(404).json({ message: `User "${newAssignee}" not found` });
    }

    // Employees must belong to the same department as the task
    if (
      newEmployee.role === 'employee' &&
      newEmployee.departments.length > 0 &&
      !newEmployee.departments.includes(department)
    ) {
      return res.status(400).json({
        message: `User "${newAssignee}" does not belong to the "${department}" department`,
      });
    }

    const previousAssignee = task.assignedTo;
    const normalizedNewAssignee = newAssignee.trim();

    console.log(`🔄 [REASSIGN] Task row ${rowIndex} in "${department}": "${previousAssignee}" → "${normalizedNewAssignee}" by "${user.username}"`);

    // Update the assignedTo field in the sheet
    await updateTaskRow(department, parseInt(rowIndex), {
      assignedTo: normalizedNewAssignee,
    });

    res.json({
      message: `Task successfully reassigned from "${previousAssignee}" to "${normalizedNewAssignee}"`,
      previousAssignee,
      newAssignee: normalizedNewAssignee,
      department,
      rowIndex: parseInt(rowIndex),
    });
  } catch (err) {
    console.error('❌ [REASSIGN] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/tasks/:department/:rowIndex ───────────────────────────────────
router.delete('/:department/:rowIndex', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const user = req.user;

    if (user.role === 'manager' && !user.departments.includes(department)) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    console.log(`🗑️  [DELETE /tasks] User "${user.username}" deleting row ${rowIndex} from "${department}"`);
    await deleteTaskRow(department, parseInt(rowIndex));
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/tasks/schema/:department ────────────────────────────────────────
router.get('/schema/:department', auth, (req, res) => {
  const { department } = req.params;
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) return res.status(404).json({ message: 'Department not found' });

  const visibleCols = getVisibleColumns(department, req.user.role);
  const editableCols = getEditableColumns(department, req.user.role);

  res.json({
    department,
    fields: Object.values(visibleCols).map(f => ({
      ...f,
      editable: editableCols.includes(f.key),
    })),
  });
});

module.exports = router;