import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// 🔥 DEBUG: Log base URL once
console.log("🌐 API BASE URL:", process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mw_token');

  // 🔥 DEBUG: Log every request
  console.log("🚀 REQUEST:", {
    url: config.baseURL + config.url,
    method: config.method,
    params: config.params,
    data: config.data
  });

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // 🔥 DEBUG: Log every response
    console.log("📥 RESPONSE:", {
      url: res.config.url,
      data: res.data
    });
    return res;
  },
  (err) => {
    // 🔥 DEBUG: Log errors
    console.error("❌ API ERROR:", err?.response || err);

    if (err?.response?.status === 401) {
      localStorage.removeItem('mw_token');
      localStorage.removeItem('mw_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const tasksAPI = {
  getTasks: (search = '', department = '') =>
    api.get('/tasks', { params: { search, department } }),

  // 🔥 DEBUG VERSION (ADDED — DOES NOT REPLACE ORIGINAL)
  debugGetTasks: async (search = '', department = '') => {
    console.log("🧪 DEBUG getTasks CALLED");
    console.log("📤 Params:", { search, department });

    const res = await api.get('/tasks', { params: { search, department } });

    console.log("📥 RAW DATA:", res.data);

    // 🔥 Show structure clearly
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

export const misAPI = {
  getStats: () => api.get('/mis'),
  sync: (department) => api.post('/mis/sync', { department }),
};

export const adminAPI = {
  getDepartments: () => api.get('/admin/departments'),
  setupHeaders: (department) => api.post(`/admin/setup-headers/${department}`),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getStatus: () => api.get('/admin/status'),

  // 🔥 ADD THESE (DO NOT REMOVE ABOVE)

  getStats: () => api.get('/admin/stats'),
  getManagers: () => api.get('/admin/managers'),
  getEmployees: () => api.get('/admin/employees'),
  getPendingManagers: () => api.get('/admin/pending-managers'),
  approveManager: (id, approve, departments) =>
    api.put(`/admin/approve/${id}`, { approve, departments }),
};

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  signup: (data) => api.post('/auth/signup', data),
  getUsers: () => api.get('/auth/users'),
  getMe: () => api.get('/auth/me'),
};

export default api;