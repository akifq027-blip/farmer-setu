import { Router } from 'express';
import { store, Announcement } from '../store.js';

export const announcementsRouter = Router();

// GET /api/announcements (Latest first)
announcementsRouter.get('/', (req, res) => {
  try {
    let announcements = store.getAnnouncements();
    const { center_id } = req.query;

    if (center_id && typeof center_id === 'string' && center_id !== 'All') {
      announcements = announcements.filter(a => !a.center_id || a.center_id === center_id);
    }

    // Sort by created_at descending
    announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({
      success: true,
      count: announcements.length,
      announcements
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve announcements' });
  }
});

// POST /api/announcements (Admin only)
announcementsRouter.post('/', (req, res) => {
  try {
    const { title, message, priority, center_id } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    let centerName = 'All Procurement Centers';
    if (center_id) {
      const c = store.findCenterById(center_id);
      if (c) centerName = c.center_name;
    }

    const newAnnouncement: Announcement = {
      id: 'm' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      message: message.trim(),
      priority: priority || 'Normal',
      announcement_date: new Date().toISOString().split('T')[0],
      center_id: center_id || null,
      center_name: centerName,
      created_at: new Date().toISOString()
    };

    store.addAnnouncement(newAnnouncement);
    return res.status(201).json({
      success: true,
      message: 'Announcement broadcasted successfully!',
      announcement: newAnnouncement
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// DELETE /api/announcements/:id (Admin only)
announcementsRouter.delete('/:id', (req, res) => {
  const deleted = store.deleteAnnouncement(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Announcement not found' });
  }
  return res.json({ success: true, message: 'Announcement deleted.' });
});
