import { Router, Request, Response } from 'express';
import { store } from '../store.js';

export const vapiRouter = Router();

// Official MSP Benchmark Rates for Agricultural Procurement (₹ / Quintal)
const MSP_RATES: Record<string, { msp: number; season: string; quality_standard: string; moisture_limit: string }> = {
  'Wheat': { msp: 2275, season: 'Rabi', quality_standard: 'FAQ (Fair Average Quality)', moisture_limit: 'Below 12%' },
  'Paddy (Common)': { msp: 2300, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 17%' },
  'Paddy (Grade A)': { msp: 2320, season: 'Kharif', quality_standard: 'FAQ Grade A', moisture_limit: 'Below 17%' },
  'Paddy': { msp: 2300, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 17%' },
  'Mustard / Sarson': { msp: 5650, season: 'Rabi', quality_standard: 'FAQ', moisture_limit: 'Below 8%' },
  'Mustard': { msp: 5650, season: 'Rabi', quality_standard: 'FAQ', moisture_limit: 'Below 8%' },
  'Cotton / Kapas': { msp: 7121, season: 'Kharif', quality_standard: 'Medium/Long Staple', moisture_limit: 'Below 8-12%' },
  'Cotton': { msp: 7121, season: 'Kharif', quality_standard: 'Medium/Long Staple', moisture_limit: 'Below 8-12%' },
  'Gram / Chana': { msp: 5440, season: 'Rabi', quality_standard: 'FAQ', moisture_limit: 'Below 10%' },
  'Chana': { msp: 5440, season: 'Rabi', quality_standard: 'FAQ', moisture_limit: 'Below 10%' },
  'Soyabean': { msp: 4892, season: 'Kharif', quality_standard: 'FAQ (Yellow)', moisture_limit: 'Below 12%' },
  'Maize / Makka': { msp: 2090, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 14%' },
  'Maize': { msp: 2090, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 14%' },
  'Moong': { msp: 8558, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 12%' },
  'Groundnut / Mungfali': { msp: 6377, season: 'Kharif', quality_standard: 'FAQ in Pods', moisture_limit: 'Below 8%' },
  'Groundnut': { msp: 6377, season: 'Kharif', quality_standard: 'FAQ in Pods', moisture_limit: 'Below 8%' },
  'Sunflower': { msp: 6760, season: 'Kharif', quality_standard: 'FAQ', moisture_limit: 'Below 9%' }
};

// GET /api/vapi/config - Public credentials for frontend Vapi Web SDK
vapiRouter.get('/config', (req: Request, res: Response) => {
  const publicKey = process.env.VITE_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || 'fa84c428-a843-48bb-9cb0-5c542592b178';
  const assistantId = process.env.VITE_VAPI_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID || '3cecc13e-8776-4723-a10b-213416d7b12d';

  res.json({
    success: true,
    publicKey: publicKey.trim(),
    assistantId: assistantId.trim()
  });
});

// Tool execution helper
function executeVapiTool(name: string, args: Record<string, any>): any {
  if (name === 'get_token_status') {
    const token = String(args.tokenNumber || args.token || '').trim().toUpperCase();
    const reqs = store.getRequests();
    const match = reqs.find(r => 
      r.token_number.toUpperCase().replace(/\s+/g, '') === token.replace(/\s+/g, '') ||
      r.token_number.toUpperCase().replace('-', '') === token.replace('-', '')
    );
    if (match) {
      return {
        found: true,
        token: match.token_number,
        farmer_name: match.farmer_name,
        crop: match.crop_name,
        quantity_quintals: match.quantity_quintals,
        status: match.status,
        queue_position: match.queue_position,
        estimated_waiting_minutes: match.estimated_waiting_minutes,
        center: match.center_name,
        preferred_date: match.preferred_date,
        payment_status: match.payment_status
      };
    }
    return {
      found: false,
      message: `Token ${token || 'unspecified'} not found in government procurement database.`
    };
  }

  if (name === 'get_msp_crop_rates') {
    const cropQuery = String(args.cropName || args.crop || '').trim().toLowerCase();
    if (cropQuery) {
      const matchedKey = Object.keys(MSP_RATES).find(k => k.toLowerCase().includes(cropQuery));
      return matchedKey ? { [matchedKey]: MSP_RATES[matchedKey] } : { rates: MSP_RATES };
    }
    return { rates: MSP_RATES };
  }

  if (name === 'get_procurement_centers') {
    const district = String(args.district || '').trim().toLowerCase();
    let centers = store.getCenters();
    if (district) {
      centers = centers.filter(c => c.district.toLowerCase().includes(district));
    }
    return {
      centers: centers.map(c => ({
        name: c.center_name,
        district: c.district,
        state: c.state,
        crops_accepted: c.crops_accepted,
        timings: `${c.opening_time} to ${c.closing_time}`,
        contact: c.contact_number,
        status: c.status
      })).slice(0, 6)
    };
  }

  if (name === 'get_procurement_schedules') {
    const crop = String(args.cropName || args.crop || '').trim().toLowerCase();
    let scheds = store.getSchedules();
    if (crop) {
      scheds = scheds.filter(s => s.crop_name.toLowerCase().includes(crop));
    }
    return {
      schedules: scheds.map(s => ({
        crop: s.crop_name,
        date: s.procurement_date,
        time: `${s.start_time} - ${s.end_time}`,
        remaining_slots: s.remaining_slots,
        status: s.status
      })).slice(0, 6)
    };
  }

  if (name === 'get_latest_announcements') {
    const anns = store.getAnnouncements();
    return {
      announcements: anns.slice(0, 4).map(a => ({
        title: a.title,
        priority: a.priority,
        message: a.message,
        date: a.announcement_date
      }))
    };
  }

  if (name === 'get_farmer_requests') {
    const query = String(args.searchQuery || args.phone || args.mobile || args.name || '').trim().toLowerCase();
    const reqs = store.getRequests().filter(r => 
      r.farmer_name.toLowerCase().includes(query) ||
      (r.farmer_mobile && r.farmer_mobile.includes(query)) ||
      r.token_number.toLowerCase().includes(query)
    );
    return {
      requests: reqs.slice(0, 5).map(r => ({
        token: r.token_number,
        farmer: r.farmer_name,
        crop: r.crop_name,
        status: r.status,
        queue_position: r.queue_position,
        date: r.preferred_date
      }))
    };
  }

  return { message: `Function ${name} not recognized.` };
}

// POST /api/vapi/webhook - Handles Vapi Server Tool Calls / Function Calls
vapiRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    const message = payload.message || {};

    // 1. Tool-calls format (Vapi standard)
    if (message.type === 'tool-calls' && Array.isArray(message.toolCalls)) {
      const results = message.toolCalls.map((tc: any) => {
        const funcName = tc.function?.name || '';
        let funcArgs: any = {};
        try {
          funcArgs = typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : (tc.function?.arguments || {});
        } catch (e) {
          funcArgs = {};
        }

        const resultData = executeVapiTool(funcName, funcArgs);
        return {
          toolCallId: tc.id,
          result: JSON.stringify(resultData)
        };
      });

      return res.json({ results });
    }

    // 2. Legacy function-call format
    if (message.type === 'function-call' && message.functionCall) {
      const funcName = message.functionCall.name || '';
      const funcArgs = message.functionCall.parameters || {};
      const resultData = executeVapiTool(funcName, funcArgs);
      return res.json({ result: JSON.stringify(resultData) });
    }

    // Fallback response for other webhook events
    return res.json({ success: true, message: 'Webhook event received.' });
  } catch (err: any) {
    console.error('Vapi webhook error:', err);
    return res.status(500).json({ error: err.message || 'Internal tool error' });
  }
});

// Alias for direct tool invocation
vapiRouter.post('/tools', (req: Request, res: Response) => {
  const { name, args } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Tool name required.' });
  }
  const result = executeVapiTool(name, args || {});
  return res.json({ result });
});
