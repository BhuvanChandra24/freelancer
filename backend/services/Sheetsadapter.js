/**
 * Google Sheets Adapter
 * ============================================================
 * All read and write operations to Google Sheets happen here.
 * Uses service account authentication.
 * Includes optional in-memory caching to reduce API calls.
 * ============================================================
 */

/**
 * Google Sheets Adapter
 * ============================================================
 */

const { google } = require('googleapis');
const NodeCache = require('node-cache');
const { DEPARTMENTS, colLetterToIndex, indexToColLetter } = require('../config/Sheetsmapping');

// ✅ MUST BE GLOBAL (FIXES ERROR)
let sheetsClient = null;

// Initialize cache
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || '300'),
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'),
});

/**
 * Initialize Google Sheets client using service account
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  let credentials;

  // ✅ PRIMARY: Render ENV (RECOMMENDED)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    // 🔥 FIX: newline issue in private key
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  // ✅ OPTIONAL (kept for flexibility)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  // ❌ REMOVED FILE-BASED APPROACH (CAUSE OF YOUR ERROR)
  // else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
  //   credentials = require(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
  // }

  else {
    throw new Error(
      'Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY in environment'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // ✅ CREATE CLIENT
  sheetsClient = google.sheets({ version: 'v4', auth });

  console.log('✅ Google Sheets client initialized');

  return sheetsClient;
}

module.exports = {
  getSheetsClient,
};

/**
 * Read all rows from a department's task sheet
 * Returns array of task objects (mapped using columns config)
 */
async function readDepartmentTasks(department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error(`No spreadsheet ID configured for department: ${department}`);
  }

  const tab = deptConfig.tabs.tasks;
  const cacheKey = `tasks_${department}`;

  // Return from cache if available
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return cached;
  }

  const sheets = await getSheetsClient();
  const range = `'${tab.sheetName}'!${tab.range}`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // First row = header row (we use our column config, but we verify order)
    const headerRow = rows[tab.headerRow - 1];
    const dataRows = rows.slice(tab.dataStartRow - 1);

    // Build column index map from config
    const columnKeys = Object.entries(deptConfig.columns).reduce((acc, [letter, def]) => {
      const idx = colLetterToIndex(letter);
      acc[idx] = def.key;
      return acc;
    }, {});

    // Map each data row to an object
    const tasks = dataRows
      .filter(row => row && row.length > 0 && row[0]) // skip empty rows
      .map((row, rowIndex) => {
        const task = {
          _rowIndex: rowIndex + tab.dataStartRow, // 1-based sheet row number
          _department: department,
        };
        Object.entries(columnKeys).forEach(([idx, key]) => {
          task[key] = row[parseInt(idx)] || '';
        });
        return task;
      });

    // Cache the result
    cache.set(cacheKey, tasks);
    return tasks;
  } catch (err) {
    console.error(`❌ Error reading ${department} sheet:`, err.message);
    throw new Error(`Failed to read ${department} data from Google Sheets: ${err.message}`);
  }
}

/**
 * Append a new task row to a department sheet
 */
async function appendTask(department, taskData) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  // Build the row array in correct column order
  const totalCols = Object.keys(deptConfig.columns).length;
  const row = new Array(totalCols).fill('');

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    const idx = colLetterToIndex(letter);
    row[idx] = taskData[def.key] !== undefined ? String(taskData[def.key]) : '';
  });

  const range = `'${tab.sheetName}'!A:A`;

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    // Invalidate cache for this department
    cache.del(`tasks_${department}`);

    return { success: true, updatedRange: response.data.updates?.updatedRange };
  } catch (err) {
    console.error(`❌ Error appending to ${department} sheet:`, err.message);
    throw new Error(`Failed to write task to ${department} sheet: ${err.message}`);
  }
}

/**
 * Update specific fields in an existing task row
 * rowIndex is the 1-based sheet row number
 */
async function updateTaskRow(department, rowIndex, updatedFields) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  // Build only the specific cell updates (not the entire row)
  const data = [];

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    if (updatedFields.hasOwnProperty(def.key)) {
      const colLetter = letter;
      const cellRange = `'${tab.sheetName}'!${colLetter}${rowIndex}`;
      data.push({
        range: cellRange,
        values: [[String(updatedFields[def.key])]],
      });
    }
  });

  if (data.length === 0) return { success: true, message: 'No fields to update' };

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });

    // Invalidate cache
    cache.del(`tasks_${department}`);

    return { success: true };
  } catch (err) {
    console.error(`❌ Error updating row ${rowIndex} in ${department}:`, err.message);
    throw new Error(`Failed to update task in ${department} sheet: ${err.message}`);
  }
}

/**
 * Delete a task row from the sheet (clears the row content)
 * Note: We clear rather than delete to avoid row shift issues
 */
async function deleteTaskRow(department, rowIndex) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();
  const totalCols = Object.keys(deptConfig.columns).length;
  const lastColLetter = indexToColLetter(totalCols - 1);

  try {
    // Clear the entire row
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${tab.sheetName}'!A${rowIndex}:${lastColLetter}${rowIndex}`,
    });

    // Invalidate cache
    cache.del(`tasks_${department}`);

    return { success: true };
  } catch (err) {
    console.error(`❌ Error deleting row ${rowIndex} in ${department}:`, err.message);
    throw new Error(`Failed to delete task in ${department} sheet: ${err.message}`);
  }
}

/**
 * Read tasks across ALL departments
 * Returns consolidated list with department info attached
 */
async function readAllDepartmentTasks(departments = Object.keys(DEPARTMENTS)) {
  const results = await Promise.allSettled(
    departments.map(async (dept) => {
      const tasks = await readDepartmentTasks(dept);
      return tasks.map(t => ({ ...t, _department: dept }));
    })
  );

  const allTasks = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allTasks.push(...result.value);
    } else {
      console.error(`Failed to read ${departments[i]}:`, result.reason?.message);
    }
  });

  return allTasks;
}

/**
 * Manually invalidate cache for a department (or all)
 */
function invalidateCache(department = null) {
  if (department) {
    cache.del(`tasks_${department}`);
  } else {
    cache.flushAll();
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Ensure header row exists in a department's sheet
 * Useful when setting up a new sheet
 */
async function ensureSheetHeaders(department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  const headers = Object.values(deptConfig.columns).map(def => def.label);

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab.sheetName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to write headers: ${err.message}`);
  }
}

module.exports = {
  readDepartmentTasks,
  readAllDepartmentTasks,
  appendTask,
  updateTaskRow,
  deleteTaskRow,
  invalidateCache,
  getCacheStats,
  ensureSheetHeaders,
};