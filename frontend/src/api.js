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

  // Profile
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
  getReport: (analysisId) => {
    if (analysisId) {
      return request(`/reports/${analysisId}`);
    }
    return request('/reports/latest');
  },
};

export default api;
