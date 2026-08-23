import { Router } from 'express';
import { store, ProcurementSchedule } from '../store.js';

export const schedulesRouter = Router();

// GET /api/schedules (with filtering by district, center_id, crop, date)
schedulesRouter.get('/', (req, res) => {
  try {
    let schedules = store.getSchedules();
    const centers = store.getCenters();
    const { district, center_id, crop, date, status } = req.query;

    // Attach center details to each schedule
    let enriched = schedules.map(s => {
      const center = centers.find(c => c.id === s.center_id);
      return {
        ...s,
        center_name: center ? center.center_name : 'Unknown Center',
        location: center ? center.location : '',
        district: center ? center.district : '',
        state: center ? center.state : '',
        center_contact: center ? center.contact_number : ''
      };
    });

    if (district && typeof district === 'string' && district !== 'All') {
      enriched = enriched.filter(s => s.district.toLowerCase() === district.toLowerCase());
    }

    if (center_id && typeof center_id === 'string' && center_id !== 'All') {
      enriched = enriched.filter(s => s.center_id === center_id);
    }

    if (crop && typeof crop === 'string' && crop !== 'All') {
      enriched = enriched.filter(s => s.crop_name.toLowerCase().includes(crop.toLowerCase()));
    }

    if (date && typeof date === 'string') {
      enriched = enriched.filter(s => s.procurement_date === date);
    }

    if (status && typeof status === 'string' && status !== 'All') {
      enriched = enriched.filter(s => s.status.toLowerCase() === status.toLowerCase());
    }

    // Sort by procurement date ascending
    enriched.sort((a, b) => new Date(a.procurement_date).getTime() - new Date(b.procurement_date).getTime());

    return res.json({
      success: true,
      count: enriched.length,
      schedules: enriched
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve schedules' });
  }
});

// GET /api/schedules/:id
schedulesRouter.get('/:id', (req, res) => {
  const schedule = store.findScheduleById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }
  const center = store.findCenterById(schedule.center_id);
  return res.json({
    success: true,
    schedule: {
      ...schedule,
      center_name: center?.center_name,
      location: center?.location,
      district: center?.district
    }
  });
});

// POST /api/schedules (Admin)
schedulesRouter.post('/', (req, res) => {
  try {
    const { center_id, crop_name, procurement_date, start_time, end_time, available_slots, status } = req.body;
    if (!center_id || !crop_name || !procurement_date) {
      return res.status(400).json({ success: false, message: 'Missing required schedule fields' });
    }

    const slots = Number(available_slots) || 50;
    const newSchedule: ProcurementSchedule = {
      id: 's' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      center_id,
      crop_name,
      procurement_date,
      start_time: start_time || '08:30 AM',
      end_time: end_time || '05:30 PM',
      available_slots: slots,
      remaining_slots: slots,
      status: status || 'Available',
      created_at: new Date().toISOString()
    };

    store.addSchedule(newSchedule);
    return res.status(201).json({ success: true, message: 'Schedule created', schedule: newSchedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id (Admin)
schedulesRouter.put('/:id', (req, res) => {
  const updated = store.updateSchedule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }
  return res.json({ success: true, message: 'Schedule updated', schedule: updated });
});

// DELETE /api/schedules/:id (Admin)
schedulesRouter.delete('/:id', (req, res) => {
  const deleted = store.deleteSchedule(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }
  return res.json({ success: true, message: 'Schedule deleted' });
});
