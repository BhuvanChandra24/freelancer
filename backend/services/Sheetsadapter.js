/**
 * Google Sheets Adapter
 * ============================================================
 * FIXED VERSION (NO JWT ERROR)
 * Uses FILE-BASED service account authentication
 * ============================================================
 */

const { google } = require('googleapis');
const NodeCache = require('node-cache');
const path = require('path');

const { DEPARTMENTS, colLetterToIndex, indexToColLetter } = require('../config/Sheetsmapping');

// ───────── CACHE ─────────
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || '300'),
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'),
});


// ───────── GOOGLE CLIENT ─────────
let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    // ✅ FIX: USE FILE INSTEAD OF ENV
    const credentials = require(path.join(__dirname, '../config/service-account.json'));

    if (!credentials.private_key || !credentials.client_email) {
      throw new Error('❌ Invalid service account file');
    }

    // ✅ FIX NEWLINE ISSUE
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .trim();

    console.log("🔑 Using Service Account:", credentials.client_email);

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheetsClient = google.sheets({
      version: 'v4',
      auth,
    });

    console.log('✅ Google Sheets client initialized');

    return sheetsClient;

  } catch (error) {
    console.error('❌ Google Sheets init error:', error.message);
    throw new Error('Failed to initialize Google Sheets client');
  }
}


// ───────── READ ─────────
async function readDepartmentTasks(department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error(`No spreadsheet ID configured for department: ${department}`);
  }

  const tab = deptConfig.tabs.tasks;
  const cacheKey = `tasks_${department}`;

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

    const dataRows = rows.slice(tab.dataStartRow - 1);

    const columnKeys = Object.entries(deptConfig.columns).reduce((acc, [letter, def]) => {
      acc[colLetterToIndex(letter)] = def.key;
      return acc;
    }, {});

    const tasks = dataRows
      .filter(row => row && row.length > 0 && row[0])
      .map((row, rowIndex) => {
        const task = {
          _rowIndex: rowIndex + tab.dataStartRow,
          _department: department,
        };

        Object.entries(columnKeys).forEach(([idx, key]) => {
          task[key] = row[parseInt(idx)] || '';
        });

        return task;
      });

    cache.set(cacheKey, tasks);
    return tasks;

  } catch (err) {
    console.error(`❌ Error reading ${department} sheet:`, err.message);
    throw new Error(`Failed to read ${department} data: ${err.message}`);
  }
}


// ───────── APPEND ─────────
async function appendTask(department, taskData) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  const totalCols = Object.keys(deptConfig.columns).length;
  const row = new Array(totalCols).fill('');

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    const idx = colLetterToIndex(letter);
    row[idx] = taskData[def.key] !== undefined ? String(taskData[def.key]) : '';
  });

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tab.sheetName}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    cache.del(`tasks_${department}`);

    return {
      success: true,
      updatedRange: response.data.updates?.updatedRange,
    };

  } catch (err) {
    console.error(`❌ Append error:`, err.message);
    throw new Error(`Failed to write task: ${err.message}`);
  }
}


// ───────── UPDATE ─────────
async function updateTaskRow(department, rowIndex, updatedFields) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  const data = [];

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    if (updatedFields.hasOwnProperty(def.key)) {
      data.push({
        range: `'${tab.sheetName}'!${letter}${rowIndex}`,
        values: [[String(updatedFields[def.key])]],
      });
    }
  });

  if (data.length === 0) return { success: true };

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });

    cache.del(`tasks_${department}`);
    return { success: true };

  } catch (err) {
    throw new Error(`Failed to update: ${err.message}`);
  }
}


// ───────── DELETE ─────────
async function deleteTaskRow(department, rowIndex) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const spreadsheetId = deptConfig.spreadsheetId;
  const tab = deptConfig.tabs.tasks;
  const sheets = await getSheetsClient();

  const lastCol = indexToColLetter(Object.keys(deptConfig.columns).length - 1);

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${tab.sheetName}'!A${rowIndex}:${lastCol}${rowIndex}`,
    });

    cache.del(`tasks_${department}`);
    return { success: true };

  } catch (err) {
    throw new Error(`Delete failed: ${err.message}`);
  }
}


// ───────── READ ALL ─────────
async function readAllDepartmentTasks(departments = Object.keys(DEPARTMENTS)) {
  const results = await Promise.allSettled(
    departments.map(async (dept) => {
      const tasks = await readDepartmentTasks(dept);
      return tasks.map(t => ({ ...t, _department: dept }));
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}


// ───────── EXPORT ─────────
module.exports = {
  readDepartmentTasks,
  readAllDepartmentTasks,
  appendTask,
  updateTaskRow,
  deleteTaskRow,
};