const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/api/auth/me'),

  getTrips: () => request('/api/trips'),
  getTrip: (id) => request(`/api/trips/${id}`),
  generateTrip: (payload) => request('/api/trips/generate', { method: 'POST', body: JSON.stringify(payload) }),
  updateTrip: (id, payload) => request(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTrip: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
  addActivity: (id, payload) => request(`/api/trips/${id}/activity`, { method: 'POST', body: JSON.stringify(payload) }),
  removeActivity: (id, payload) => request(`/api/trips/${id}/activity`, { method: 'DELETE', body: JSON.stringify(payload) }),
  regenerateDay: (id, payload) => request(`/api/trips/${id}/regenerate-day`, { method: 'POST', body: JSON.stringify(payload) })
};
