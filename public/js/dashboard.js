/**
 * KisanSetu - Farmer Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const farmer = Auth.requireFarmerAuth();
  if (!farmer) return;

  // Set greeting & farmer info
  document.getElementById('farmer-greeting-name').textContent = farmer.full_name;
  document.getElementById('farmer-village-tag').textContent = `📍 ${farmer.village}, ${farmer.district}`;
  document.getElementById('farmer-mobile-tag').textContent = `📱 ${farmer.mobile_number}`;

  await loadDashboardData(farmer.id);

  // Poll for queue changes every 20 seconds for live feel
  setInterval(() => {
    loadDashboardData(farmer.id, true);
  }, 20000);
});

async function loadDashboardData(farmerId, isPolling = false) {
  try {
    const [requestsRes, announcementsRes] = await Promise.all([
      API.getRequests({ farmer_id: farmerId }),
      API.getAnnouncements()
    ]);

    const requests = requestsRes.requests || [];
    const announcements = announcementsRes.announcements || [];

    renderActiveTokenCard(requests);
    renderRequestsHistory(requests);
    renderAnnouncements(announcements);

    if (isPolling) {
      // Optional subtle sound if status changed to Processing
      const processing = requests.find(r => r.status === 'Processing');
      if (processing) {
        playChime(659.25, 0.4);
      }
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
    if (!isPolling) {
      showToast('Could not fetch latest dashboard data. Retrying...', 'warning');
    }
  }
}

function renderActiveTokenCard(requests) {
  const container = document.getElementById('active-token-container');
  if (!container) return;

  // Find most active request (In Queue > Processing > Scheduled > Token Assigned > Request Submitted)
  const activeOrder = ['Processing', 'In Queue', 'Scheduled', 'Token Assigned', 'Request Submitted'];
  let activeRequest = null;

  for (const status of activeOrder) {
    activeRequest = requests.find(r => r.status === status);
    if (activeRequest) break;
  }

  if (!activeRequest) {
    container.innerHTML = `
      <div class="card" style="padding: 36px; text-align: center; background: #ffffff;">
        <div style="font-size: 48px; margin-bottom: 12px;">🌾</div>
        <h3 style="font-size: 20px; font-weight: 800; color: #14532d; margin-bottom: 8px;">
          No Active Procurement Token Right Now
        </h3>
        <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 20px;">
          Book a drop-off slot for your harvest (Paddy, Wheat, Cotton, Maize, etc.) to get an instant digital queue token.
        </p>
        <a href="/request.html" class="btn btn-primary btn-lg">
          ➕ <span data-i18n="dash_btn_new_request">Book New Crop Slot</span>
        </a>
      </div>
    `;
    return;
  }

  let statusClass = 'in-queue';
  if (activeRequest.status === 'Processing') statusClass = 'processing';
  else if (activeRequest.status === 'Scheduled') statusClass = 'scheduled';
  else if (activeRequest.status === 'Token Assigned') statusClass = 'token-assigned';

  const farmersAhead = activeRequest.status === 'Processing' ? 0 : (activeRequest.queue_position || 1);
  const estWait = activeRequest.status === 'Processing' ? '10-15 mins' : `${farmersAhead * 15} minutes`;

  container.innerHTML = `
    <div class="active-token-card">
      <div class="token-card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🎟️</span>
          <span style="font-weight: 800; font-size: 16px;">Active Drop-Off Token</span>
        </div>
        <div class="token-live-indicator">
          <span class="pulse-dot"></span> Live Queue Active
        </div>
      </div>

      <div class="token-body-grid">
        <!-- Col 1: Big Token Number -->
        <div class="token-number-box">
          <div class="token-label" data-i18n="dash_token_no">TOKEN NUMBER</div>
          <div class="token-ring-avatar">
            <span class="token-huge-digits">${activeRequest.token_number}</span>
          </div>
          <span class="status-badge ${statusClass}">
            ● ${activeRequest.status}
          </span>
        </div>

        <!-- Col 2: Procurement Info -->
        <div class="token-details-col">
          <div class="detail-row">
            <span class="detail-label" data-i18n="dash_crop">Crop:</span>
            <span class="detail-value">${activeRequest.crop_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label" data-i18n="dash_quantity">Quantity:</span>
            <span class="detail-value">${activeRequest.quantity_quintals} Quintals</span>
          </div>
          <div class="detail-row">
            <span class="detail-label" data-i18n="dash_center">Center:</span>
            <span class="detail-value" style="text-align:right;">${activeRequest.center_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label" data-i18n="dash_date">Date:</span>
            <span class="detail-value">${activeRequest.preferred_date}</span>
          </div>
          <div class="detail-row" style="margin-bottom:0;">
            <span class="detail-label">Vehicle:</span>
            <span class="detail-value">${activeRequest.transport_mode} ${activeRequest.vehicle_number ? `(${activeRequest.vehicle_number})` : ''}</span>
          </div>
        </div>

        <!-- Col 3: Live Queue Ahead -->
        <div class="queue-estimate-col">
          <div class="token-label" data-i18n="dash_farmers_ahead">Farmers Ahead</div>
          <div class="queue-ahead-count">${activeRequest.status === 'Processing' ? 'Next Up!' : farmersAhead}</div>
          <div class="queue-ahead-sub">${activeRequest.status === 'Processing' ? 'Weighbridge Counter' : 'Farmers Ahead of You'}</div>
          <div class="queue-time-estimate">
            ⏳ Est. Wait: ~${estWait}
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 13px; color: var(--text-muted);">
          💬 <strong>Note:</strong> ${activeRequest.admin_notes || 'Please keep your Aadhaar & Land records ready.'}
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="/status.html?token=${encodeURIComponent(activeRequest.token_number)}" class="btn btn-primary btn-sm">
            🔍 Track Live Status
          </a>
          <button onclick="printTokenSlip('${activeRequest.id}')" class="btn btn-outline btn-sm">
            🖨️ Token Slip
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderRequestsHistory(requests) {
  const container = document.getElementById('recent-requests-tbody');
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 32px; color: var(--text-muted);">
          No previous procurement requests found. Book your first slot above!
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = requests.map(r => {
    let badgeClass = 'submitted';
    if (r.status === 'In Queue') badgeClass = 'in-queue';
    else if (r.status === 'Processing') badgeClass = 'processing';
    else if (r.status === 'Completed') badgeClass = 'completed';
    else if (r.status === 'Scheduled') badgeClass = 'scheduled';
    else if (r.status === 'Rejected') badgeClass = 'rejected';

    return `
      <tr>
        <td data-label="Token No">
          <strong style="color:#14532d; font-size:15px;">${r.token_number}</strong>
        </td>
        <td data-label="Crop & Qty">
          <strong>${r.crop_name}</strong>
          <div style="font-size:12px; color:var(--text-muted);">${r.quantity_quintals} Quintals</div>
        </td>
        <td data-label="Center">
          ${r.center_name}
        </td>
        <td data-label="Date">
          ${r.preferred_date}
        </td>
        <td data-label="Status">
          <span class="status-badge ${badgeClass}">● ${r.status}</span>
        </td>
        <td data-label="Actions">
          <a href="/status.html?token=${encodeURIComponent(r.token_number)}" class="btn btn-outline-primary btn-sm" style="padding: 4px 10px; font-size:12px;">
            Track
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAnnouncements(announcements) {
  const container = document.getElementById('dash-announcements-list');
  if (!container) return;

  if (announcements.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">No active announcements.</p>`;
    return;
  }

  container.innerHTML = announcements.slice(0, 3).map(a => {
    const priorityClass = (a.priority || 'Normal').toLowerCase();
    let icon = '📢';
    if (priorityClass === 'urgent') icon = '🚨';
    if (priorityClass === 'info') icon = 'ℹ️';

    return `
      <div class="announcement-item ${priorityClass}">
        <div class="announcement-icon">${icon}</div>
        <div class="announcement-content">
          <h4>${a.title}</h4>
          <p>${a.message}</p>
          <div class="announcement-meta">
            📍 ${a.center_name || 'All Centers'} • 📅 ${a.announcement_date}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Token Slip Printable Modal
async function printTokenSlip(requestId) {
  try {
    const res = await API.getRequestByIdOrToken(requestId);
    const req = res.request;

    const modal = document.getElementById('token-modal');
    const modalBody = document.getElementById('token-modal-body');

    modalBody.innerHTML = `
      <div class="token-receipt-slip" id="printable-slip">
        <div class="slip-header">
          <div class="slip-logo">🌾 KisanSetu Procurement System</div>
          <div style="font-size:12px; color:var(--text-muted);">Government Agriculture & Civil Supplies Department</div>
          <div class="slip-token-number">${req.token_number}</div>
          <span class="status-badge in-queue">● Status: ${req.status}</span>
        </div>

        <div style="margin: 16px 0; font-size: 14px;">
          <div class="detail-row">
            <span class="detail-label">Farmer Name:</span>
            <span class="detail-value">${req.farmer_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Mobile Number:</span>
            <span class="detail-value">${req.farmer_mobile}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Crop & Quantity:</span>
            <span class="detail-value">${req.crop_name} - ${req.quantity_quintals} Qtl</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Center:</span>
            <span class="detail-value">${req.center_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Procurement Date:</span>
            <span class="detail-value">${req.preferred_date}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Vehicle:</span>
            <span class="detail-value">${req.transport_mode} ${req.vehicle_number || ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Center In-Charge Contact:</span>
            <span class="detail-value">${req.centerContact || 'Available at Gate'}</span>
          </div>
        </div>

        <div style="border-top:1px dashed #cbd5e1; padding-top:12px; font-size:12px; color:var(--text-muted); text-align:center;">
          * Please bring original Aadhaar Card, Land Passbook & Bank Passbook.<br>
          Generated on: ${new Date().toLocaleString()}
        </div>
      </div>
      <div style="display:flex; justify-content:center; gap:12px; margin-top:20px;">
        <button onclick="window.print()" class="btn btn-primary">
          🖨️ Print Slip / Save PDF
        </button>
        <button onclick="closeTokenModal()" class="btn btn-outline">
          Close
        </button>
      </div>
    `;

    modal.classList.add('open');
  } catch (err) {
    showToast('Failed to load token slip.', 'error');
  }
}

function closeTokenModal() {
  document.getElementById('token-modal').classList.remove('open');
}
