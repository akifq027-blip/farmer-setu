import { Router } from 'express';
import { store, ProcurementCenter } from '../store.js';

export const centersRouter = Router();

// GET /api/centers (with optional search, district, and crop filter)
centersRouter.get('/', (req, res) => {
  try {
    let centers = store.getCenters();
    const { district, crop, search, status } = req.query;

    if (district && typeof district === 'string' && district !== 'All') {
      centers = centers.filter(c => c.district.toLowerCase() === district.toLowerCase());
    }

    if (crop && typeof crop === 'string' && crop !== 'All') {
      centers = centers.filter(c =>
        c.crops_accepted.some(cr => cr.toLowerCase().includes(crop.toLowerCase()))
      );
    }

    if (status && typeof status === 'string' && status !== 'All') {
      centers = centers.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      centers = centers.filter(c =>
        c.center_name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.crops_accepted.some(cr => cr.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: centers.length,
      centers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve centers' });
  }
});

// GET /api/centers/:id
centersRouter.get('/:id', (req, res) => {
  const center = store.findCenterById(req.params.id);
  if (!center) {
    return res.status(404).json({ success: false, message: 'Procurement center not found' });
  }

  // Get today's schedules for this center
  const today = new Date().toISOString().split('T')[0];
  const schedules = store.getSchedules().filter(s => s.center_id === center.id && s.procurement_date >= today);

  // Get active queue length
  const activeQueue = store.getRequests().filter(
    r => r.center_id === center.id && (r.status === 'In Queue' || r.status === 'Processing')
  ).length;

  return res.json({
    success: true,
    center,
    upcomingSchedules: schedules,
    currentQueueLength: activeQueue
  });
});

// POST /api/centers (Admin only)
centersRouter.post('/', (req, res) => {
  try {
    const {
      center_name,
      location,
      district,
      state,
      contact_number,
      in_charge_name,
      crops_accepted,
      opening_time,
      closing_time,
      daily_capacity_quintals,
      google_maps_url,
      status
    } = req.body;

    if (!center_name || !location || !district || !contact_number) {
      return res.status(400).json({ success: false, message: 'Missing required center fields.' });
    }

    const newCenter: ProcurementCenter = {
      id: 'c' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      center_name,
      location,
      district,
      state: state || 'Telangana',
      contact_number,
      in_charge_name: in_charge_name || 'Procurement In-Charge',
      crops_accepted: Array.isArray(crops_accepted) ? crops_accepted : ['Paddy (Grade A)', 'Cotton'],
      opening_time: opening_time || '08:30 AM',
      closing_time: closing_time || '05:30 PM',
      daily_capacity_quintals: Number(daily_capacity_quintals) || 1000,
      google_maps_url: google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(center_name + ' ' + location)}`,
      status: status || 'Open',
      created_at: new Date().toISOString()
    };

    store.addCenter(newCenter);
    return res.status(201).json({ success: true, message: 'Center added successfully', center: newCenter });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add center' });
  }
});

// PUT /api/centers/:id (Admin only)
centersRouter.put('/:id', (req, res) => {
  const updated = store.updateCenter(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Center not found' });
  }
  return res.json({ success: true, message: 'Center updated successfully', center: updated });
});

// DELETE /api/centers/:id (Admin only)
centersRouter.delete('/:id', (req, res) => {
  const deleted = store.deleteCenter(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Center not found' });
  }
  return res.json({ success: true, message: 'Center deleted successfully' });
});
