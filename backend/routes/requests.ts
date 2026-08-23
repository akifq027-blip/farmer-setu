import { Router } from 'express';
import { store, ProcurementRequest, RequestStatus } from '../store.js';

export const requestsRouter = Router();

// Helper to generate next unique Token (e.g. A-105, P-203, C-112)
function generateTokenNumber(cropName: string, centerId: string): string {
  let prefix = 'A';
  if (cropName.toLowerCase().includes('paddy')) prefix = 'P';
  else if (cropName.toLowerCase().includes('wheat')) prefix = 'W';
  else if (cropName.toLowerCase().includes('cotton')) prefix = 'C';
  else if (cropName.toLowerCase().includes('soy')) prefix = 'S';
  else if (cropName.toLowerCase().includes('maize')) prefix = 'M';
  else if (cropName.toLowerCase().includes('gram')) prefix = 'G';

  const existingWithPrefix = store.getRequests().filter(r => r.token_number.startsWith(prefix));
  const nextNum = 100 + existingWithPrefix.length + 1;
  return `${prefix}-${nextNum}`;
}

// GET /api/requests (With filters: farmer_id, center_id, status, search)
requestsRouter.get('/', (req, res) => {
  try {
    let requests = store.getRequests();
    const { farmer_id, center_id, status, search } = req.query;

    if (farmer_id && typeof farmer_id === 'string') {
      requests = requests.filter(r => r.farmer_id === farmer_id);
    }

    if (center_id && typeof center_id === 'string' && center_id !== 'All') {
      requests = requests.filter(r => r.center_id === center_id);
    }

    if (status && typeof status === 'string' && status !== 'All') {
      requests = requests.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      requests = requests.filter(r =>
        r.token_number.toLowerCase().includes(q) ||
        (r.farmer_name && r.farmer_name.toLowerCase().includes(q)) ||
        (r.farmer_mobile && r.farmer_mobile.includes(q)) ||
        r.crop_name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    // Sort: Active items first, then by submission time
    requests.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// GET /api/requests/:idOrToken
requestsRouter.get('/:idOrToken', (req, res) => {
  const param = req.params.idOrToken;
  let request = store.findRequestById(param);
  if (!request) {
    request = store.findRequestByToken(param);
  }

  if (!request) {
    return res.status(404).json({ success: false, message: 'Procurement request or token not found' });
  }

  // Calculate live farmers ahead
  const centerId = request.center_id;
  const requestsInCenter = store.getRequests().filter(r => r.center_id === centerId);
  const activeQueue = requestsInCenter.filter(r => r.status === 'In Queue' || r.status === 'Processing');
  activeQueue.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const currentIdx = activeQueue.findIndex(r => r.id === request?.id);
  const farmersAhead = currentIdx >= 0 ? currentIdx : (request.status === 'In Queue' ? request.queue_position : 0);
  const estimatedWait = farmersAhead > 0 ? farmersAhead * 15 : 0;

  const center = store.findCenterById(request.center_id);

  return res.json({
    success: true,
    request: {
      ...request,
      farmersAhead,
      estimatedWaitTime: estimatedWait,
      centerLocation: center?.location,
      centerContact: center?.contact_number,
      centerOpeningHours: `${center?.opening_time} - ${center?.closing_time}`
    }
  });
});

// POST /api/requests (Submit new procurement request)
requestsRouter.post('/', (req, res) => {
  try {
    const {
      farmer_id,
      farmer_name,
      farmer_mobile,
      farmer_village,
      center_id,
      crop_name,
      quantity_quintals,
      preferred_date,
      transport_mode,
      vehicle_number,
      additional_notes
    } = req.body;

    if (!farmer_id || !center_id || !crop_name || !quantity_quintals || !preferred_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields: Farmer, Center, Crop, Quantity, and Date.'
      });
    }

    const center = store.findCenterById(center_id);
    const farmer = store.findFarmerById(farmer_id);

    const tokenNumber = generateTokenNumber(crop_name, center_id);
    const today = new Date().toISOString().split('T')[0];
    const isToday = preferred_date === today;

    // Determine initial status
    // If preferred date is today, assign 'In Queue' or 'Scheduled'
    const initialStatus: RequestStatus = isToday ? 'In Queue' : 'Scheduled';

    const newRequest: ProcurementRequest = {
      id: 'r' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      farmer_id,
      farmer_name: farmer_name || farmer?.full_name || 'Farmer',
      farmer_mobile: farmer_mobile || farmer?.mobile_number || '',
      farmer_village: farmer_village || `${farmer?.village || ''}, ${farmer?.district || ''}`,
      center_id,
      center_name: center?.center_name || 'Procurement Center',
      crop_name,
      quantity_quintals: Number(quantity_quintals),
      preferred_date,
      transport_mode: transport_mode || 'Tractor Trolley',
      vehicle_number: vehicle_number ? vehicle_number.trim() : undefined,
      token_number: tokenNumber,
      status: initialStatus,
      queue_position: 0,
      estimated_waiting_minutes: 0,
      admin_notes: additional_notes || 'Request registered via online portal.',
      payment_status: 'Pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.addRequest(newRequest);

    // Update remaining slots in corresponding schedule if exists
    const matchingSchedule = store.getSchedules().find(
      s => s.center_id === center_id && s.procurement_date === preferred_date && s.crop_name.toLowerCase().includes(crop_name.toLowerCase())
    );
    if (matchingSchedule && matchingSchedule.remaining_slots > 0) {
      matchingSchedule.remaining_slots -= 1;
      if (matchingSchedule.remaining_slots <= 5) {
        matchingSchedule.status = 'Limited';
      }
      if (matchingSchedule.remaining_slots === 0) {
        matchingSchedule.status = 'Full';
      }
      store.saveToFile();
    }

    return res.status(201).json({
      success: true,
      message: 'Procurement slot booked & Token assigned successfully!',
      request: newRequest
    });
  } catch (error) {
    console.error('Request creation error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating procurement request' });
  }
});

// PUT /api/requests/:id (Update request / status / notes / token)
requestsRouter.put('/:id', (req, res) => {
  try {
    const { status, token_number, preferred_date, admin_notes, payment_status, quantity_quintals } = req.body;
    const existing = store.findRequestById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const updates: Partial<ProcurementRequest> = {};
    if (status) updates.status = status;
    if (token_number) updates.token_number = token_number;
    if (preferred_date) updates.preferred_date = preferred_date;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (payment_status) updates.payment_status = payment_status;
    if (quantity_quintals) updates.quantity_quintals = Number(quantity_quintals);

    // Timestamp milestones
    if (status === 'In Queue' && !existing.gate_entry_time) {
      updates.gate_entry_time = new Date().toISOString();
    }
    if (status === 'Completed' && !existing.weighment_completed_time) {
      updates.weighment_completed_time = new Date().toISOString();
    }

    const updated = store.updateRequest(req.params.id, updates);
    return res.json({
      success: true,
      message: `Request status updated to ${status || 'updated'}.`,
      request: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

// DELETE /api/requests/:id
requestsRouter.delete('/:id', (req, res) => {
  const deleted = store.deleteRequest(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  return res.json({ success: true, message: 'Request cancelled successfully' });
});
