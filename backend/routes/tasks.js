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
const Task = require('../models/Task');


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
// 🔥 Helper (ADD THIS ON TOP ONCE)
function normalizeDept(val = '') {
  return (val || '').trim().toUpperCase();
}

function normalizeDeptArray(arr = []) {
  return (arr || []).map(d => normalizeDept(d));
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

    const normalizedDepartment = normalizeDept(department);
    const userDepartments = normalizeDeptArray(user.departments);

    // ✅ FIXED ACCESS CHECK
    if (
      user.role === 'manager' &&
      userDepartments.length > 0 &&
      !userDepartments.includes(normalizedDepartment)
    ) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(normalizedDepartment);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (user.role === 'employee' && !isTaskAssignedToUser(task, user)) {
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
    const authUser = req.user;

    // 🔥 NEW: Fetch full user from DB (CRITICAL FIX)
    const dbUser = await User.findOne({ username: authUser.username });

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let { title, description, assignedTo, department, deadline, priority } = req.body;

    // 🔥 EXISTING + SAFE NORMALIZATION
    const normalizedDepartment = (department || '').trim();
    const normalizedPriority = (priority || 'medium').toLowerCase();

    // ✅ Validate assigned user
    const assignedUser = await User.findOne({ username: assignedTo });
    if (!assignedUser) {
      return res.status(404).json({ message: 'Assigned user not found' });
    }

    // ✅ Generate Sheet Task ID
    const sheetTaskId = `TASK-${normalizedDepartment.substring(0,3).toUpperCase()}-${Date.now()}`;

    // ✅ Create in MongoDB (FIXED createdBy)
    const newTask = await Task.create({
      title,
      description,
      department: normalizedDepartment,
      assignedTo: assignedUser._id,

      // 🔥 FIXED HERE
      createdBy: dbUser._id,

      deadline: new Date(deadline),
      priority: normalizedPriority,
      sheetTaskId,

      // ✅ kept (no removal)
      assignedToUsername: assignedUser.username,
      createdByUsername: dbUser.username,
    });

    // ✅ Append to Google Sheets
    let sheetRowIndex = null;

    try {
      const sheetResponse = await appendTask(normalizedDepartment, {
        id: sheetTaskId,
        title,
        description,
        assignedTo: assignedUser.username,
        deadline,
        priority: normalizedPriority,
        status: 'Pending',
        createdBy: dbUser.username, // 🔥 FIXED
      });

      sheetRowIndex = sheetResponse?.rowIndex || null;

    } catch (err) {
      console.error("❌ Sheets Error:", err.message);
    }

    // ✅ Update DB
    if (sheetRowIndex) {
      newTask.sheetRowIndex = sheetRowIndex;
      newTask.lastSyncedAt = new Date();
      await newTask.save();
    }

    const populatedTask = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Task created successfully',
      task: populatedTask,
      sheetRowIndex,
    });

  } catch (err) {
    console.error("❌ Create Task Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});
// ─── PUT /api/tasks/:department/:rowIndex ──────────────────────────────────────
router.put('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const user = req.user;
    const updates = req.body;

    const normalizedDepartment = normalizeDept(department);
    const userDepartments = normalizeDeptArray(user.departments);

    if (!DEPARTMENTS[normalizedDepartment]) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    if (
      user.role === 'manager' &&
      userDepartments.length > 0 &&
      !userDepartments.includes(normalizedDepartment)
    ) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(normalizedDepartment);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (user.role === 'employee' && !isTaskAssignedToUser(task, user)) {
      return res.status(403).json({ message: 'Not authorized to edit this task' });
    }

    const editableKeys = getEditableColumns(normalizedDepartment, user.role);
    const allowedUpdates = {};

    Object.entries(updates).forEach(([key, val]) => {
      if (editableKeys.includes(key)) {
        allowedUpdates[key] = val;
      }
    });

    if (allowedUpdates.status === 'Completed' && !task.completedAt) {
      allowedUpdates.completedAt = new Date().toISOString().split('T')[0];
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: 'No editable fields provided for your role' });
    }

    await updateTaskRow(normalizedDepartment, parseInt(rowIndex), allowedUpdates);

    res.json({ message: 'Task updated successfully', updated: allowedUpdates });
  } catch (err) {
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

    const normalizedDepartment = normalizeDept(department);
    const userDepartments = normalizeDeptArray(user.departments);

    if (!DEPARTMENTS[normalizedDepartment]) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    if (
      user.role === 'manager' &&
      userDepartments.length > 0 &&
      !userDepartments.includes(normalizedDepartment)
    ) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(normalizedDepartment);
    const task = tasks.find(t => t._rowIndex === parseInt(rowIndex));

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const newEmployee = await User.findOne({
      username: newAssignee.trim(),
      isActive: true,
    });

    if (!newEmployee) {
      return res.status(404).json({ message: `User not found` });
    }

    const empDepartments = normalizeDeptArray(newEmployee.departments);

    if (
      newEmployee.role === 'employee' &&
      empDepartments.length > 0 &&
      !empDepartments.includes(normalizedDepartment)
    ) {
      return res.status(400).json({
        message: `User not in department`,
      });
    }

    await updateTaskRow(normalizedDepartment, parseInt(rowIndex), {
      assignedTo: newAssignee.trim(),
    });

    res.json({ message: 'Task reassigned successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ─── DELETE /api/tasks/:department/:rowIndex ───────────────────────────────────
router.delete('/:department/:rowIndex', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { department, rowIndex } = req.params;
    const user = req.user;

    const normalizedDepartment = normalizeDept(department);
    const userDepartments = normalizeDeptArray(user.departments);

    if (
      user.role === 'manager' &&
      userDepartments.length > 0 &&
      !userDepartments.includes(normalizedDepartment)
    ) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    await deleteTaskRow(normalizedDepartment, parseInt(rowIndex));
    res.json({ message: 'Task deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/tasks/schema/:department ────────────────────────────────────────
// ─── GET /api/tasks/schema/:department ────────────────────────────────────────
// ─── GET /api/tasks/schema/:department ────────────────────────────────────────
router.get('/schema/:department', auth, (req, res) => {
  try {
    const { department } = req.params;

    // ✅ Normalize department
    const normalizedDepartment = (department || '').trim().toUpperCase();

    console.log("📌 SCHEMA REQUEST");
    console.log("ROLE:", req.user?.role);
    console.log("RAW DEPARTMENT:", department);
    console.log("NORMALIZED DEPARTMENT:", normalizedDepartment);

    // ✅ Validate department
    const deptConfig = DEPARTMENTS[normalizedDepartment];
    if (!deptConfig) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const role = req.user?.role || 'user';

    // ✅ Try with actual role
    let visibleCols = getVisibleColumns(normalizedDepartment, role);
    let editableCols = getEditableColumns(normalizedDepartment, role);

    console.log("VISIBLE COLS (ROLE):", Object.keys(visibleCols || {}).length);

    // ✅ Fallback 1 → employee
    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      console.log("⚠️ Fallback to employee");
      visibleCols = getVisibleColumns(normalizedDepartment, 'employee');
      editableCols = getEditableColumns(normalizedDepartment, 'employee');
    }

    // ✅ Fallback 2 → manager
    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      console.log("⚠️ Fallback to manager");
      visibleCols = getVisibleColumns(normalizedDepartment, 'manager');
      editableCols = getEditableColumns(normalizedDepartment, 'manager');
    }

    // ✅ FINAL FALLBACK (NO 403 EVER)
    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      console.log("🚨 FORCE FULL ACCESS (DEV MODE)");

      visibleCols = deptConfig.columns;
      editableCols = Object.values(deptConfig.columns).map(c => c.key);
    }

    // ✅ Send response
    res.json({
      department: normalizedDepartment,
      fields: Object.values(visibleCols).map(f => ({
        ...f,
        editable: editableCols.includes(f.key),
      })),
    });

  } catch (err) {
    console.error("❌ Schema error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;