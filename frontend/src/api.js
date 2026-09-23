// AngioLens API Service
// Minimal connector between existing React frontend and Flask PostgreSQL backend

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // If relative fails, fallback to direct http://127.0.0.1:5000/api
    try {
      const fallbackUrl = `http://127.0.0.1:5000/api${endpoint}`;
      const fallbackRes = await fetch(fallbackUrl, config);
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      if (!fallbackRes.ok) {
        throw new Error(fallbackData.message || `Request failed with status ${fallbackRes.status}`);
      }
      return fallbackData;
    } catch (fallbackErr) {
      throw new Error(err.message || fallbackErr.message || 'Network error');
    }
  }
}

// In-Memory Client Cache Store for Instant Tab Prefetching & Fast Navigation
const cacheStore = {
  reports: null,
  history: null,
  users: null,
  adminApplications: {},
  notifications: null,
  profile: {},
};

export const api = {
  // Cache Management
  getCachedData: (key) => cacheStore[key],

  setCachedData: (key, data) => {
    cacheStore[key] = data;
  },

  invalidateCache: (keys) => {
    if (Array.isArray(keys)) {
      keys.forEach((k) => {
        if (k === 'adminApplications' || k === 'profile') {
          cacheStore[k] = {};
        } else {
          cacheStore[k] = null;
        }
      });
    } else if (typeof keys === 'string') {
      if (keys === 'adminApplications' || keys === 'profile') {
        cacheStore[keys] = {};
      } else {
        cacheStore[keys] = null;
      }
    } else {
      // Invalidate everything
      cacheStore.reports = null;
      cacheStore.history = null;
      cacheStore.users = null;
      cacheStore.adminApplications = {};
      cacheStore.notifications = null;
      cacheStore.profile = {};
    }
  },

  prefetch: async (keys = ['reports', 'history']) => {
    const promises = [];
    if (keys.includes('reports') && !cacheStore.reports) {
      promises.push(api.getReports(false).catch(() => {}));
    }
    if (keys.includes('history') && !cacheStore.history) {
      promises.push(api.getHistory(false).catch(() => {}));
    }
    await Promise.all(promises);
  },

  // Database Health Check
  dbTest: () => request('/db-test'),

  // Authentication
  signup: async (data) => {
    const res = await request('/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.user) {
      api.setCurrentUser(res.user);
      api.invalidateCache(['users', 'profile']);
    }
    return res;
  },

  login: async (data) => {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.user) {
      api.setCurrentUser(res.user);
      api.invalidateCache();
    }
    return res;
  },

  // Current User Session Management in localStorage
  getCurrentUser: () => {
    try {
      const saved = localStorage.getItem('angiolens_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser: (user) => {
    try {
      localStorage.setItem('angiolens_user', JSON.stringify(user));
    } catch {}
  },

  logout: () => {
    try {
      localStorage.removeItem('angiolens_user');
      localStorage.removeItem('angiolens_current_analysis_id');
      api.invalidateCache();
    } catch {}
  },

  // Active Analysis ID Tracker
  getCurrentAnalysisId: () => {
    try {
      return localStorage.getItem('angiolens_current_analysis_id');
    } catch {
      return null;
    }
  },

  setCurrentAnalysisId: (id) => {
    try {
      if (id) {
        localStorage.setItem('angiolens_current_analysis_id', id);
      } else {
        localStorage.removeItem('angiolens_current_analysis_id');
      }
    } catch {}
  },

  // Profile & Users
  getUsers: async (forceRefresh = false) => {
    if (!forceRefresh && cacheStore.users) {
      return cacheStore.users;
    }
    const data = await request('/users');
    cacheStore.users = data;
    return data;
  },

  getProfile: async (userId, forceRefresh = false) => {
    const key = userId || 'self';
    if (!forceRefresh && cacheStore.profile[key]) {
      return cacheStore.profile[key];
    }
    const query = userId ? `?id=${userId}` : '';
    const data = await request(`/profile${query}`);
    cacheStore.profile[key] = data;
    return data;
  },

  // Patients
  savePatient: (patientData) =>
    request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),

  // Analyses & AI Results
  createAnalysis: async (analysisData) => {
    const res = await request('/analyses', {
      method: 'POST',
      body: JSON.stringify(analysisData),
    });
    if (res.analysis_id) {
      api.setCurrentAnalysisId(res.analysis_id);
    }
    // Invalidate cached reports and history so latest appears immediately
    api.invalidateCache(['reports', 'history', 'notifications']);
    return res;
  },

  getAnalysis: (analysisId) => {
    if (analysisId) {
      return request(`/analyses/${analysisId}`);
    }
    return request('/analyses/latest');
  },

  getLatestAnalysis: () => request('/analyses/latest'),

  // Doctor Verification
  verifyAnalysis: async (analysisId, reviewData) => {
    const currentUser = api.getCurrentUser();
    const payload = {
      doctor_id: currentUser?.id,
      verified: true,
      comments: 'Physician verified',
      ...reviewData,
    };
    const res = await request(`/analyses/${analysisId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Invalidate cached reports and history on verification
    api.invalidateCache(['reports', 'history', 'notifications']);
    return res;
  },

  // History with In-Memory Caching
  getHistory: async (forceRefresh = false) => {
    if (!forceRefresh && cacheStore.history) {
      return cacheStore.history;
    }
    const data = await request('/history');
    cacheStore.history = data;
    return data;
  },

  // Reports with In-Memory Caching
  getReports: async (forceRefresh = false) => {
    if (!forceRefresh && cacheStore.reports) {
      return cacheStore.reports;
    }
    const data = await request('/reports');
    cacheStore.reports = data;
    return data;
  },

  getReport: (analysisId) => {
    if (analysisId) {
      return request(`/reports/${analysisId}`);
    }
    return request('/reports/latest');
  },

  // Notifications (Live Database-Backed)
  getNotifications: async (userId, forceRefresh = false) => {
    const user = api.getCurrentUser();
    const uid = userId || user?.id;
    if (!forceRefresh && cacheStore.notifications) {
      return cacheStore.notifications;
    }
    const query = uid ? `?user_id=${uid}` : '';
    const data = await request(`/notifications${query}`);
    cacheStore.notifications = data;
    return data;
  },

  markNotificationRead: (notificationId) => {
    api.invalidateCache(['notifications']);
    return request('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId }),
    }).catch(() => ({}));
  },

  markAllNotificationsRead: (userId) => {
    api.invalidateCache(['notifications']);
    const user = api.getCurrentUser();
    const uid = userId || user?.id;
    return request('/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ user_id: uid }),
    }).catch(() => ({}));
  },

  initDb: () => request('/init-db'),

  // Doctor Application & Verification
  submitDoctorApplication: async (formData) => {
    const res = await request('/doctor-applications', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    api.invalidateCache(['adminApplications']);
    return res;
  },

  // Admin Portal
  adminLogin: async (credentials) => {
    const res = await request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.admin) {
      api.setAdminUser(res.admin);
      api.invalidateCache(['adminApplications']);
    }
    return res;
  },

  getAdminUser: () => {
    try {
      const saved = localStorage.getItem('angiolens_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setAdminUser: (admin) => {
    try {
      localStorage.setItem('angiolens_admin_user', JSON.stringify(admin));
    } catch {}
  },

  adminLogout: () => {
    try {
      localStorage.removeItem('angiolens_admin_user');
      api.invalidateCache(['adminApplications']);
    } catch {}
  },

  getAdminApplications: async (status, forceRefresh = false) => {
    const cacheKey = status || 'all';
    if (!forceRefresh && cacheStore.adminApplications[cacheKey]) {
      return cacheStore.adminApplications[cacheKey];
    }
    const query = status ? `?status=${status}` : '';
    const data = await request(`/admin/applications${query}`);
    cacheStore.adminApplications[cacheKey] = data;
    return data;
  },

  approveApplication: async (appId) => {
    const res = await request(`/admin/applications/${appId}/approve`, {
      method: 'POST',
    });
    api.invalidateCache(['adminApplications', 'users', 'profile']);
    return res;
  },

  rejectApplication: async (appId, reason) => {
    const res = await request(`/admin/applications/${appId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    api.invalidateCache(['adminApplications']);
    return res;
  },

  // Password Management & OTP
  changePassword: (data) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Profile Update
  updateProfile: async (profileData) => {
    const res = await request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (res.user) {
      api.setCurrentUser(res.user);
      api.invalidateCache(['profile', 'users']);
    }
    return res;
  },
};

export default api;
