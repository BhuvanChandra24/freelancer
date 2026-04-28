/**
 * googleSheetsService.js
 * ============================================================
 * Pure Google Sheets integration layer.
 * Handles: fetchSheetData, updateSheetRow, appendSheetRow,
 *          syncSheetToDB, syncDBToSheet
 *
 * This is a NEW file — drop it into backend/services/
 * ============================================================
 */

const { google } = require('googleapis');
const Task = require('../models/Task');
const SyncLog = require('../models/SyncLog');
const { DEPARTMENTS, colLetterToIndex } = require('../config/Sheetsmapping');

// ─── Auth helper (reuses existing pattern) ────────────────────────────────────
async function getSheetsClient() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    credentials = require(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
  } else {
    throw new Error('Google service account credentials not configured.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ─── Retry wrapper ─────────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      console.warn(`⚠️  [Sheets] Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (isLast) throw err;
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

// ─── Column mapping: Sheet row array → MongoDB task object ────────────────────
/**
 * Maps a raw Google Sheets row (array of strings) to a plain task object
 * using the department's column config from Sheetsmapping.js.
 *
 * Sheet column → MongoDB field mapping (driven by Sheetsmapping.js):
 *   Col A (id)          → task.sheetTaskId
 *   Col B (title)       → task.title
 *   Col C (description) → task.description
 *   Col D (assignedTo)  → task.assignedTo  (username string)
 *   Col F (status)      → task.status
 *   Col G (priority)    → task.priority
 *   Col H (deadline)    → task.deadline
 *   Col J (createdBy)   → task.createdBy   (username string)
 *   + dept-specific columns stored in task.extraFields
 */
function rowToTaskObject(row, department, rowIndex) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) return null;

  const CORE_KEYS = ['id', 'title', 'description', 'assignedTo', 'status', 'priority', 'deadline', 'createdBy', 'completedAt', 'createdAt'];
  const result = { _rowIndex: rowIndex, _department: department, extraFields: {} };

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    const idx = colLetterToIndex(letter);
    const val = (row[idx] || '').trim();
    if (CORE_KEYS.includes(def.key)) {
      result[def.key] = val;
    } else {
      result.extraFields[def.key] = val;
    }
  });

  return result;
}

// ─── taskToRow: MongoDB task → Sheet row array ────────────────────────────────
function taskObjectToRow(task, department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) return [];

  const totalCols = Object.keys(deptConfig.columns).length;
  const row = new Array(totalCols).fill('');

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    const idx = colLetterToIndex(letter);
    let val = '';
    if (task[def.key] !== undefined) {
      val = task[def.key];
    } else if (task.extraFields && task.extraFields[def.key] !== undefined) {
      val = task.extraFields[def.key];
    }
    row[idx] = val !== null && val !== undefined ? String(val) : '';
  });

  return row;
}

// ─── 1. fetchSheetData ─────────────────────────────────────────────────────────
/**
 * Read raw rows from a specific department sheet.
 * Returns array of mapped task objects (not saved to DB yet).
 */
async function fetchSheetData(department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const { spreadsheetId, tabs } = deptConfig;
  if (!spreadsheetId) throw new Error(`No spreadsheetId for department: ${department}`);

  const tab = tabs.tasks;

  return withRetry(async () => {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab.sheetName}'!${tab.range}`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const dataRows = rows.slice(tab.dataStartRow - 1);

    return dataRows
      .filter(row => row && row.length > 0 && row[0]) // skip empty rows
      .map((row, i) => rowToTaskObject(row, department, i + tab.dataStartRow));
  });
}

// ─── 2. updateSheetRow ────────────────────────────────────────────────────────
/**
 * Update specific cells in an existing sheet row.
 * updatedFields: { key: value, ... }  (uses field keys, not column letters)
 */
async function updateSheetRow(department, rowIndex, updatedFields) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const { spreadsheetId, tabs } = deptConfig;
  const tab = tabs.tasks;
  const data = [];

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    if (Object.prototype.hasOwnProperty.call(updatedFields, def.key)) {
      data.push({
        range: `'${tab.sheetName}'!${letter}${rowIndex}`,
        values: [[String(updatedFields[def.key] ?? '')]],
      });
    }
  });

  if (data.length === 0) return { success: true, message: 'Nothing to update' };

  return withRetry(async () => {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    });
    return { success: true, rowIndex, fieldsUpdated: data.length };
  });
}

// ─── 3. appendSheetRow ────────────────────────────────────────────────────────
/**
 * Append a new task row to the department sheet.
 * taskData: plain object with field keys matching Sheetsmapping column keys.
 */
async function appendSheetRow(department, taskData) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const { spreadsheetId, tabs } = deptConfig;
  const tab = tabs.tasks;
  const row = taskObjectToRow(taskData, department);

  return withRetry(async () => {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tab.sheetName}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    return { success: true, updatedRange: response.data.updates?.updatedRange };
  });
}

// ─── 4. syncSheetToDB ─────────────────────────────────────────────────────────
/**
 * Pull all rows from Google Sheets → upsert into MongoDB.
 * Uses sheetTaskId (col A "id") as the unique key.
 * Returns counts: { upserted, skipped, errors }
 */
async function syncSheetToDB(departments = Object.keys(DEPARTMENTS)) {
  const summary = { upserted: 0, skipped: 0, errors: 0, details: [] };

  for (const department of departments) {
    try {
      const rows = await fetchSheetData(department);
      console.log(`📥 [syncSheetToDB] ${department}: ${rows.length} rows fetched`);

      for (const row of rows) {
        try {
          if (!row.id || !row.title) {
            summary.skipped++;
            continue;
          }

          // Deadline: convert "YYYY-MM-DD" string → Date
          const deadlineDate = row.deadline ? new Date(row.deadline) : null;

          await Task.findOneAndUpdate(
            { sheetTaskId: row.id, department },
            {
              $set: {
                sheetTaskId: row.id,
                title: row.title,
                description: row.description || '',
                department,
                status: normalizeStatus(row.status),
                priority: normalizePriority(row.priority),
                deadline: deadlineDate && !isNaN(deadlineDate) ? deadlineDate : undefined,
                sheetRowIndex: row._rowIndex,
                extraFields: row.extraFields || {},
                lastSyncedAt: new Date(),
              },
              // Set assignedTo/createdBy only on first insert (avoid overwriting ObjectId refs)
              $setOnInsert: {
                assignedToUsername: row.assignedTo || '',
                createdByUsername: row.createdBy || '',
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          summary.upserted++;
        } catch (rowErr) {
          summary.errors++;
          console.error(`❌ [syncSheetToDB] Row error (${department} row ${row._rowIndex}):`, rowErr.message);
        }
      }
    } catch (deptErr) {
      summary.errors++;
      summary.details.push({ department, error: deptErr.message });
      console.error(`❌ [syncSheetToDB] Dept error (${department}):`, deptErr.message);
    }
  }

  await SyncLog.create({
    direction: 'sheet_to_db',
    status: summary.errors > 0 ? (summary.upserted > 0 ? 'partial' : 'failed') : 'success',
    upserted: summary.upserted,
    skipped: summary.skipped,
    errors: summary.errors,
    details: summary.details,
  });

  console.log(`✅ [syncSheetToDB] Complete:`, summary);
  return summary;
}

// ─── 5. syncDBToSheet ─────────────────────────────────────────────────────────
/**
 * Push MongoDB tasks that were updated after last sync → back to Google Sheets.
 * Tasks with a sheetRowIndex get updated in-place; new tasks get appended.
 * Returns counts: { updated, appended, errors }
 */
async function syncDBToSheet(departments = Object.keys(DEPARTMENTS)) {
  const summary = { updated: 0, appended: 0, errors: 0, details: [] };

  // Find tasks modified since their last sync
  const pendingTasks = await Task.find({
    $or: [
      { lastSyncedAt: { $exists: false } },
      { $expr: { $gt: ['$updatedAt', '$lastSyncedAt'] } },
    ],
  });

  console.log(`📤 [syncDBToSheet] ${pendingTasks.length} tasks pending push`);

  for (const task of pendingTasks) {
    if (!departments.includes(task.department)) continue;

    try {
      const fieldsToSync = {
        id: task.sheetTaskId || '',
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedToUsername || '',
        status: task.status,
        priority: task.priority,
        deadline: task.deadline ? task.deadline.toISOString().split('T')[0] : '',
        ...task.extraFields,
      };

      if (task.sheetRowIndex) {
        await updateSheetRow(task.department, task.sheetRowIndex, fieldsToSync);
        summary.updated++;
      } else {
        await appendSheetRow(task.department, fieldsToSync);
        summary.appended++;
      }

      await Task.findByIdAndUpdate(task._id, { lastSyncedAt: new Date() });
    } catch (err) {
      summary.errors++;
      summary.details.push({ taskId: String(task._id), error: err.message });
      console.error(`❌ [syncDBToSheet] Task ${task._id}:`, err.message);
    }
  }

  await SyncLog.create({
    direction: 'db_to_sheet',
    status: summary.errors > 0 ? (summary.updated + summary.appended > 0 ? 'partial' : 'failed') : 'success',
    updated: summary.updated,
    appended: summary.appended,
    errors: summary.errors,
    details: summary.details,
  });

  console.log(`✅ [syncDBToSheet] Complete:`, summary);
  return summary;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────
function normalizeStatus(raw = '') {
  const map = {
    'pending': 'pending',
    'in progress': 'in-progress',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'on hold': 'in-progress',
  };
  return map[(raw || '').toLowerCase()] || 'pending';
}

function normalizePriority(raw = '') {
  const map = { low: 'low', medium: 'medium', high: 'high', critical: 'high' };
  return map[(raw || '').toLowerCase()] || 'medium';
}

module.exports = {
  fetchSheetData,
  updateSheetRow,
  appendSheetRow,
  syncSheetToDB,
  syncDBToSheet,
};