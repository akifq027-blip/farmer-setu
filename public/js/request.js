/**
 * KisanSetu - Procurement Request & Token Booking Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const farmer = Auth.requireFarmerAuth();
  if (!farmer) return;

  // Pre-fill farmer info
  document.getElementById('farmer-name').value = farmer.full_name;
  document.getElementById('farmer-mobile').value = farmer.mobile_number;
  document.getElementById('farmer-village').value = `${farmer.village}, ${farmer.district}`;

  // Default preferred date to today or tomorrow
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('preferred-date');
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }

  await loadCentersAndCrops();

  // Check URL params for pre-selected center, crop, or date (e.g. from schedule page)
  const urlParams = new URLSearchParams(window.location.search);
  const preCenter = urlParams.get('center_id');
  const preCrop = urlParams.get('crop');
  const preDate = urlParams.get('date');

  if (preCenter) {
    const centerSelect = document.getElementById('procurement-center');
    if (centerSelect) centerSelect.value = preCenter;
  }
  if (preCrop) {
    const cropSelect = document.getElementById('crop-select');
    if (cropSelect) cropSelect.value = preCrop;
  }
  if (preDate && dateInput) {
    dateInput.value = preDate;
  }

  // Bind Form Submit
  const form = document.getElementById('procurement-request-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Live middleman savings calculation listeners
  const qtyInput = document.getElementById('quantity');
  const cropInput = document.getElementById('crop-select');
  if (qtyInput && cropInput) {
    qtyInput.addEventListener('input', updateSavingsCalculator);
    cropInput.addEventListener('change', updateSavingsCalculator);
  }
});

const BENCHMARK_RATES = {
  'paddy': 2320,
  'cotton': 7121,
  'wheat': 2275,
  'maize': 2090,
  'soybean': 4892,
  'gram': 5440,
  'mustard': 5650
};

function updateSavingsCalculator() {
  const qty = parseFloat(document.getElementById('quantity')?.value || '0');
  const cropVal = (document.getElementById('crop-select')?.value || '').toLowerCase();
  const box = document.getElementById('savings-calculator-box');
  const cutEl = document.getElementById('calc-broker-cut');
  const savedEl = document.getElementById('calc-saved-profit');

  if (!box || !cutEl || !savedEl) return;

  if (qty > 0 && cropVal) {
    let matchedRate = 2300;
    for (const [k, rate] of Object.entries(BENCHMARK_RATES)) {
      if (cropVal.includes(k)) {
        matchedRate = rate;
        break;
      }
    }
    const totalTradeValue = qty * matchedRate;
    // Traditional 15% middleman deduction (commission agent + cess + weighing loss)
    const brokerCut = Math.round(totalTradeValue * 0.15);

    cutEl.textContent = '₹' + brokerCut.toLocaleString('en-IN');
    savedEl.textContent = '+₹' + brokerCut.toLocaleString('en-IN') + ' Extra Net Profit';
    box.style.display = 'block';
  } else {
    box.style.display = 'none';
  }
}

let allCenters = [];

async function loadCentersAndCrops() {
  try {
    const res = await API.getCenters();
    allCenters = res.centers || [];

    const centerSelect = document.getElementById('procurement-center');
    if (!centerSelect) return;

    centerSelect.innerHTML = `
      <option value="">-- Select Procurement Center / Mandi --</option>
      ${allCenters.map(c => `
        <option value="${c.id}">
          ${c.center_name} (${c.district}) - [${c.opening_time} to ${c.closing_time}]
        </option>
      `).join('')}
    `;

    // Center change listener to show accepted crops and center guidance
    centerSelect.addEventListener('change', () => {
      const selectedId = centerSelect.value;
      const center = allCenters.find(c => c.id === selectedId);
      const helpBox = document.getElementById('center-info-help');
      if (center && helpBox) {
        helpBox.style.display = 'block';
        helpBox.innerHTML = `
          📍 <strong>Location:</strong> ${center.location}, ${center.district}<br>
          🌾 <strong>Accepted Crops:</strong> ${center.crops_accepted.join(', ')}<br>
          📞 <strong>Center In-Charge:</strong> ${center.in_charge_name} (Ph: ${center.contact_number})<br>
          ⏰ <strong>Operating Hours:</strong> ${center.opening_time} - ${center.closing_time}
        `;
      } else if (helpBox) {
        helpBox.style.display = 'none';
      }
    });
  } catch (err) {
    showToast('Failed to load procurement centers list.', 'error');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const farmer = Auth.getCurrentFarmer();
  if (!farmer) return;

  const centerId = document.getElementById('procurement-center').value;
  const cropName = document.getElementById('crop-select').value;
  const quantity = parseFloat(document.getElementById('quantity').value);
  const preferredDate = document.getElementById('preferred-date').value;
  const transportMode = document.getElementById('transport-mode').value;
  const vehicleNumber = document.getElementById('vehicle-number').value;
  const additionalNotes = document.getElementById('additional-notes').value;

  if (!centerId) {
    showToast('Please select a procurement center.', 'warning');
    return;
  }
  if (!cropName) {
    showToast('Please select the crop you want to sell.', 'warning');
    return;
  }
  if (!quantity || quantity <= 0) {
    showToast('Please enter a valid crop quantity in Quintals.', 'warning');
    return;
  }
  if (!preferredDate) {
    showToast('Please select your preferred drop-off date.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Generating Token & Booking Slot...';

  try {
    const payload = {
      farmer_id: farmer.id,
      farmer_name: farmer.full_name,
      farmer_mobile: farmer.mobile_number,
      farmer_village: `${farmer.village}, ${farmer.district}`,
      center_id: centerId,
      crop_name: cropName,
      quantity_quintals: quantity,
      preferred_date: preferredDate,
      transport_mode: transportMode,
      vehicle_number: vehicleNumber,
      additional_notes: additionalNotes
    };

    const res = await API.createRequest(payload);
    if (res.success) {
      showToast('Procurement slot booked successfully!', 'success');
      playChime(523.25, 0.4);
      displaySuccessReceipt(res.request);
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit request. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🎟️ Generate Token & Book Slot';
  }
}

function displaySuccessReceipt(req) {
  const formCard = document.getElementById('request-form-card');
  const successCard = document.getElementById('request-success-card');

  if (formCard) formCard.style.display = 'none';
  if (successCard) {
    successCard.style.display = 'block';
    successCard.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('receipt-token-no').textContent = req.token_number;
    document.getElementById('receipt-crop-qty').textContent = `${req.crop_name} (${req.quantity_quintals} Quintals)`;
    document.getElementById('receipt-center').textContent = req.center_name;
    document.getElementById('receipt-date').textContent = req.preferred_date;
    document.getElementById('receipt-status').textContent = req.status;
    document.getElementById('receipt-req-id').textContent = req.id;

    // Track button link
    document.getElementById('receipt-track-btn').href = `/status.html?token=${encodeURIComponent(req.token_number)}`;
  }
}
