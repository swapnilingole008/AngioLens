// AngioLens API Service
// Minimal connector between existing React frontend and Flask PostgreSQL backend

const API_BASE = 'http://127.0.0.1:5000/api';

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
    // If direct fails (e.g. proxy environment), retry relative /api
    if (API_BASE.startsWith('http')) {
      try {
        const fallbackRes = await fetch(`/api${endpoint}`, config);
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (!fallbackRes.ok) {
          throw new Error(fallbackData.message || `Request failed with status ${fallbackRes.status}`);
        }
        return fallbackData;
      } catch (fallbackErr) {
        throw new Error(err.message || 'Network error');
      }
    }
    throw err;
  }
}

export const api = {
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
  getUsers: () => request('/users'),

  getProfile: (userId) => {
    const query = userId ? `?id=${userId}` : '';
    return request(`/profile${query}`);
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
  verifyAnalysis: (analysisId, reviewData) => {
    const currentUser = api.getCurrentUser();
    const payload = {
      doctor_id: currentUser?.id,
      verified: true,
      comments: 'Physician verified',
      ...reviewData,
    };
    return request(`/analyses/${analysisId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // History
  getHistory: () => request('/history'),

  // Reports
  getReports: () => request('/reports'),

  getReport: (analysisId) => {
    if (analysisId) {
      return request(`/reports/${analysisId}`);
    }
    return request('/reports/latest');
  },

  // Notifications (Live Database-Backed)
  getNotifications: (userId) => {
    const user = api.getCurrentUser();
    const uid = userId || user?.id;
    const query = uid ? `?user_id=${uid}` : '';
    return request(`/notifications${query}`);
  },

  markNotificationRead: (notificationId) => {
    return request('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId }),
    }).catch(() => ({}));
  },

  markAllNotificationsRead: (userId) => {
    const user = api.getCurrentUser();
    const uid = userId || user?.id;
    return request('/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ user_id: uid }),
    }).catch(() => ({}));
  },

  initDb: () => request('/init-db'),

  // Doctor Application & Verification
  submitDoctorApplication: (formData) =>
    request('/doctor-applications', {
      method: 'POST',
      body: JSON.stringify(formData),
    }),

  // Admin Portal
  adminLogin: async (credentials) => {
    const res = await request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.admin) {
      api.setAdminUser(res.admin);
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
    } catch {}
  },

  getAdminApplications: (status) => {
    const query = status ? `?status=${status}` : '';
    return request(`/admin/applications${query}`);
  },

  approveApplication: (appId) =>
    request(`/admin/applications/${appId}/approve`, {
      method: 'POST',
    }),

  rejectApplication: (appId, reason) =>
    request(`/admin/applications/${appId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

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
    }
    return res;
  },
};

export default api;
