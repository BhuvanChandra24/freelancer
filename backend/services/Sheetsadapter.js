/**
 * Google Sheets Adapter (FINAL WORKING VERSION)
 */

const { google } = require('googleapis');
const NodeCache = require('node-cache');
const path = require('path');
const fs = require('fs');

const { DEPARTMENTS, colLetterToIndex, indexToColLetter } = require('../config/Sheetsmapping');

// ───────── CACHE ─────────
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || '300'),
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'),
});

let sheetsClient = null;

// ───────── AUTH (FINAL FIX) ─────────
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    let credentials;

    const filePath = path.join(__dirname, '../config/service-account.json');

    console.log("📁 Checking service account file...");
    console.log("📁 Path:", filePath);

    // ✅ PRIORITY 1 → FILE (BEST)
    if (fs.existsSync(filePath)) {
      console.log("✅ Using FILE-based credentials");
      credentials = require(filePath);
    }

    // ✅ PRIORITY 2 → ENV (FALLBACK)
    else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log("⚠️ Using ENV-based credentials");

      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }

    else {
      throw new Error("No credentials found (file + env both missing)");
    }

    // ✅ VALIDATION
    if (!credentials.private_key || !credentials.client_email) {
      throw new Error("Invalid credentials format");
    }

    // ✅ FIX PRIVATE KEY
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .trim();

    console.log("🔑 Service Account:", credentials.client_email);

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

    console.log("✅ Google Sheets connected");

    return sheetsClient;

  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    throw new Error("Failed to initialize Google Sheets client");
  }
}

// ───────── READ ─────────
async function readDepartmentTasks(department) {
  const deptConfig = DEPARTMENTS[department];
  if (!deptConfig) throw new Error(`Unknown department: ${department}`);

  const cacheKey = `tasks_${department}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: deptConfig.spreadsheetId,
    range: `'${deptConfig.tabs.tasks.sheetName}'!${deptConfig.tabs.tasks.range}`,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const dataRows = rows.slice(deptConfig.tabs.tasks.dataStartRow - 1);

  const columnKeys = Object.entries(deptConfig.columns).reduce((acc, [letter, def]) => {
    acc[colLetterToIndex(letter)] = def.key;
    return acc;
  }, {});

  const tasks = dataRows
    .filter(row => row && row.length && row[0])
    .map((row, i) => {
      const task = {
        _rowIndex: i + deptConfig.tabs.tasks.dataStartRow,
        _department: department,
      };

      Object.entries(columnKeys).forEach(([idx, key]) => {
        task[key] = row[idx] || '';
      });

      return task;
    });

  cache.set(cacheKey, tasks);
  return tasks;
}

// ───────── APPEND ─────────
async function appendTask(department, taskData) {
  const deptConfig = DEPARTMENTS[department];
  const sheets = await getSheetsClient();

  const totalCols = Object.keys(deptConfig.columns).length;
  const row = new Array(totalCols).fill('');

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    const idx = colLetterToIndex(letter);
    row[idx] = taskData[def.key] || '';
  });

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: deptConfig.spreadsheetId,
    range: `'${deptConfig.tabs.tasks.sheetName}'!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  cache.del(`tasks_${department}`);

  return {
    success: true,
    updatedRange: res.data.updates?.updatedRange,
  };
}

// ───────── UPDATE ─────────
async function updateTaskRow(department, rowIndex, updates) {
  const deptConfig = DEPARTMENTS[department];
  const sheets = await getSheetsClient();

  const data = [];

  Object.entries(deptConfig.columns).forEach(([letter, def]) => {
    if (updates.hasOwnProperty(def.key)) {
      data.push({
        range: `'${deptConfig.tabs.tasks.sheetName}'!${letter}${rowIndex}`,
        values: [[updates[def.key]]],
      });
    }
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: deptConfig.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  cache.del(`tasks_${department}`);
}

// ───────── DELETE ─────────
async function deleteTaskRow(department, rowIndex) {
  const deptConfig = DEPARTMENTS[department];
  const sheets = await getSheetsClient();

  const lastCol = indexToColLetter(Object.keys(deptConfig.columns).length - 1);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: deptConfig.spreadsheetId,
    range: `'${deptConfig.tabs.tasks.sheetName}'!A${rowIndex}:${lastCol}${rowIndex}`,
  });

  cache.del(`tasks_${department}`);
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