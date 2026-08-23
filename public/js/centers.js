/**
 * KisanSetu - Procurement Center Finder Controller
 */

let allCentersList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadCenters();

  // Search and Filter Listeners
  document.getElementById('center-search-input')?.addEventListener('input', filterCenters);
  document.getElementById('center-district-filter')?.addEventListener('change', filterCenters);
  document.getElementById('center-crop-filter')?.addEventListener('change', filterCenters);
});

async function loadCenters() {
  const container = document.getElementById('centers-grid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 48px; color: var(--text-muted);">
      ⏳ Loading procurement centers...
    </div>
  `;

  try {
    const res = await API.getCenters();
    allCentersList = res.centers || [];

    populateDistrictDropdown(allCentersList);
    renderCenterCards(allCentersList);
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 48px; color: #dc2626;">
        Failed to load procurement centers. Please check your connection.
      </div>
    `;
  }
}

function populateDistrictDropdown(centers) {
  const select = document.getElementById('center-district-filter');
  if (!select) return;

  const districts = [...new Set(centers.map(c => c.district))];
  select.innerHTML = `
    <option value="All">All Districts</option>
    ${districts.map(d => `<option value="${d}">${d}</option>`).join('')}
  `;
}

function filterCenters() {
  const q = document.getElementById('center-search-input')?.value.toLowerCase().trim() || '';
  const district = document.getElementById('center-district-filter')?.value || 'All';
  const crop = document.getElementById('center-crop-filter')?.value || 'All';

  let filtered = allCentersList.filter(c => {
    const matchesSearch =
      c.center_name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.crops_accepted.some(cr => cr.toLowerCase().includes(q));

    const matchesDistrict = district === 'All' || c.district.toLowerCase() === district.toLowerCase();
    const matchesCrop = crop === 'All' || c.crops_accepted.some(cr => cr.toLowerCase().includes(crop.toLowerCase()));

    return matchesSearch && matchesDistrict && matchesCrop;
  });

  renderCenterCards(filtered);
}

function renderCenterCards(centers) {
  const container = document.getElementById('centers-grid');
  const countEl = document.getElementById('centers-count-badge');
  if (!container) return;

  if (countEl) countEl.textContent = `${centers.length} Centers Found`;

  if (centers.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 48px; background:#fff; border-radius:12px; border:1px solid var(--border);">
        <div style="font-size:36px; margin-bottom:12px;">🔍</div>
        <h3>No Procurement Centers Found</h3>
        <p style="color:var(--text-muted); margin-top:6px;">Try adjusting your search terms or filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = centers.map(c => {
    const isOpen = c.status === 'Open';
    const statusBg = isOpen ? '#dcfce7' : '#fee2e2';
    const statusColor = isOpen ? '#15803d' : '#dc2626';

    return `
      <div class="card" style="margin-bottom:0; display:flex; flex-direction:column;">
        <div class="card-header" style="background:#f8fafc; align-items:flex-start;">
          <div>
            <span style="background:${statusBg}; color:${statusColor}; font-size:11px; font-weight:800; padding:2px 8px; border-radius:999px; text-transform:uppercase;">
              ● ${c.status || 'Open'}
            </span>
            <h3 style="font-size:18px; font-weight:800; color:#14532d; margin-top:8px; line-height:1.3;">
              ${c.center_name}
            </h3>
            <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">
              📍 ${c.location}, ${c.district} (${c.state})
            </div>
          </div>
        </div>

        <div class="card-body" style="flex-grow:1; display:flex; flex-direction:column; justify-content:space-between; gap:16px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:var(--text-muted); margin-bottom:6px;">
              🌾 Crops Accepted:
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${c.crops_accepted.map(crop => `
                <span style="background:#f1f5f9; border:1px solid #cbd5e1; font-size:12px; font-weight:600; padding:3px 8px; border-radius:6px;">
                  ${crop}
                </span>
              `).join('')}
            </div>
          </div>

          <div style="background:#f8fafc; padding:12px; border-radius:8px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted);">⏰ Operating Hours:</span>
              <strong>${c.opening_time} - ${c.closing_time}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--text-muted);">👤 In-Charge:</span>
              <strong>${c.in_charge_name}</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted);">📞 Helpline:</span>
              <a href="tel:${c.contact_number}" style="font-weight:700;">${c.contact_number}</a>
            </div>
          </div>
        </div>

        <div class="card-footer" style="display:flex; gap:10px; justify-content:space-between;">
          <a href="${c.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(c.center_name)}`}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex:1;">
            🗺️ View on Map
          </a>
          <a href="/request.html?center_id=${c.id}" class="btn btn-primary btn-sm" style="flex:1;">
            🎟️ Book Slot
          </a>
        </div>
      </div>
    `;
  }).join('');
}
