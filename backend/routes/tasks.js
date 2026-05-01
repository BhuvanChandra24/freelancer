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


// ─── Deadline helper ─────────────────────────────────────────
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

// 🔥 NEW HELPERS
function normalizeDept(val = '') {
  return (val || '').trim().toUpperCase();
}
function normalizeDeptArray(arr = []) {
  return (arr || []).map(d => normalizeDept(d));
}
function fixDept(val = '') {
  let d = normalizeDept(val);
  if (d === 'CMR') d = 'CRM';
  return d;
}

// ─── 🔥 SCHEMA ROUTE (MOVED TO TOP) ─────────────────────────
router.get('/schema/:department', auth, (req, res) => {
  try {
    const normalizedDepartment = fixDept(req.params.department);

    const deptConfig = DEPARTMENTS[normalizedDepartment];
    if (!deptConfig) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const role = req.user?.role || 'user';

    let visibleCols = getVisibleColumns(normalizedDepartment, role);
    let editableCols = getEditableColumns(normalizedDepartment, role);

    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      visibleCols = getVisibleColumns(normalizedDepartment, 'employee');
      editableCols = getEditableColumns(normalizedDepartment, 'employee');
    }

    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      visibleCols = getVisibleColumns(normalizedDepartment, 'manager');
      editableCols = getEditableColumns(normalizedDepartment, 'manager');
    }

    if (!visibleCols || Object.keys(visibleCols).length === 0) {
      visibleCols = deptConfig.columns;
      editableCols = Object.values(deptConfig.columns).map(c => c.key);
    }

    res.json({
      department: normalizedDepartment,
      fields: Object.values(visibleCols).map(f => ({
        ...f,
        editable: editableCols.includes(f.key),
      })),
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── FILTER FIX ─────────────────────────────────────────────
function filterByRole(tasks, user) {
  if (user.role === 'employee') {
    return tasks.filter(t => t.assignedTo === user.username);
  }

  if (user.role === 'manager') {
    return tasks.filter(t => {
      const userDepts = normalizeDeptArray(user.departments);
      const taskDept = normalizeDept(t._department);
      return userDepts.includes(taskDept);
    });
  }

  return tasks;
}


// ─── GET ALL ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;

    let deptsToRead;

    if (user.role === 'employee') {
      deptsToRead = Object.keys(DEPARTMENTS);
    } else if (user.role === 'manager') {
      deptsToRead = normalizeDeptArray(user.departments).filter(d => DEPARTMENTS[d]);
    } else {
      deptsToRead = Object.keys(DEPARTMENTS);
    }

    let allTasks = await readAllDepartmentTasks(deptsToRead);

    allTasks = filterByRole(allTasks, user);

    const tasks = allTasks.map(task => ({
      ...task,
      deadlineStatus: getDeadlineStatus(task.deadline),
    }));

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── GET SINGLE ─────────────────────────────────────────────
router.get('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const user = req.user;
    const normalizedDepartment = fixDept(req.params.department);
    const userDepartments = normalizeDeptArray(user.departments);

    if (
      user.role === 'manager' &&
      userDepartments.length > 0 &&
      !userDepartments.includes(normalizedDepartment)
    ) {
      return res.status(403).json({ message: 'No access to this department' });
    }

    const tasks = await readDepartmentTasks(normalizedDepartment);
    const task = tasks.find(t => t._rowIndex === parseInt(req.params.rowIndex));

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── CREATE TASK ───────────────────────────────────────────
router.post('/', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const dbUser = await User.findOne({ username: req.user.username });

    let { title, description, assignedTo, department, deadline, priority } = req.body;

    let normalizedDepartment = fixDept(department);
    const normalizedPriority = (priority || 'medium').toLowerCase();

    const assignedUser = await User.findOne({ username: assignedTo });

    const newTask = await Task.create({
      title,
      description,
      department: normalizedDepartment,
      assignedTo: assignedUser._id,
      createdBy: dbUser._id,
      deadline: new Date(deadline),
      priority: normalizedPriority,
      sheetTaskId: `TASK-${normalizedDepartment}-${Date.now()}`,
      assignedToUsername: assignedUser.username,
      createdByUsername: dbUser.username,
    });

    await appendTask(normalizedDepartment, {
      id: newTask.sheetTaskId,
      title,
      description,
      assignedTo: assignedUser.username,
      deadline,
      priority: normalizedPriority,
      status: 'Pending',
      createdBy: dbUser.username,
    });

    res.status(201).json({ message: 'Task created', task: newTask });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── UPDATE ────────────────────────────────────────────────
router.put('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const normalizedDepartment = fixDept(req.params.department);
    await updateTaskRow(normalizedDepartment, parseInt(req.params.rowIndex), req.body);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ─── DELETE ────────────────────────────────────────────────
router.delete('/:department/:rowIndex', auth, async (req, res) => {
  try {
    const normalizedDepartment = fixDept(req.params.department);
    await deleteTaskRow(normalizedDepartment, parseInt(req.params.rowIndex));
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;