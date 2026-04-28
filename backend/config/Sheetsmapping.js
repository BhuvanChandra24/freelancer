/**
 * SHEETS MAPPING CONFIGURATION
 * ============================================================
 * This is the central config file that maps every department
 * to its Google Spreadsheet, tabs, ranges, and field definitions.
 *
 * To add/remove columns: only edit this file — no backend routes change.
 *
 * Field visibility and editability are controlled here per role.
 * ============================================================
 */

const DEPARTMENTS = {

  CRM: {
    label: 'CRM',
    color: '#3B82F6',
    icon: 'users',
    spreadsheetId: process.env.SHEET_CRM_ID,
    tabs: {
      tasks: {
        sheetName: process.env.CRM_SHEET_NAME || 'CRM',
        headerRow: 1,
        dataStartRow: 2,
        range: 'A1:P',
      },
    },
    // Column letter → field key mapping (matches your actual sheet columns)
    columns: {
      A: { key: 'id', label: 'Task ID', type: 'text', required: true, visibleTo: ['manager', 'admin'], editableBy: [] },
      B: { key: 'title', label: 'Task Title', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      C: { key: 'description', label: 'Description', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      D: { key: 'assignedTo', label: 'Assigned To', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      E: { key: 'assignedEmail', label: 'Assigned Email', type: 'email', required: false, visibleTo: ['manager', 'admin'], editableBy: ['manager', 'admin'] },
      F: { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      G: { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      H: { key: 'deadline', label: 'Deadline', type: 'date', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      I: { key: 'createdAt', label: 'Created At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      J: { key: 'createdBy', label: 'Created By', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      K: { key: 'customerName', label: 'Customer Name', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      L: { key: 'contactNumber', label: 'Contact Number', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      M: { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['Website', 'Referral', 'Cold Call', 'Exhibition', 'Other'], required: false, visibleTo: ['manager', 'admin'], editableBy: ['manager', 'admin'] },
      N: { key: 'followUpDate', label: 'Follow Up Date', type: 'date', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      O: { key: 'notes', label: 'Notes', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      P: { key: 'completedAt', label: 'Completed At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
    },
  },

  Production: {
    label: 'Production',
    color: '#10B981',
    icon: 'factory',
    spreadsheetId: process.env.SHEET_PRODUCTION_ID,
    tabs: {
      tasks: {
        sheetName: process.env.PRODUCTION_SHEET_NAME || 'Production',
        headerRow: 1,
        dataStartRow: 2,
        range: 'A1:Q',
      },
    },
    columns: {
      A: { key: 'id', label: 'Task ID', type: 'text', required: true, visibleTo: ['manager', 'admin'], editableBy: [] },
      B: { key: 'title', label: 'Task Title', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      C: { key: 'description', label: 'Description', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      D: { key: 'assignedTo', label: 'Assigned To', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      E: { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      F: { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      G: { key: 'deadline', label: 'Deadline', type: 'date', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      H: { key: 'createdAt', label: 'Created At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      I: { key: 'createdBy', label: 'Created By', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      J: { key: 'workOrderNumber', label: 'Work Order #', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      K: { key: 'productName', label: 'Product Name', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      L: { key: 'quantity', label: 'Quantity', type: 'number', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      M: { key: 'unit', label: 'Unit', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      N: { key: 'machineId', label: 'Machine ID', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      O: { key: 'qualityCheck', label: 'Quality Check', type: 'select', options: ['Pending', 'Pass', 'Fail', 'Rework'], required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      P: { key: 'notes', label: 'Notes', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      Q: { key: 'completedAt', label: 'Completed At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
    },
  },

  Store: {
    label: 'Store',
    color: '#F59E0B',
    icon: 'package',
    spreadsheetId: process.env.SHEET_STORE_ID,
    tabs: {
      tasks: {
         sheetName: process.env.STORE_SHEET_NAME || 'Store',
        headerRow: 1,
        dataStartRow: 2,
        range: 'A1:N',
      },
    },
    columns: {
      A: { key: 'id', label: 'Task ID', type: 'text', required: true, visibleTo: ['manager', 'admin'], editableBy: [] },
      B: { key: 'title', label: 'Task Title', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      C: { key: 'description', label: 'Description', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      D: { key: 'assignedTo', label: 'Assigned To', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      E: { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      F: { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      G: { key: 'deadline', label: 'Deadline', type: 'date', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      H: { key: 'createdAt', label: 'Created At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      I: { key: 'createdBy', label: 'Created By', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      J: { key: 'itemCode', label: 'Item Code', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      K: { key: 'itemName', label: 'Item Name', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      L: { key: 'quantity', label: 'Quantity', type: 'number', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      M: { key: 'location', label: 'Storage Location', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      N: { key: 'notes', label: 'Notes', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
    },
  },

  Commercial: {
    label: 'Commercial',
    color: '#8B5CF6',
    icon: 'briefcase',
    spreadsheetId: process.env.SHEET_COMMERCIAL_ID,
    tabs: {
      tasks: {
        sheetName: process.env.COMMERCIAL_SHEET_NAME || 'Commercial',
        headerRow: 1,
        dataStartRow: 2,
        range: 'A1:P',
      },
    },
    columns: {
      A: { key: 'id', label: 'Task ID', type: 'text', required: true, visibleTo: ['manager', 'admin'], editableBy: [] },
      B: { key: 'title', label: 'Task Title', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      C: { key: 'description', label: 'Description', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      D: { key: 'assignedTo', label: 'Assigned To', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      E: { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      F: { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      G: { key: 'deadline', label: 'Deadline', type: 'date', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      H: { key: 'createdAt', label: 'Created At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      I: { key: 'createdBy', label: 'Created By', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      J: { key: 'vendorName', label: 'Vendor / Client', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      K: { key: 'poNumber', label: 'PO Number', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      L: { key: 'amount', label: 'Amount (₹)', type: 'number', required: false, visibleTo: ['manager', 'admin'], editableBy: ['manager', 'admin'] },
      M: { key: 'paymentStatus', label: 'Payment Status', type: 'select', options: ['Pending', 'Partial', 'Paid', 'Overdue'], required: false, visibleTo: ['manager', 'admin'], editableBy: ['manager', 'admin'] },
      N: { key: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: ['manager', 'admin'] },
      O: { key: 'notes', label: 'Notes', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      P: { key: 'completedAt', label: 'Completed At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
    },
  },

  AfterSales: {
    label: 'After Sales',
    color: '#EF4444',
    icon: 'tool',
    spreadsheetId: process.env.SHEET_AFTERSALES_ID,
    tabs: {
      tasks: {
        sheetName: process.env.AFTERSALES_SHEET_NAME || 'AfterSales',
        headerRow: 1,
        dataStartRow: 2,
        range: 'A1:Q',
      },
    },
    columns: {
      A: { key: 'id', label: 'Task ID', type: 'text', required: true, visibleTo: ['manager', 'admin'], editableBy: [] },
      B: { key: 'title', label: 'Task Title', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin', 'user'], editableBy: ['manager', 'admin'] },
      C: { key: 'description', label: 'Description', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      D: { key: 'assignedTo', label: 'Assigned To', type: 'text', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      E: { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'On Hold'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      F: { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      G: { key: 'deadline', label: 'Deadline', type: 'date', required: true, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'admin'] },
      H: { key: 'createdAt', label: 'Created At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      I: { key: 'createdBy', label: 'Created By', type: 'text', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
      J: { key: 'customerName', label: 'Customer Name', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      K: { key: 'contactNumber', label: 'Contact Number', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      L: { key: 'productModel', label: 'Product/Model', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      M: { key: 'issueType', label: 'Issue Type', type: 'select', options: ['Repair', 'Replacement', 'Warranty', 'Calibration', 'Installation', 'Other'], required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      N: { key: 'serialNumber', label: 'Serial Number', type: 'text', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      O: { key: 'technicianNote', label: 'Technician Notes', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      P: { key: 'resolutionNote', label: 'Resolution', type: 'textarea', required: false, visibleTo: ['manager', 'employee', 'admin'], editableBy: ['manager', 'employee', 'admin'] },
      Q: { key: 'completedAt', label: 'Completed At', type: 'date', required: false, visibleTo: ['manager', 'admin'], editableBy: [] },
    },
  },
};

// Helper: get visible columns for a given role in a department
function getVisibleColumns(department, role) {
  const dept = DEPARTMENTS[department];
  if (!dept) return {};
  const cols = {};
  for (const [col, def] of Object.entries(dept.columns)) {
    if (def.visibleTo.includes(role)) {
      cols[col] = def;
    }
  }
  return cols;
}

// Helper: get editable columns for a given role in a department
function getEditableColumns(department, role) {
  const dept = DEPARTMENTS[department];
  if (!dept) return [];
  return Object.entries(dept.columns)
    .filter(([, def]) => def.editableBy.includes(role))
    .map(([col, def]) => def.key);
}

// Helper: column letter to index (A=0, B=1, ...)
function colLetterToIndex(letter) {
  return letter.charCodeAt(0) - 65;
}

// Helper: index to column letter
function indexToColLetter(index) {
  return String.fromCharCode(65 + index);
}

module.exports = {
  DEPARTMENTS,
  getVisibleColumns,
  getEditableColumns,
  colLetterToIndex,
  indexToColLetter,
};