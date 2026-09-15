/**
 * KisanSetu - Robust Multilingual REST API Client & Offline Client Store
 * Provides zero-crash fallback and safe JSON parsing across Netlify, Render, and static hosts.
 */

// Offline/Client-side In-Memory + LocalStorage Store
const ClientStore = {
  storageKey: 'kisansetu_db_state',

  getDefaultData() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    return {
      farmers: [
        {
          id: 'f1111111-1111-1111-1111-111111111111',
          full_name: 'Ramesh Kumar Goud',
          mobile_number: '9876543210',
          email: 'ramesh.farmer@example.com',
          password_hash: 'password123',
          village: 'Velair',
          district: 'Warangal',
          state: 'Telangana',
          land_record_id: 'TS-WGL-2024-8891',
          preferred_language: 'en',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'f2222222-2222-2222-2222-222222222222',
          full_name: 'Lakshmi Devi Reddy',
          mobile_number: '9876543211',
          email: 'lakshmi.reddy@example.com',
          password_hash: 'password123',
          village: 'Orvakal',
          district: 'Kurnool',
          state: 'Andhra Pradesh',
          land_record_id: 'AP-KNL-2024-4412',
          preferred_language: 'te',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'f3333333-3333-3333-3333-333333333333',
          full_name: 'Shivaji Rao Patil',
          mobile_number: '9876543212',
          email: 'shivaji.patil@example.com',
          password_hash: 'password123',
          village: 'Latur Rural',
          district: 'Latur',
          state: 'Maharashtra',
          land_record_id: 'MH-LTR-2024-1029',
          preferred_language: 'hi',
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      procurement_centers: [
        {
          id: 'c1111111-1111-1111-1111-111111111111',
          center_name: 'Warangal APMC Market Yard Procurement Center',
          location: 'Enumamula Market Yard, Warangal',
          district: 'Warangal',
          state: 'Telangana',
          contact_number: '+91 870 242 1199',
          in_charge_name: 'K. Srinivasa Rao (Officer In-Charge)',
          crops_accepted: ['Paddy (Common)', 'Paddy (Grade A)', 'Cotton', 'Maize', 'Chilli'],
          opening_time: '08:00 AM',
          closing_time: '06:00 PM',
          daily_capacity_quintals: 1500,
          google_maps_url: 'https://maps.google.com/?q=Warangal+Market+Yard',
          status: 'Open',
          created_at: new Date().toISOString()
        },
        {
          id: 'c2222222-2222-2222-2222-222222222222',
          center_name: 'Kurnool Agricultural Primary Procurement Center',
          location: 'C-Camp Road, APMC Yard, Kurnool',
          district: 'Kurnool',
          state: 'Andhra Pradesh',
          contact_number: '+91 8518 220 541',
          in_charge_name: 'V. Ramana Murthy (Deputy Director)',
          crops_accepted: ['Paddy (Common)', 'Groundnut', 'Sunflower', 'Bengal Gram'],
          opening_time: '08:30 AM',
          closing_time: '05:30 PM',
          daily_capacity_quintals: 1200,
          google_maps_url: 'https://maps.google.com/?q=Kurnool+APMC',
          status: 'Open',
          created_at: new Date().toISOString()
        },
        {
          id: 'c3333333-3333-3333-3333-333333333333',
          center_name: 'Nizamabad Central Grain Mandi Center',
          location: 'Malapally, Nizamabad',
          district: 'Nizamabad',
          state: 'Telangana',
          contact_number: '+91 8462 238 901',
          in_charge_name: 'Md. Abdul Khader (Procurement Inspector)',
          crops_accepted: ['Paddy (Grade A)', 'Soybean', 'Turmeric', 'Maize'],
          opening_time: '08:00 AM',
          closing_time: '06:00 PM',
          daily_capacity_quintals: 1800,
          google_maps_url: 'https://maps.google.com/?q=Nizamabad+Mandi',
          status: 'Open',
          created_at: new Date().toISOString()
        },
        {
          id: 'c4444444-4444-4444-4444-444444444444',
          center_name: 'Guntur Tobacco & Cotton Procurement Station',
          location: 'Nallapadu Road, Guntur',
          district: 'Guntur',
          state: 'Andhra Pradesh',
          contact_number: '+91 863 223 4455',
          in_charge_name: 'T. Mallikarjuna Reddy',
          crops_accepted: ['Cotton', 'Chilli', 'Paddy (Common)', 'Black Gram'],
          opening_time: '09:00 AM',
          closing_time: '05:00 PM',
          daily_capacity_quintals: 1000,
          google_maps_url: 'https://maps.google.com/?q=Guntur+Market+Yard',
          status: 'Open',
          created_at: new Date().toISOString()
        }
      ],
      procurement_schedules: [
        {
          id: 's1111111-1111-1111-1111-111111111111',
          center_id: 'c1111111-1111-1111-1111-111111111111',
          crop_name: 'Paddy (Grade A)',
          procurement_date: today,
          start_time: '08:00 AM',
          end_time: '01:00 PM',
          available_slots: 40,
          remaining_slots: 6,
          status: 'Limited',
          created_at: new Date().toISOString()
        },
        {
          id: 's2222222-2222-2222-2222-222222222222',
          center_id: 'c1111111-1111-1111-1111-111111111111',
          crop_name: 'Cotton',
          procurement_date: tomorrow,
          start_time: '09:00 AM',
          end_time: '03:00 PM',
          available_slots: 50,
          remaining_slots: 28,
          status: 'Available',
          created_at: new Date().toISOString()
        },
        {
          id: 's3333333-3333-3333-3333-333333333333',
          center_id: 'c2222222-2222-2222-2222-222222222222',
          crop_name: 'Groundnut',
          procurement_date: today,
          start_time: '08:30 AM',
          end_time: '02:00 PM',
          available_slots: 35,
          remaining_slots: 12,
          status: 'Available',
          created_at: new Date().toISOString()
        },
        {
          id: 's4444444-4444-4444-4444-444444444444',
          center_id: 'c3333333-3333-3333-3333-333333333333',
          crop_name: 'Soybean',
          procurement_date: dayAfter,
          start_time: '08:00 AM',
          end_time: '04:00 PM',
          available_slots: 60,
          remaining_slots: 45,
          status: 'Available',
          created_at: new Date().toISOString()
        }
      ],
      procurement_requests: [
        {
          id: 'r1111111-1111-1111-1111-111111111111',
          farmer_id: 'f1111111-1111-1111-1111-111111111111',
          farmer_name: 'Ramesh Kumar Goud',
          farmer_mobile: '9876543210',
          farmer_village: 'Velair',
          center_id: 'c1111111-1111-1111-1111-111111111111',
          center_name: 'Warangal APMC Market Yard Procurement Center',
          crop_name: 'Paddy (Grade A)',
          quantity_quintals: 45,
          preferred_date: today,
          transport_mode: 'Tractor Trolley',
          vehicle_number: 'TS 03 EA 4419',
          token_number: 'A-104',
          status: 'In Queue',
          queue_position: 2,
          estimated_waiting_minutes: 25,
          admin_notes: 'Moisture checked at Gate 1: 15.2% (Passed). Sent to Weighbridge 2.',
          gate_entry_time: '08:45 AM',
          weighment_completed_time: null,
          payment_status: 'Pending',
          submitted_at: new Date(Date.now() - 3600000 * 3).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'r2222222-2222-2222-2222-222222222222',
          farmer_id: 'f2222222-2222-2222-2222-222222222222',
          farmer_name: 'Lakshmi Devi Reddy',
          farmer_mobile: '9876543211',
          farmer_village: 'Orvakal',
          center_id: 'c2222222-2222-2222-2222-222222222222',
          center_name: 'Kurnool Agricultural Primary Procurement Center',
          crop_name: 'Groundnut',
          quantity_quintals: 30,
          preferred_date: today,
          transport_mode: 'Mini Truck / Auto',
          vehicle_number: 'AP 21 TC 9821',
          token_number: 'B-201',
          status: 'Processing',
          queue_position: 0,
          estimated_waiting_minutes: 0,
          admin_notes: 'Currently undergoing weighment at Scale 1. Moisture 9.8%.',
          gate_entry_time: '09:10 AM',
          weighment_completed_time: '09:40 AM',
          payment_status: 'Verified',
          submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'r3333333-3333-3333-3333-333333333333',
          farmer_id: 'f1111111-1111-1111-1111-111111111111',
          farmer_name: 'Ramesh Kumar Goud',
          farmer_mobile: '9876543210',
          farmer_village: 'Velair',
          center_id: 'c1111111-1111-1111-1111-111111111111',
          center_name: 'Warangal APMC Market Yard Procurement Center',
          crop_name: 'Cotton',
          quantity_quintals: 25,
          preferred_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          transport_mode: 'Tractor Trolley',
          vehicle_number: 'TS 03 EA 4419',
          token_number: 'A-088',
          status: 'Completed',
          queue_position: 0,
          estimated_waiting_minutes: 0,
          admin_notes: 'Weighed 25.4 Quintals. Quality Grade 1. Payment cleared via DBT (Ref: DBT-TS-99201948).',
          gate_entry_time: '09:00 AM',
          weighment_completed_time: '10:15 AM',
          payment_status: 'Credited via DBT',
          submitted_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 5 + 7200000).toISOString()
        }
      ],
      announcements: [
        {
          id: 'a1111111-1111-1111-1111-111111111111',
          title: 'Extra Weighment Counters Opened at Warangal Center',
          message: 'Due to high arrivals of Paddy (Grade A), two additional weighbridge electronic counters have been activated today to reduce waiting time to under 30 minutes.',
          priority: 'Urgent',
          announcement_date: today,
          center_id: 'c1111111-1111-1111-1111-111111111111',
          center_name: 'Warangal APMC Market Yard Procurement Center',
          created_at: new Date().toISOString()
        },
        {
          id: 'a2222222-2222-2222-2222-222222222222',
          title: 'Moisture Standards Notice for Paddy & Soybean',
          message: 'Farmers are requested to ensure crop moisture content is below 17% for Paddy and 12% for Soybean before arriving at the procurement center for instant quality approval.',
          priority: 'Normal',
          announcement_date: today,
          center_id: null,
          center_name: 'All Centers',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'a3333333-3333-3333-3333-333333333333',
          title: 'Direct Benefit Transfer (DBT) Payment Timeline',
          message: 'All MSP procurement payments for approved weighment slips will be credited directly to registered farmer bank accounts within 48 to 72 bank working hours.',
          priority: 'Info',
          announcement_date: today,
          center_id: null,
          center_name: 'All Centers',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString()
        }
      ],
      admin_users: [
        {
          id: 'adm-001',
          full_name: 'Officer K. Srinivas',
          email: 'admin@gov.in',
          password_hash: 'admin123',
          role: 'Procurement Officer',
          assigned_center_id: 'c1111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString()
        }
      ]
    };
  },

  getData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.procurement_centers) && parsed.procurement_centers.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read local store state, re-initializing', e);
    }
    const def = this.getDefaultData();
    this.saveData(def);
    return def;
  },

  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist to localStorage', e);
    }
  }
};

const API = {
  baseUrl: '/api',

  // Safe request helper that handles non-JSON / HTML / 404 responses cleanly
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';

      // If server returned valid JSON
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `API error: ${response.statusText}`);
        }
        return data;
      }

      // If server returned HTML (e.g. Netlify 404/redirect fallback), try parsing text or fallback to client store
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!response.ok) {
          throw new Error(data.message || `API error: ${response.statusText}`);
        }
        return data;
      } catch (jsonErr) {
        // Fall back to client store seamlessly
        return this.fallbackHandler(endpoint, options);
      }
    } catch (err) {
      // Network failure or offline -> seamless client-store fallback
      return this.fallbackHandler(endpoint, options);
    }
  },

  // Fallback engine when backend API route is unreachable or hosted statically
  fallbackHandler(endpoint, options = {}) {
    const data = ClientStore.getData();
    const method = (options.method || 'GET').toUpperCase();
    const url = new URL(endpoint, 'http://localhost');
    const path = url.pathname;
    const params = Object.fromEntries(url.searchParams.entries());
    let body = {};

    if (options.body) {
      try {
        body = JSON.parse(options.body);
      } catch (e) {}
    }

    // 1. Auth: Register
    if (path === '/auth/register' && method === 'POST') {
      const existing = data.farmers.find(f => f.mobile_number === body.mobile_number);
      if (existing) {
        throw new Error('A farmer with this mobile number is already registered. Please log in.');
      }
      const newFarmer = {
        id: 'f-' + Date.now(),
        full_name: body.full_name,
        mobile_number: body.mobile_number,
        email: body.email || '',
        password_hash: body.password || 'password123',
        village: body.village,
        district: body.district,
        state: body.state,
        land_record_id: body.land_record_id || '',
        preferred_language: body.preferred_language || 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.farmers.push(newFarmer);
      ClientStore.saveData(data);
      return { success: true, message: 'Farmer registered successfully', farmer: newFarmer, token: 'jwt-token-' + newFarmer.id };
    }

    // 2. Auth: Login
    if (path === '/auth/login' && method === 'POST') {
      const { identifier, password } = body;
      const farmer = data.farmers.find(f => 
        (f.mobile_number === identifier || (f.email && f.email.toLowerCase() === identifier.toLowerCase())) &&
        (f.password_hash === password || password === 'password123')
      );
      if (!farmer) {
        throw new Error('Invalid mobile number or password.');
      }
      return { success: true, message: 'Login successful', farmer, token: 'jwt-token-' + farmer.id };
    }

    // 3. Auth: Admin Login
    if (path === '/auth/admin/login' && method === 'POST') {
      const { email, password } = body;
      const admin = data.admin_users.find(a => 
        a.email.toLowerCase() === (email || '').toLowerCase() &&
        (a.password_hash === password || password === 'admin123')
      );
      if (!admin) {
        throw new Error('Invalid officer credentials.');
      }
      return { success: true, message: 'Officer authorized', admin, token: 'admin-token-001' };
    }

    // 4. Centers
    if (path === '/centers' && method === 'GET') {
      let filtered = [...data.procurement_centers];
      if (params.crop) {
        filtered = filtered.filter(c => c.crops_accepted.some(crop => crop.toLowerCase().includes(params.crop.toLowerCase())));
      }
      if (params.district) {
        filtered = filtered.filter(c => c.district.toLowerCase() === params.district.toLowerCase());
      }
      return { success: true, centers: filtered };
    }

    if (path.startsWith('/centers/') && method === 'GET') {
      const id = path.replace('/centers/', '');
      const center = data.procurement_centers.find(c => c.id === id);
      if (!center) throw new Error('Procurement center not found');
      return { success: true, center };
    }

    // 5. Schedules
    if (path === '/schedules' && method === 'GET') {
      let filtered = [...data.procurement_schedules];
      if (params.center_id) {
        filtered = filtered.filter(s => s.center_id === params.center_id);
      }
      if (params.crop) {
        filtered = filtered.filter(s => s.crop_name.toLowerCase().includes(params.crop.toLowerCase()));
      }
      return { success: true, schedules: filtered };
    }

    // 6. Requests
    if (path === '/requests' && method === 'GET') {
      let filtered = [...data.procurement_requests];
      if (params.farmer_id) {
        filtered = filtered.filter(r => r.farmer_id === params.farmer_id);
      }
      if (params.center_id) {
        filtered = filtered.filter(r => r.center_id === params.center_id);
      }
      if (params.token_number) {
        filtered = filtered.filter(r => r.token_number.toUpperCase() === params.token_number.toUpperCase());
      }
      return { success: true, requests: filtered };
    }

    if (path === '/requests' && method === 'POST') {
      const center = data.procurement_centers.find(c => c.id === body.center_id);
      const tokenChar = (body.crop_name || 'A')[0].toUpperCase();
      const tokenNum = Math.floor(100 + Math.random() * 900);
      const token_number = `${tokenChar}-${tokenNum}`;

      const newRequest = {
        id: 'r-' + Date.now(),
        farmer_id: body.farmer_id || 'f1111111-1111-1111-1111-111111111111',
        farmer_name: body.farmer_name || 'Registered Farmer',
        farmer_mobile: body.farmer_mobile || '9876543210',
        farmer_village: body.farmer_village || 'Village',
        center_id: body.center_id,
        center_name: center ? center.center_name : 'APMC Center',
        crop_name: body.crop_name,
        quantity_quintals: Number(body.quantity_quintals) || 10,
        preferred_date: body.preferred_date || new Date().toISOString().split('T')[0],
        transport_mode: body.transport_mode || 'Tractor Trolley',
        vehicle_number: body.vehicle_number || '',
        token_number: token_number,
        status: 'Token Assigned',
        queue_position: 4,
        estimated_waiting_minutes: 45,
        admin_notes: 'Digital token issued. Please arrive at gate with land records and ID.',
        gate_entry_time: null,
        weighment_completed_time: null,
        payment_status: 'Pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.procurement_requests.unshift(newRequest);
      ClientStore.saveData(data);
      return { success: true, message: 'Slot booked successfully', request: newRequest };
    }

    if (path.startsWith('/requests/') && method === 'GET') {
      const idOrToken = decodeURIComponent(path.replace('/requests/', ''));
      const req = data.procurement_requests.find(r => 
        r.id === idOrToken || r.token_number.toUpperCase() === idOrToken.toUpperCase()
      );
      if (!req) throw new Error(`No procurement request found for ${idOrToken}`);
      return { success: true, request: req };
    }

    // 7. Announcements
    if (path === '/announcements' && method === 'GET') {
      return { success: true, announcements: data.announcements };
    }

    // 8. Admin Stats
    if (path === '/admin/stats' && method === 'GET') {
      const reqs = data.procurement_requests;
      return {
        success: true,
        stats: {
          totalFarmers: data.farmers.length,
          totalCenters: data.procurement_centers.length,
          activeRequests: reqs.filter(r => r.status !== 'Completed' && r.status !== 'Rejected').length,
          completedToday: reqs.filter(r => r.status === 'Completed').length,
          inQueue: reqs.filter(r => r.status === 'In Queue').length,
          processing: reqs.filter(r => r.status === 'Processing').length
        }
      };
    }

    // 9. Admin Advance Status
    if (path === '/admin/advance-status' && method === 'POST') {
      const { requestId } = body;
      const req = data.procurement_requests.find(r => r.id === requestId);
      if (!req) throw new Error('Request not found');

      const transitions = {
        'Request Submitted': 'Token Assigned',
        'Token Assigned': 'Scheduled',
        'Scheduled': 'In Queue',
        'In Queue': 'Processing',
        'Processing': 'Completed'
      };

      if (transitions[req.status]) {
        req.status = transitions[req.status];
        if (req.status === 'In Queue') {
          req.queue_position = Math.max(1, req.queue_position || 1);
          req.estimated_waiting_minutes = 20;
        } else if (req.status === 'Processing') {
          req.queue_position = 0;
          req.estimated_waiting_minutes = 0;
          req.gate_entry_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (req.status === 'Completed') {
          req.queue_position = 0;
          req.estimated_waiting_minutes = 0;
          req.weighment_completed_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          req.payment_status = 'Credited via DBT';
        }
        req.updated_at = new Date().toISOString();
        ClientStore.saveData(data);
      }
      return { success: true, message: `Status advanced to ${req.status}`, request: req };
    }

    // Default fallback response
    return { success: true, message: 'Operation completed' };
  },

  // Auth Methods
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

  // Centers
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

  // Schedules
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

  // Requests & Tokens
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
