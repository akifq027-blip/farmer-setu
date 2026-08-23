/**
 * KisanSetu - Admin Management Panel Controller
 */

let currentAdminTab = 'requests';
let adminRequests = [];
let adminSchedules = [];
let adminCenters = [];
let adminAnnouncements = [];

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAdminAuth();
  if (!admin) return;

  document.getElementById('admin-officer-name').textContent = admin.full_name;
  document.getElementById('admin-officer-role').textContent = admin.role;

  await loadAdminStats();
  await loadAdminRequests();
  await loadAdminSchedules();
  await loadAdminCenters();
  await loadAdminAnnouncements();

  // Tab Switching
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).style.display = 'block';
      currentAdminTab = tabId;
    });
  });

  // Filter Listeners
  document.getElementById('admin-req-status-filter')?.addEventListener('change', filterAdminRequests);
  document.getElementById('admin-req-search')?.addEventListener('input', filterAdminRequests);

  // Forms
  document.getElementById('add-schedule-form')?.addEventListener('submit', handleAddSchedule);
  document.getElementById('add-center-form')?.addEventListener('submit', handleAddCenter);
  document.getElementById('add-announcement-form')?.addEventListener('submit', handleAddAnnouncement);
});

// Load Stats
async function loadAdminStats() {
  try {
    const res = await API.getAdminStats();
    const s = res.stats;

    document.getElementById('kpi-total-farmers').textContent = s.totalFarmers;
    document.getElementById('kpi-today-requests').textContent = s.todayRequestsCount;
    document.getElementById('kpi-in-queue').textContent = s.inQueueCount;
    document.getElementById('kpi-processing').textContent = s.processingCount;
    document.getElementById('kpi-completed').textContent = s.completedCount;
    document.getElementById('kpi-total-quintals').textContent = `${s.totalQuintalsProcured} Qtl`;
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

// Load Requests
async function loadAdminRequests() {
  const tbody = document.getElementById('admin-requests-tbody');
  if (!tbody) return;

  try {
    const res = await API.getRequests();
    adminRequests = res.requests || [];
    renderAdminRequests(adminRequests);
    updateLiveCallingBar(adminRequests);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;">Error loading requests</td></tr>`;
  }
}

function filterAdminRequests() {
  const status = document.getElementById('admin-req-status-filter')?.value || 'All';
  const q = document.getElementById('admin-req-search')?.value.toLowerCase().trim() || '';

  let filtered = adminRequests.filter(r => {
    const matchesStatus = status === 'All' || r.status === status;
    const matchesQuery =
      r.token_number.toLowerCase().includes(q) ||
      (r.farmer_name && r.farmer_name.toLowerCase().includes(q)) ||
      (r.farmer_mobile && r.farmer_mobile.includes(q)) ||
      r.crop_name.toLowerCase().includes(q) ||
      r.center_name.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  renderAdminRequests(filtered);
}

function renderAdminRequests(requests) {
  const tbody = document.getElementById('admin-requests-tbody');
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No requests match the selected criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map(r => {
    let nextStatusAction = '';
    if (r.status === 'Request Submitted') nextStatusAction = 'Assign Token';
    else if (r.status === 'Token Assigned' || r.status === 'Scheduled') nextStatusAction = 'Gate Entry (In Queue)';
    else if (r.status === 'In Queue') nextStatusAction = 'Call to Weighbridge (Processing)';
    else if (r.status === 'Processing') nextStatusAction = 'Mark Completed (Send DBT)';

    return `
      <tr>
        <td data-label="Token #">
          <strong style="color:#14532d; font-size:15px;">${r.token_number}</strong>
        </td>
        <td data-label="Farmer">
          <strong>${r.farmer_name}</strong>
          <div style="font-size:12px; color:var(--text-muted);">📱 ${r.farmer_mobile}</div>
          <div style="font-size:11px; color:var(--text-light);">${r.farmer_village || ''}</div>
        </td>
        <td data-label="Crop & Qty">
          <strong>${r.crop_name}</strong>
          <div style="font-size:12px; color:var(--text-muted);">${r.quantity_quintals} Quintals</div>
        </td>
        <td data-label="Center & Date">
          <div style="font-size:13px; font-weight:600;">${r.center_name}</div>
          <div style="font-size:12px; color:var(--text-muted);">📅 ${r.preferred_date}</div>
        </td>
        <td data-label="Status">
          <span class="status-badge ${getStatusClass(r.status)}">● ${r.status}</span>
        </td>
        <td data-label="Payment">
          <span style="font-size:12px; font-weight:600; color:${r.payment_status === 'Credited via DBT' ? '#15803d' : '#b45309'};">
            ${r.payment_status || 'Pending'}
          </span>
        </td>
        <td data-label="Actions">
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${nextStatusAction ? `
              <button onclick="advanceRequest('${r.id}')" class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:11px;">
                ⚡ ${nextStatusAction}
              </button>
            ` : `
              <span style="font-size:11px; color:#15803d; font-weight:700;">✓ Flow Completed</span>
            `}
            <button onclick="openEditNotesModal('${r.id}', '${(r.admin_notes || '').replace(/'/g, "\\'")}')" class="btn btn-outline btn-sm" style="padding:2px 6px; font-size:11px;">
              📝 Notes
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateLiveCallingBar(requests) {
  const currentProcessing = requests.find(r => r.status === 'Processing');
  const nextInQueue = requests.filter(r => r.status === 'In Queue')[0];

  const activeTokenEl = document.getElementById('admin-calling-token-no');
  const activeFarmerEl = document.getElementById('admin-calling-farmer-name');
  const nextUpEl = document.getElementById('admin-next-in-line');

  if (currentProcessing) {
    if (activeTokenEl) activeTokenEl.textContent = currentProcessing.token_number;
    if (activeFarmerEl) activeFarmerEl.textContent = `${currentProcessing.farmer_name} (${currentProcessing.crop_name} - ${currentProcessing.quantity_quintals} Qtl)`;
  } else {
    if (activeTokenEl) activeTokenEl.textContent = 'None';
    if (activeFarmerEl) activeFarmerEl.textContent = 'No vehicle currently on weighbridge';
  }

  if (nextUpEl) {
    nextUpEl.textContent = nextInQueue ? `Next in Line: Token #${nextInQueue.token_number} (${nextInQueue.farmer_name})` : 'Queue is currently clear';
  }
}

// Advance Request
async function advanceRequest(requestId) {
  try {
    const res = await API.advanceRequestStatus(requestId);
    if (res.success) {
      showToast(res.message, 'success');
      playChime(659.25, 0.3);
      await loadAdminStats();
      await loadAdminRequests();
    }
  } catch (err) {
    showToast(err.message || 'Failed to advance status', 'error');
  }
}

// Call Next Token in Queue
async function callNextTokenInQueue() {
  try {
    const res = await API.callNextToken();
    if (res.success) {
      showToast(res.message, 'success');
      playChime(523.25, 0.5);
      await loadAdminStats();
      await loadAdminRequests();
    }
  } catch (err) {
    showToast('Failed to call next token', 'error');
  }
}

// Load Schedules Tab
async function loadAdminSchedules() {
  const tbody = document.getElementById('admin-schedules-tbody');
  if (!tbody) return;

  try {
    const res = await API.getSchedules();
    adminSchedules = res.schedules || [];

    tbody.innerHTML = adminSchedules.map(s => `
      <tr>
        <td><strong>${s.procurement_date}</strong></td>
        <td><strong>${s.crop_name}</strong></td>
        <td>${s.center_name}</td>
        <td>${s.start_time} - ${s.end_time}</td>
        <td><strong>${s.remaining_slots}</strong> / ${s.available_slots}</td>
        <td><span class="status-badge scheduled">● ${s.status}</span></td>
        <td>
          <button onclick="deleteScheduleItem('${s.id}')" class="btn btn-danger btn-sm" style="padding:4px 8px; font-size:11px;">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7">Error loading schedules</td></tr>`;
  }
}

async function handleAddSchedule(e) {
  e.preventDefault();
  const payload = {
    center_id: document.getElementById('new-sched-center').value,
    crop_name: document.getElementById('new-sched-crop').value,
    procurement_date: document.getElementById('new-sched-date').value,
    start_time: document.getElementById('new-sched-start').value || '08:30 AM',
    end_time: document.getElementById('new-sched-end').value || '05:30 PM',
    available_slots: document.getElementById('new-sched-slots').value || 50,
    status: 'Available'
  };

  try {
    const res = await API.createSchedule(payload);
    if (res.success) {
      showToast('Schedule created successfully!', 'success');
      document.getElementById('add-schedule-form').reset();
      await loadAdminSchedules();
    }
  } catch (err) {
    showToast('Failed to create schedule', 'error');
  }
}

async function deleteScheduleItem(id) {
  if (!confirm('Are you sure you want to delete this schedule?')) return;
  try {
    await API.deleteSchedule(id);
    showToast('Schedule deleted.', 'info');
    await loadAdminSchedules();
  } catch (e) {
    showToast('Error deleting schedule', 'error');
  }
}

// Load Centers Tab
async function loadAdminCenters() {
  const tbody = document.getElementById('admin-centers-tbody');
  const schedCenterSelect = document.getElementById('new-sched-center');
  const annCenterSelect = document.getElementById('new-ann-center');

  try {
    const res = await API.getCenters();
    adminCenters = res.centers || [];

    if (schedCenterSelect) {
      schedCenterSelect.innerHTML = adminCenters.map(c => `<option value="${c.id}">${c.center_name}</option>`).join('');
    }
    if (annCenterSelect) {
      annCenterSelect.innerHTML = `<option value="">All Centers</option>` + adminCenters.map(c => `<option value="${c.id}">${c.center_name}</option>`).join('');
    }

    if (tbody) {
      tbody.innerHTML = adminCenters.map(c => `
        <tr>
          <td><strong>${c.center_name}</strong></td>
          <td>${c.location}, ${c.district}</td>
          <td>${c.in_charge_name} (Ph: ${c.contact_number})</td>
          <td>${c.crops_accepted.join(', ')}</td>
          <td>${c.opening_time} - ${c.closing_time}</td>
          <td><span class="status-badge completed">● ${c.status}</span></td>
          <td>
            <button onclick="deleteCenterItem('${c.id}')" class="btn btn-danger btn-sm" style="padding:4px 8px; font-size:11px;">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7">Error loading centers</td></tr>`;
  }
}

async function handleAddCenter(e) {
  e.preventDefault();
  const cropsArr = document.getElementById('new-center-crops').value.split(',').map(s => s.trim());
  const payload = {
    center_name: document.getElementById('new-center-name').value,
    location: document.getElementById('new-center-location').value,
    district: document.getElementById('new-center-district').value,
    state: document.getElementById('new-center-state').value || 'Telangana',
    contact_number: document.getElementById('new-center-contact').value,
    in_charge_name: document.getElementById('new-center-incharge').value,
    crops_accepted: cropsArr,
    opening_time: document.getElementById('new-center-opening').value || '08:30 AM',
    closing_time: document.getElementById('new-center-closing').value || '05:30 PM',
    status: 'Open'
  };

  try {
    const res = await API.createCenter(payload);
    if (res.success) {
      showToast('Procurement center added successfully!', 'success');
      document.getElementById('add-center-form').reset();
      await loadAdminCenters();
    }
  } catch (err) {
    showToast('Failed to add center', 'error');
  }
}

async function deleteCenterItem(id) {
  if (!confirm('Are you sure you want to delete this center?')) return;
  try {
    await API.deleteCenter(id);
    showToast('Center deleted.', 'info');
    await loadAdminCenters();
  } catch (e) {
    showToast('Error deleting center', 'error');
  }
}

// Announcements Tab
async function loadAdminAnnouncements() {
  const container = document.getElementById('admin-announcements-list');
  if (!container) return;

  try {
    const res = await API.getAnnouncements();
    adminAnnouncements = res.announcements || [];

    if (adminAnnouncements.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); padding:16px;">No announcements broadcasted yet.</p>`;
      return;
    }

    container.innerHTML = adminAnnouncements.map(a => `
      <div class="announcement-item ${a.priority?.toLowerCase() || 'normal'}" style="justify-content:space-between; align-items:center;">
        <div>
          <h4>${a.title}</h4>
          <p>${a.message}</p>
          <div class="announcement-meta">📍 ${a.center_name || 'All Centers'} • 📅 ${a.announcement_date} • Priority: ${a.priority}</div>
        </div>
        <button onclick="deleteAnnouncementItem('${a.id}')" class="btn btn-outline btn-sm" style="color:#dc2626;">
          🗑️
        </button>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:#dc2626;">Error loading announcements</p>`;
  }
}

async function handleAddAnnouncement(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('new-ann-title').value,
    message: document.getElementById('new-ann-message').value,
    priority: document.getElementById('new-ann-priority').value,
    center_id: document.getElementById('new-ann-center').value || null
  };

  try {
    const res = await API.createAnnouncement(payload);
    if (res.success) {
      showToast('Announcement broadcasted to all farmers!', 'success');
      document.getElementById('add-announcement-form').reset();
      await loadAdminAnnouncements();
    }
  } catch (err) {
    showToast('Failed to post announcement', 'error');
  }
}

async function deleteAnnouncementItem(id) {
  try {
    await API.deleteAnnouncement(id);
    showToast('Announcement removed.', 'info');
    await loadAdminAnnouncements();
  } catch (e) {
    showToast('Error removing announcement', 'error');
  }
}

// Reset Demo Data
async function triggerDemoReset() {
  if (!confirm('Reset all demo requests, schedules, centers, and announcements to default prototype values?')) return;
  try {
    const res = await API.resetDemoData();
    showToast(res.message, 'success');
    setTimeout(() => window.location.reload(), 600);
  } catch (e) {
    showToast('Failed to reset demo data', 'error');
  }
}

// Notes Modal
let activeEditRequestId = null;
function openEditNotesModal(requestId, currentNotes) {
  activeEditRequestId = requestId;
  const modal = document.getElementById('notes-modal');
  document.getElementById('edit-notes-input').value = currentNotes || '';
  if (modal) modal.classList.add('open');
}

function closeNotesModal() {
  const modal = document.getElementById('notes-modal');
  if (modal) modal.classList.remove('open');
}

async function saveAdminNotes() {
  if (!activeEditRequestId) return;
  const notes = document.getElementById('edit-notes-input').value;
  try {
    await API.updateRequest(activeEditRequestId, { admin_notes: notes });
    showToast('Officer notes saved.', 'success');
    closeNotesModal();
    await loadAdminRequests();
  } catch (err) {
    showToast('Failed to save notes', 'error');
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'Request Submitted': return 'submitted';
    case 'Token Assigned': return 'token-assigned';
    case 'Scheduled': return 'scheduled';
    case 'In Queue': return 'in-queue';
    case 'Processing': return 'processing';
    case 'Completed': return 'completed';
    case 'Rejected': return 'rejected';
    default: return 'pending';
  }
}
