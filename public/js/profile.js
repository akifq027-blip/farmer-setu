/**
 * KisanSetu - Farmer Profile Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const farmer = Auth.requireFarmerAuth();
  if (!farmer) return;

  await loadProfile(farmer.id);

  const form = document.getElementById('profile-update-form');
  if (form) {
    form.addEventListener('submit', handleProfileUpdate);
  }
});

async function loadProfile(farmerId) {
  try {
    const res = await API.getProfile(farmerId);
    const f = res.farmer;
    const stats = res.stats;

    // Fill Display and Form Fields
    document.getElementById('profile-name').textContent = f.full_name;
    document.getElementById('profile-mobile-display').textContent = f.mobile_number;
    document.getElementById('profile-village-display').textContent = `${f.village}, ${f.district} (${f.state})`;
    document.getElementById('profile-pattadar-display').textContent = f.land_record_id || 'Not Linked';

    // Stats
    document.getElementById('stat-total-requests').textContent = stats.totalRequests;
    document.getElementById('stat-completed-procurements').textContent = stats.completedRequests;
    document.getElementById('stat-total-quintals').textContent = `${stats.totalProcuredQuintals} Qtl`;

    // Form inputs
    document.getElementById('input-full-name').value = f.full_name;
    document.getElementById('input-email').value = f.email || '';
    document.getElementById('input-village').value = f.village;
    document.getElementById('input-district').value = f.district;
    document.getElementById('input-state').value = f.state;
    document.getElementById('input-land-record').value = f.land_record_id || '';
    document.getElementById('input-language').value = f.preferred_language || 'en';
  } catch (err) {
    showToast('Failed to load farmer profile.', 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const farmer = Auth.getCurrentFarmer();
  if (!farmer) return;

  const btn = document.getElementById('save-profile-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const payload = {
      full_name: document.getElementById('input-full-name').value.trim(),
      email: document.getElementById('input-email').value.trim(),
      village: document.getElementById('input-village').value.trim(),
      district: document.getElementById('input-district').value.trim(),
      state: document.getElementById('input-state').value.trim(),
      land_record_id: document.getElementById('input-land-record').value.trim(),
      preferred_language: document.getElementById('input-language').value
    };

    const res = await API.updateProfile(farmer.id, payload);
    if (res.success) {
      Auth.setFarmerSession(res.farmer);
      showToast('Profile updated successfully!', 'success');
      loadProfile(farmer.id);
    }
  } catch (err) {
    showToast('Failed to update profile.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Profile Changes';
  }
}
