/**
 * KisanSetu - Procurement Status & Live Queue Tracker Controller
 */

const STAGES = [
  'Request Submitted',
  'Token Assigned',
  'Scheduled',
  'In Queue',
  'Processing',
  'Completed'
];

document.addEventListener('DOMContentLoaded', async () => {
  // Check URL query for token or ID
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token') || urlParams.get('id');

  const searchInput = document.getElementById('search-token-input');
  if (tokenParam && searchInput) {
    searchInput.value = tokenParam;
    await trackStatus(tokenParam);
  } else {
    // If logged in farmer, auto-track their most recent request
    const farmer = Auth.getCurrentFarmer();
    if (farmer) {
      try {
        const res = await API.getRequests({ farmer_id: farmer.id });
        if (res.requests && res.requests.length > 0) {
          const latest = res.requests[0];
          searchInput.value = latest.token_number;
          await trackStatus(latest.token_number);
        }
      } catch (e) {}
    }
  }

  // Bind Search Form
  const form = document.getElementById('track-status-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (!val) {
        showToast('Please enter a Token Number or Request ID.', 'warning');
        return;
      }
      await trackStatus(val);
    });
  }
});

async function trackStatus(tokenOrId) {
  const resultContainer = document.getElementById('status-result-card');
  const emptyContainer = document.getElementById('status-empty-state');
  const errorContainer = document.getElementById('status-error-state');

  try {
    const res = await API.getRequestByIdOrToken(tokenOrId);
    const req = res.request;

    if (emptyContainer) emptyContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (resultContainer) {
      resultContainer.style.display = 'block';
      renderStatusDetails(req);
    }
  } catch (err) {
    if (emptyContainer) emptyContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'none';
    if (errorContainer) {
      errorContainer.style.display = 'block';
      document.getElementById('error-message-text').textContent =
        `Token / Request "${tokenOrId}" was not found. Please verify the token number printed on your slip.`;
    }
  }
}

function renderStatusDetails(req) {
  document.getElementById('display-token-number').textContent = req.token_number;
  document.getElementById('display-status-text').textContent = req.status;
  document.getElementById('display-crop-name').textContent = req.crop_name;
  document.getElementById('display-quantity').textContent = `${req.quantity_quintals} Quintals`;
  document.getElementById('display-center-name').textContent = req.center_name;
  document.getElementById('display-procurement-date').textContent = req.preferred_date;
  document.getElementById('display-transport').textContent = `${req.transport_mode} ${req.vehicle_number ? `(${req.vehicle_number})` : ''}`;
  document.getElementById('display-farmer-name').textContent = req.farmer_name || 'Registered Farmer';
  document.getElementById('display-farmer-mobile').textContent = req.farmer_mobile || '';
  document.getElementById('display-request-id').textContent = req.id;
  document.getElementById('display-submitted-at').textContent = new Date(req.submitted_at).toLocaleString();
  document.getElementById('display-admin-notes').textContent = req.admin_notes || 'All documents verified for arrival.';

  // Update Status Pill
  const statusPill = document.getElementById('display-status-pill');
  statusPill.className = `status-badge ${getStatusBadgeClass(req.status)}`;
  statusPill.textContent = `● ${req.status}`;

  // Update Queue Ahead Section
  const queueAheadBlock = document.getElementById('queue-ahead-block');
  const aheadCountEl = document.getElementById('display-ahead-count');
  const estWaitEl = document.getElementById('display-est-wait');

  if (req.status === 'In Queue' || req.status === 'Processing') {
    queueAheadBlock.style.display = 'block';
    if (req.status === 'Processing') {
      aheadCountEl.textContent = '0 (Now Processing)';
      estWaitEl.textContent = 'Vehicle is on the weighbridge counter now!';
    } else {
      const ahead = req.farmersAhead !== undefined ? req.farmersAhead : (req.queue_position || 1);
      aheadCountEl.textContent = `${ahead} Farmers Ahead`;
      estWaitEl.textContent = `Approximately ${ahead * 15} minutes estimated waiting time.`;
    }
  } else if (req.status === 'Completed') {
    queueAheadBlock.style.display = 'block';
    aheadCountEl.textContent = 'Procurement Completed ✅';
    estWaitEl.textContent = `Payment Status: ${req.payment_status || 'Credited via DBT'}`;
  } else {
    queueAheadBlock.style.display = 'none';
  }

  // Update Progress Timeline
  renderProgressTimeline(req.status);
}

function renderProgressTimeline(currentStatus) {
  const currentIdx = STAGES.indexOf(currentStatus);
  const timelineContainer = document.getElementById('timeline-steps-container');
  if (!timelineContainer) return;

  const totalSteps = STAGES.length;
  const progressPercent = currentIdx >= 0 ? (currentIdx / (totalSteps - 1)) * 100 : 0;

  const progressBar = document.getElementById('timeline-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  timelineContainer.innerHTML = STAGES.map((stage, idx) => {
    let stepClass = '';
    let icon = idx + 1;
    if (idx < currentIdx) {
      stepClass = 'completed';
      icon = '✓';
    } else if (idx === currentIdx) {
      stepClass = 'active';
      icon = idx + 1;
    }

    return `
      <div class="timeline-step ${stepClass}">
        <div class="step-circle">${icon}</div>
        <div class="step-title">${stage}</div>
      </div>
    `;
  }).join('');
}

function getStatusBadgeClass(status) {
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
