import axios from 'axios';

// ✅ FIX 1: FORCE CORRECT BASE URL (VERY IMPORTANT)
const BASE_URL =
  process.env.REACT_APP_API_URL?.trim() ||
  'https://freelancer-b8cs.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // keep simple
});

// 🔥 DEBUG: Show final base URL
console.log("🌐 API BASE URL:", BASE_URL);

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mw_token');

  // ✅ FIX 2: ENSURE BODY IS NOT LOST
  if (config.data && typeof config.data === 'object') {
    config.data = JSON.parse(JSON.stringify(config.data));
  }

  // 🔥 DEBUG: REQUEST
  console.log("🚀 REQUEST:", {
    url: config.baseURL + config.url,
    method: config.method,
    params: config.params,
    data: config.data
  });

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (res) => {
    console.log("📥 RESPONSE:", {
      url: res.config.url,
      data: res.data
    });
    return res;
  },
  (err) => {
    console.error("❌ API ERROR:", err?.response || err);

    if (err?.response?.status === 401) {
      localStorage.removeItem('mw_token');
      localStorage.removeItem('mw_user');
      window.location.href = '/';
    }

    return Promise.reject(err);
  }
);

// ================= TASKS API =================
export const tasksAPI = {
  getTasks: (search = '', department = '') =>
    api.get('/tasks', { params: { search, department } }),

  debugGetTasks: async (search = '', department = '') => {
    console.log("🧪 DEBUG getTasks CALLED");
    console.log("📤 Params:", { search, department });

    const res = await api.get('/tasks', { params: { search, department } });

    console.log("📥 RAW DATA:", res.data);

    if (Array.isArray(res.data)) {
      console.log("✅ Data is ARRAY with length:", res.data.length);
    } else {
      console.log("⚠️ Data is OBJECT. Keys:", Object.keys(res.data));
    }

    return res;
  },

  getTask: (department, rowIndex) =>
    api.get(`/tasks/${department}/${rowIndex}`),

  createTask: (data) => api.post('/tasks', data),

  updateTask: (department, rowIndex, data) =>
    api.put(`/tasks/${department}/${rowIndex}`, data),

  deleteTask: (department, rowIndex) =>
    api.delete(`/tasks/${department}/${rowIndex}`),

  getSchema: (department) =>
    api.get(`/tasks/schema/${department}`),
};

// ================= MIS API =================
export const misAPI = {
  getStats: () => api.get('/mis'),
  sync: (department) => api.post('/mis/sync', { department }),
};

// ================= ADMIN API =================
export const adminAPI = {
  getDepartments: () => api.get('/admin/departments'),
  setupHeaders: (department) => api.post(`/admin/setup-headers/${department}`),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getStatus: () => api.get('/admin/status'),

  getStats: () => api.get('/admin/stats'),
  getManagers: () => api.get('/admin/managers'),
  getEmployees: () => api.get('/admin/employees'),
  getPendingManagers: () => api.get('/admin/pending-managers'),
  approveManager: (id, approve, departments) =>
    api.put(`/admin/approve/${id}`, { approve, departments }),
};

// ================= AUTH API =================
export const authAPI = {
  login: (username, password) => {
    console.log("🔐 AUTH LOGIN CALL:", { username });
    return api.post('/auth/login', { username, password });
  },

  signup: (data) => {
    console.log("📝 AUTH SIGNUP CALL:", data);
    return api.post('/auth/signup', data);
  },

  getUsers: () => api.get('/auth/users'),
  getMe: () => api.get('/auth/me'),
};

export default api;