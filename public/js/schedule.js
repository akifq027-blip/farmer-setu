/**
 * KisanSetu - Procurement Schedule & Timetable Controller
 */

let allSchedules = [];
let allCenters = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilterOptions();
  await loadSchedules();

  // Filter Listeners
  document.getElementById('filter-district')?.addEventListener('change', applyFilters);
  document.getElementById('filter-center')?.addEventListener('change', applyFilters);
  document.getElementById('filter-crop')?.addEventListener('change', applyFilters);
  document.getElementById('filter-date')?.addEventListener('change', applyFilters);
  document.getElementById('reset-filters-btn')?.addEventListener('click', resetFilters);
});

async function loadFilterOptions() {
  try {
    const centersRes = await API.getCenters();
    allCenters = centersRes.centers || [];

    const districtSelect = document.getElementById('filter-district');
    const centerSelect = document.getElementById('filter-center');

    // Unique districts
    const districts = [...new Set(allCenters.map(c => c.district))];
    if (districtSelect) {
      districtSelect.innerHTML = `
        <option value="All">All Districts</option>
        ${districts.map(d => `<option value="${d}">${d}</option>`).join('')}
      `;
    }

    if (centerSelect) {
      centerSelect.innerHTML = `
        <option value="All">All Centers</option>
        ${allCenters.map(c => `<option value="${c.id}">${c.center_name}</option>`).join('')}
      `;
    }
  } catch (e) {
    console.error('Error loading filter options:', e);
  }
}

async function loadSchedules() {
  const container = document.getElementById('schedule-list-tbody');
  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">
        ⏳ Loading procurement schedules...
      </td>
    </tr>
  `;

  try {
    const res = await API.getSchedules();
    allSchedules = res.schedules || [];
    renderSchedules(allSchedules);
  } catch (err) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 24px; color: #dc2626;">
          Failed to load schedules. Please refresh the page.
        </td>
      </tr>
    `;
  }
}

function applyFilters() {
  const district = document.getElementById('filter-district')?.value || 'All';
  const centerId = document.getElementById('filter-center')?.value || 'All';
  const crop = document.getElementById('filter-crop')?.value || 'All';
  const date = document.getElementById('filter-date')?.value;

  let filtered = [...allSchedules];

  if (district !== 'All') {
    filtered = filtered.filter(s => s.district?.toLowerCase() === district.toLowerCase());
  }

  if (centerId !== 'All') {
    filtered = filtered.filter(s => s.center_id === centerId);
  }

  if (crop !== 'All') {
    filtered = filtered.filter(s => s.crop_name.toLowerCase().includes(crop.toLowerCase()));
  }

  if (date) {
    filtered = filtered.filter(s => s.procurement_date === date);
  }

  renderSchedules(filtered);
}

function resetFilters() {
  document.getElementById('filter-district').value = 'All';
  document.getElementById('filter-center').value = 'All';
  document.getElementById('filter-crop').value = 'All';
  if (document.getElementById('filter-date')) document.getElementById('filter-date').value = '';
  renderSchedules(allSchedules);
}

function renderSchedules(schedules) {
  const container = document.getElementById('schedule-list-tbody');
  const countEl = document.getElementById('schedules-count-badge');
  if (!container) return;

  if (countEl) countEl.textContent = `${schedules.length} Available Slots`;

  if (schedules.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 36px; color: var(--text-muted);">
          No procurement schedules found matching your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = schedules.map(s => {
    let badgeColor = '#15803d';
    let badgeBg = '#dcfce7';
    let statusText = s.status || 'Available';

    if (statusText === 'Limited') {
      badgeColor = '#b45309';
      badgeBg = '#fef3c7';
    } else if (statusText === 'Full') {
      badgeColor = '#dc2626';
      badgeBg = '#fee2e2';
    }

    const isAvailable = s.remaining_slots > 0 && statusText !== 'Full';

    return `
      <tr>
        <td data-label="Date">
          <strong style="font-size:15px; color:#14532d;">${formatDate(s.procurement_date)}</strong>
          <div style="font-size:12px; color:var(--text-muted);">${s.start_time} - ${s.end_time}</div>
        </td>
        <td data-label="Crop">
          <strong style="color:var(--text-main); font-size:15px;">${s.crop_name}</strong>
        </td>
        <td data-label="Center">
          <div style="font-weight:600;">${s.center_name}</div>
          <div style="font-size:12px; color:var(--text-muted);">📍 ${s.location}, ${s.district}</div>
        </td>
        <td data-label="Available Slots">
          <strong style="font-size:16px; color:#15803d;">${s.remaining_slots}</strong>
          <span style="font-size:12px; color:var(--text-muted);">/ ${s.available_slots}</span>
        </td>
        <td data-label="Status">
          <span style="background:${badgeBg}; color:${badgeColor}; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">
            ● ${statusText}
          </span>
        </td>
        <td data-label="Action">
          ${isAvailable ? `
            <a href="/request.html?center_id=${s.center_id}&crop=${encodeURIComponent(s.crop_name)}&date=${s.procurement_date}" class="btn btn-primary btn-sm">
              🎟️ Book Slot
            </a>
          ` : `
            <button class="btn btn-outline btn-sm" disabled style="opacity:0.6; cursor:not-allowed;">
              Slot Full
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
