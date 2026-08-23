/**
 * KisanSetu - REST API Client
 */

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `API error: ${response.statusText}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  register(formData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  },

  login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  },

  getProfile(farmerId) {
    return this.request(`/auth/profile/${farmerId}`);
  },

  updateProfile(farmerId, formData) {
    return this.request(`/auth/profile/${farmerId}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
  },

  adminLogin(email, password) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // Procurement Centers
  getCenters(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/centers${query ? '?' + query : ''}`);
  },

  getCenterById(id) {
    return this.request(`/centers/${id}`);
  },

  createCenter(centerData) {
    return this.request('/centers', {
      method: 'POST',
      body: JSON.stringify(centerData)
    });
  },

  updateCenter(id, centerData) {
    return this.request(`/centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(centerData)
    });
  },

  deleteCenter(id) {
    return this.request(`/centers/${id}`, {
      method: 'DELETE'
    });
  },

  // Procurement Schedules
  getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/schedules${query ? '?' + query : ''}`);
  },

  createSchedule(scheduleData) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    });
  },

  updateSchedule(id, scheduleData) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    });
  },

  deleteSchedule(id) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE'
    });
  },

  // Procurement Requests & Tokens
  getRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/requests${query ? '?' + query : ''}`);
  },

  getRequestByIdOrToken(idOrToken) {
    return this.request(`/requests/${encodeURIComponent(idOrToken)}`);
  },

  createRequest(requestData) {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  updateRequest(id, requestData) {
    return this.request(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  },

  deleteRequest(id) {
    return this.request(`/requests/${id}`, {
      method: 'DELETE'
    });
  },

  // Announcements
  getAnnouncements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/announcements${query ? '?' + query : ''}`);
  },

  createAnnouncement(data) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteAnnouncement(id) {
    return this.request(`/announcements/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Actions
  getAdminStats() {
    return this.request('/admin/stats');
  },

  advanceRequestStatus(requestId) {
    return this.request('/admin/advance-status', {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  },

  callNextToken(centerId) {
    return this.request('/admin/call-next', {
      method: 'POST',
      body: JSON.stringify({ center_id: centerId })
    });
  },

  resetDemoData() {
    return this.request('/admin/reset-demo-data', {
      method: 'POST'
    });
  }
};
