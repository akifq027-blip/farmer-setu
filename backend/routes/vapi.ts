import { Router, Request, Response } from 'express';
import { store } from '../store.js';

export const vapiRouter = Router();

// Direct Fair-Trade Benchmark Rates vs Traditional Mandi Exploitation (₹ / Quintal)
const DIRECT_FAIR_RATES: Record<string, { direct_fair_price: number; traditional_mandi_net_after_cuts: number; farmer_gain_per_quintal: number; moisture_limit: string; direct_buyers: string }> = {
  'Wheat': { direct_fair_price: 2275, traditional_mandi_net_after_cuts: 1930, farmer_gain_per_quintal: 345, moisture_limit: 'Below 12%', direct_buyers: 'Flour Mills & Food Cooperatives' },
  'Paddy (Grade A)': { direct_fair_price: 2320, traditional_mandi_net_after_cuts: 1970, farmer_gain_per_quintal: 350, moisture_limit: 'Below 14%', direct_buyers: 'State Rice Millers & Retail Aggregators' },
  'Paddy': { direct_fair_price: 2300, traditional_mandi_net_after_cuts: 1955, farmer_gain_per_quintal: 345, moisture_limit: 'Below 14%', direct_buyers: 'Direct Rice Processors' },
  'Mustard / Sarson': { direct_fair_price: 5650, traditional_mandi_net_after_cuts: 4800, farmer_gain_per_quintal: 850, moisture_limit: 'Below 8%', direct_buyers: 'Oil Extraction Cooperatives' },
  'Mustard': { direct_fair_price: 5650, traditional_mandi_net_after_cuts: 4800, farmer_gain_per_quintal: 850, moisture_limit: 'Below 8%', direct_buyers: 'Oil Extraction Cooperatives' },
  'Cotton / Kapas': { direct_fair_price: 7121, traditional_mandi_net_after_cuts: 6050, farmer_gain_per_quintal: 1071, moisture_limit: 'Below 8-12%', direct_buyers: 'Textile Mills Collective' },
  'Cotton': { direct_fair_price: 7121, traditional_mandi_net_after_cuts: 6050, farmer_gain_per_quintal: 1071, moisture_limit: 'Below 8-12%', direct_buyers: 'Textile Mills Collective' },
  'Gram / Chana': { direct_fair_price: 5440, traditional_mandi_net_after_cuts: 4620, farmer_gain_per_quintal: 820, moisture_limit: 'Below 10%', direct_buyers: 'Dal Millers Federation' },
  'Chana': { direct_fair_price: 5440, traditional_mandi_net_after_cuts: 4620, farmer_gain_per_quintal: 820, moisture_limit: 'Below 10%', direct_buyers: 'Dal Millers Federation' },
  'Soyabean': { direct_fair_price: 4892, traditional_mandi_net_after_cuts: 4150, farmer_gain_per_quintal: 742, moisture_limit: 'Below 12%', direct_buyers: 'Solvent Extraction Units' },
  'Maize / Makka': { direct_fair_price: 2090, traditional_mandi_net_after_cuts: 1775, farmer_gain_per_quintal: 315, moisture_limit: 'Below 14%', direct_buyers: 'Feed & Starch Manufacturers' },
  'Maize': { direct_fair_price: 2090, traditional_mandi_net_after_cuts: 1775, farmer_gain_per_quintal: 315, moisture_limit: 'Below 14%', direct_buyers: 'Feed & Starch Manufacturers' },
  'Groundnut': { direct_fair_price: 6377, traditional_mandi_net_after_cuts: 5420, farmer_gain_per_quintal: 957, moisture_limit: 'Below 8%', direct_buyers: 'Confectionery & Oil Mills' }
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
      const qty = Number(match.quantity_quintals) || 0;
      const commissionSaved = Math.round(qty * 2300 * 0.15);
      return {
        found: true,
        token: match.token_number,
        farmer_name: match.farmer_name,
        crop: match.crop_name,
        quantity_quintals: match.quantity_quintals,
        status: match.status,
        fpo_aggregation_hub: match.center_name,
        matched_buyer: 'National Institutional Grain Aggregator (0% Brokerage)',
        middleman_commission_saved: `₹${commissionSaved.toLocaleString('en-IN')}`,
        queue_position: match.queue_position,
        estimated_waiting_minutes: match.estimated_waiting_minutes,
        dispatch_date: match.preferred_date,
        payment_status: match.payment_status || 'Direct Bank Escrow'
      };
    }
    return {
      found: false,
      message: `Direct Deal Token ${token || 'unspecified'} not found in FPO trade database.`
    };
  }

  if (name === 'get_msp_crop_rates' || name === 'get_direct_fair_rates') {
    const cropQuery = String(args.cropName || args.crop || '').trim().toLowerCase();
    if (cropQuery) {
      const matchedKey = Object.keys(DIRECT_FAIR_RATES).find(k => k.toLowerCase().includes(cropQuery));
      return matchedKey ? { [matchedKey]: DIRECT_FAIR_RATES[matchedKey] } : { rates: DIRECT_FAIR_RATES };
    }
    return {
      message: 'KisanSetu Direct Fair Prices vs Traditional Mandi Net Realization',
      rates: DIRECT_FAIR_RATES
    };
  }

  if (name === 'get_procurement_centers' || name === 'get_fpo_hubs') {
    const district = String(args.district || '').trim().toLowerCase();
    let centers = store.getCenters();
    if (district) {
      centers = centers.filter(c => c.district.toLowerCase().includes(district));
    }
    return {
      fpo_aggregation_hubs: centers.map(c => ({
        hub_name: c.center_name,
        district: c.district,
        state: c.state,
        crops_handled: c.crops_accepted,
        timings: `${c.opening_time} to ${c.closing_time}`,
        coordinator_contact: c.contact_number,
        status: c.status
      })).slice(0, 6)
    };
  }

  if (name === 'get_procurement_schedules' || name === 'get_harvest_demands') {
    const crop = String(args.cropName || args.crop || '').trim().toLowerCase();
    let scheds = store.getSchedules();
    if (crop) {
      scheds = scheds.filter(s => s.crop_name.toLowerCase().includes(crop));
    }
    return {
      buyer_pre_orders: scheds.map(s => ({
        crop: s.crop_name,
        date: s.procurement_date,
        operating_hours: `${s.start_time} - ${s.end_time}`,
        open_quota_quintals: s.remaining_slots,
        status: s.status
      })).slice(0, 6)
    };
  }

  if (name === 'get_latest_announcements') {
    const anns = store.getAnnouncements();
    return {
      direct_buyer_demands: anns.slice(0, 4).map(a => ({
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
      direct_orders: reqs.slice(0, 5).map(r => ({
        deal_token: r.token_number,
        farmer: r.farmer_name,
        crop: r.crop_name,
        status: r.status,
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
