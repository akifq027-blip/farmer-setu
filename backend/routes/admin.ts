import { Router } from 'express';
import { store, RequestStatus } from '../store.js';

export const adminRouter = Router();

// GET /api/admin/stats
adminRouter.get('/stats', (req, res) => {
  try {
    const farmers = store.getFarmers();
    const requests = store.getRequests();
    const centers = store.getCenters();
    const schedules = store.getSchedules();

    const today = new Date().toISOString().split('T')[0];

    const todayRequests = requests.filter(r => r.preferred_date === today);
    const pending = requests.filter(r => r.status === 'Request Submitted' || r.status === 'Token Assigned');
    const scheduled = requests.filter(r => r.status === 'Scheduled');
    const inQueue = requests.filter(r => r.status === 'In Queue');
    const processing = requests.filter(r => r.status === 'Processing');
    const completed = requests.filter(r => r.status === 'Completed');

    const totalQuintalsProcured = completed.reduce(
      (sum, r) => sum + (Number(r.quantity_quintals) || 0),
      0
    );

    const totalAvailableSlots = schedules.reduce(
      (sum, s) => sum + (Number(s.remaining_slots) || 0),
      0
    );

    return res.json({
      success: true,
      stats: {
        totalFarmers: farmers.length,
        totalRequests: requests.length,
        todayRequestsCount: todayRequests.length,
        pendingCount: pending.length,
        scheduledCount: scheduled.length,
        inQueueCount: inQueue.length,
        processingCount: processing.length,
        completedCount: completed.length,
        totalQuintalsProcured: totalQuintalsProcured.toFixed(2),
        totalCenters: centers.length,
        totalAvailableSlots
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats' });
  }
});

// POST /api/admin/advance-status (Advance request to next lifecycle stage)
adminRouter.post('/advance-status', (req, res) => {
  try {
    const { requestId } = req.body;
    const request = store.findRequestById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const flow: RequestStatus[] = [
      'Request Submitted',
      'Token Assigned',
      'Scheduled',
      'In Queue',
      'Processing',
      'Completed'
    ];

    const currentIndex = flow.indexOf(request.status);
    if (currentIndex === -1 || currentIndex >= flow.length - 1) {
      return res.status(400).json({
        success: false,
        message: `Request is already in final state: ${request.status}`
      });
    }

    const nextStatus = flow[currentIndex + 1];
    const updates: any = { status: nextStatus };

    if (nextStatus === 'In Queue' && !request.gate_entry_time) {
      updates.gate_entry_time = new Date().toISOString();
      updates.admin_notes = (request.admin_notes ? request.admin_notes + ' | ' : '') + 'Gate entry verified.';
    } else if (nextStatus === 'Processing') {
      updates.admin_notes = (request.admin_notes ? request.admin_notes + ' | ' : '') + 'Weighment & quality sampling ongoing.';
    } else if (nextStatus === 'Completed') {
      updates.weighment_completed_time = new Date().toISOString();
      updates.payment_status = 'Credited via DBT';
      updates.admin_notes = (request.admin_notes ? request.admin_notes + ' | ' : '') + 'Procurement completed. DBT payment initiated.';
    }

    const updated = store.updateRequest(requestId, updates);
    return res.json({
      success: true,
      message: `Request advanced to: ${nextStatus}`,
      request: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to advance status' });
  }
});

// POST /api/admin/call-next (Call the next farmer in queue for a center)
adminRouter.post('/call-next', (req, res) => {
  try {
    const { center_id } = req.body;
    const center = center_id ? store.findCenterById(center_id) : store.getCenters()[0];
    const targetCenterId = center ? center.id : store.getCenters()[0].id;

    // Find currently processing request to mark as completed (if any)
    const currentlyProcessing = store.getRequests().find(
      r => r.center_id === targetCenterId && r.status === 'Processing'
    );
    if (currentlyProcessing) {
      store.updateRequest(currentlyProcessing.id, {
        status: 'Completed',
        payment_status: 'Credited via DBT',
        weighment_completed_time: new Date().toISOString(),
        admin_notes: (currentlyProcessing.admin_notes || '') + ' | Weighment completed successfully.'
      });
    }

    // Find first 'In Queue' item
    const nextInQueue = store.getRequests()
      .filter(r => r.center_id === targetCenterId && r.status === 'In Queue')
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0];

    if (!nextInQueue) {
      return res.json({
        success: true,
        message: 'No more farmers currently waiting in queue for this center.',
        activeToken: null
      });
    }

    // Promote to 'Processing'
    const updated = store.updateRequest(nextInQueue.id, {
      status: 'Processing',
      admin_notes: (nextInQueue.admin_notes || '') + ' | Called to weighbridge counter.'
    });

    return res.json({
      success: true,
      message: `Token #${updated?.token_number} (${updated?.farmer_name}) called to weighbridge!`,
      activeToken: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to call next token' });
  }
});

// POST /api/admin/reset-demo-data (Reset demo data for clean evaluation)
adminRouter.post('/reset-demo-data', (req, res) => {
  try {
    const data = store.resetToDefaults();
    return res.json({
      success: true,
      message: 'Demo dataset restored to initial realistic values.',
      stats: {
        farmersCount: data.farmers.length,
        centersCount: data.procurement_centers.length,
        schedulesCount: data.procurement_schedules.length,
        requestsCount: data.procurement_requests.length,
        announcementsCount: data.announcements.length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset demo data' });
  }
});
