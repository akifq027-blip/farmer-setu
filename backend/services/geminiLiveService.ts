import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { store } from '../store.js';

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

export function setupGeminiLiveWebSocket(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/api/live-ws'
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    let liveSession: any = null;
    let isLiveActive = false;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    const safeSend = (payload: any) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(payload));
        } catch (err) {
          console.warn('Failed to send WebSocket message to client:', err);
        }
      }
    };

    if (!apiKey) {
      safeSend({
        type: 'status',
        state: 'ready',
        mode: 'smart_voice',
        message: 'Kisan Mitr ready (Smart Voice mode)'
      });
    } else {
      safeSend({
        type: 'status',
        state: 'connecting',
        mode: 'gemini_live',
        message: 'Connecting to Kisan Mitr real-time voice...'
      });

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        // System prompt for Kisan Mitr Live Voice
        const systemInstruction = `
You are "Kisan Mitr" (किसान मित्र / రైతు మిత్ర), an expert, warm, respectful, and helpful digital assistant for farmers on the KisanSetu procurement portal.

BRAND IDENTITY (STRICT MANDATORY RULE):
- Your name is exclusively "Kisan Mitr".
- NEVER mention or say "Gemini", "Google", "ChatGPT", "OpenAI", or any other underlying AI system.
- Always present yourself purely as Kisan Mitr.

LANGUAGES:
- Understand and speak naturally in Hindi, Telugu, English, or mixed farmer language (Hinglish/rural dialect).
- If the farmer speaks Telugu, reply in warm, natural Telugu.
- If the farmer speaks Hindi, reply in respectful, simple Hindi.
- If the farmer speaks English, reply in friendly, clear English.

SPEAKING STYLE:
- Warm, respectful, farmer-friendly, clear, and professional.
- Keep spoken sentences short and easy to understand when listening aloud.
- Use natural pauses with commas and periods.
- Avoid robotic or legalistic jargon. Avoid repetitive filler phrases like "Sure!", "Certainly!", "Of course!".
- Give step-by-step guidance in 2-3 short sequential steps.

GROUND TRUTH & TOOLS (STRICT ZERO-FABRICATION):
- You have tools to check real database records:
  * get_token_status: Check real token numbers, queue position, crop, and status.
  * get_msp_crop_rates: Get official government MSP rates in ₹ per quintal and moisture limits.
  * get_procurement_centers: Find procurement centers, addresses, operational hours, and contact numbers.
  * get_procurement_schedules: Find procurement dates, remaining slots, and crop availability.
- When asked about specific tokens, centers, schedules, or rates, call the appropriate tool.
- NEVER fabricate, invent, or guess token numbers, queue positions, appointment dates, center availability, or payment status. If a token or record is not found, clearly tell the farmer that the record was not found.
`;

        const functionDeclarations = [
          {
            name: 'get_token_status',
            description: 'Get real-time procurement token details, queue position, estimated wait time, crop and status for a given token number.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                tokenNumber: {
                  type: Type.STRING,
                  description: 'The farmer token number, e.g. A-104 or TS-204.'
                }
              },
              required: ['tokenNumber']
            }
          },
          {
            name: 'get_msp_crop_rates',
            description: 'Get current official government Minimum Support Price (MSP) benchmark rates in ₹ per quintal and moisture limits for crops.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                cropName: {
                  type: Type.STRING,
                  description: 'Optional crop name like Wheat, Paddy, Mustard, Cotton.'
                }
              }
            }
          },
          {
            name: 'get_procurement_centers',
            description: 'Get list of government procurement centers, district locations, daily capacity, timings, and contact numbers.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                district: {
                  type: Type.STRING,
                  description: 'Optional district name to filter centers.'
                }
              }
            }
          },
          {
            name: 'get_procurement_schedules',
            description: 'Get available dates, remaining slots, and crops being purchased at procurement centers.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                cropName: {
                  type: Type.STRING,
                  description: 'Optional crop name.'
                }
              }
            }
          },
          {
            name: 'get_latest_announcements',
            description: 'Get recent official government announcements, procurement circulars, bonus updates, and weather advisories for farmers.',
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: 'get_farmer_requests',
            description: 'Lookup procurement tokens and request history for a farmer using their phone number or name.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                searchQuery: {
                  type: Type.STRING,
                  description: 'Farmer mobile number or name to search.'
                }
              },
              required: ['searchQuery']
            }
          }
        ];

        liveSession = await ai.live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction,
            tools: [{ functionDeclarations }]
          },
          callbacks: {
            onopen: () => {
              isLiveActive = true;
              safeSend({
                type: 'status',
                state: 'ready',
                mode: 'gemini_live',
                message: 'Kisan Mitr Live Voice connected'
              });
            },
            onmessage: async (message: LiveServerMessage) => {
              // 1. Audio and text parts from model turn
              if (message.serverContent?.modelTurn?.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    safeSend({ type: 'audio', audio: part.inlineData.data });
                  }
                  if (part.text) {
                    safeSend({ type: 'transcript', text: part.text });
                  }
                }
              }

              // 2. Interruption signal (user spoke while model was speaking)
              if (message.serverContent?.interrupted) {
                safeSend({ type: 'interrupted' });
              }

              // 3. Turn completion signal
              if (message.serverContent?.turnComplete) {
                safeSend({ type: 'turnComplete' });
              }

              // 4. Function calls from model
              if (message.toolCall) {
                safeSend({ type: 'thinking', detail: 'Checking live procurement database...' });
                const responses: any[] = [];

                for (const call of message.toolCall.functionCalls) {
                  let toolResult: any = {};
                  const callArgs: any = call.args || {};

                  if (call.name === 'get_token_status') {
                    const token = String(callArgs.tokenNumber || '').trim().toUpperCase();
                    const reqs = store.getRequests();
                    const match = reqs.find(r => 
                      r.token_number.toUpperCase().replace(/\s+/g, '') === token.replace(/\s+/g, '') ||
                      r.token_number.toUpperCase().replace('-', '') === token.replace('-', '')
                    );
                    toolResult = match ? {
                      found: true,
                      token: match.token_number,
                      farmer: match.farmer_name,
                      crop: match.crop_name,
                      quantity_quintals: match.quantity_quintals,
                      status: match.status,
                      queue_position: match.queue_position,
                      estimated_wait_minutes: match.estimated_waiting_minutes,
                      center: match.center_name,
                      scheduled_date: match.preferred_date,
                      payment_status: match.payment_status
                    } : { found: false, message: `Token ${token} not found in database.` };
                  } else if (call.name === 'get_msp_crop_rates') {
                    const cropQuery = String(callArgs.cropName || '').trim().toLowerCase();
                    if (cropQuery) {
                      const matchedKey = Object.keys(MSP_RATES).find(k => k.toLowerCase().includes(cropQuery));
                      toolResult = matchedKey ? { [matchedKey]: MSP_RATES[matchedKey] } : { rates: MSP_RATES };
                    } else {
                      toolResult = { rates: MSP_RATES };
                    }
                  } else if (call.name === 'get_procurement_centers') {
                    const district = String(callArgs.district || '').trim().toLowerCase();
                    let centers = store.getCenters();
                    if (district) {
                      centers = centers.filter(c => c.district.toLowerCase().includes(district));
                    }
                    toolResult = {
                      centers: centers.map(c => ({
                        name: c.center_name,
                        district: c.district,
                        state: c.state,
                        crops: c.crops_accepted,
                        timings: `${c.opening_time} to ${c.closing_time}`,
                        contact: c.contact_number,
                        status: c.status
                      })).slice(0, 6)
                    };
                  } else if (call.name === 'get_procurement_schedules') {
                    const crop = String(callArgs.cropName || '').trim().toLowerCase();
                    let scheds = store.getSchedules();
                    if (crop) {
                      scheds = scheds.filter(s => s.crop_name.toLowerCase().includes(crop));
                    }
                    toolResult = {
                      schedules: scheds.map(s => ({
                        crop: s.crop_name,
                        date: s.procurement_date,
                        time: `${s.start_time} - ${s.end_time}`,
                        remaining_slots: s.remaining_slots,
                        status: s.status
                      })).slice(0, 6)
                    };
                  } else if (call.name === 'get_latest_announcements') {
                    const anns = store.getAnnouncements();
                    toolResult = {
                      announcements: anns.slice(0, 4).map(a => ({
                        title: a.title,
                        priority: a.priority,
                        message: a.message,
                        date: a.announcement_date
                      }))
                    };
                  } else if (call.name === 'get_farmer_requests') {
                    const query = String(callArgs.searchQuery || '').trim().toLowerCase();
                    const reqs = store.getRequests().filter(r => 
                      r.farmer_name.toLowerCase().includes(query) ||
                      (r.farmer_mobile && r.farmer_mobile.includes(query)) ||
                      r.token_number.toLowerCase().includes(query)
                    );
                    toolResult = {
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

                  responses.push({
                    id: call.id,
                    name: call.name,
                    response: toolResult
                  });
                }

                try {
                  liveSession.sendToolResponse({ functionResponses: responses });
                } catch (toolErr) {
                  console.error('Error sending tool response to Gemini Live:', toolErr);
                }
              }
            },
            onerror: (err: any) => {
              console.warn('Gemini Live session notice:', err?.message || err);
              safeSend({
                type: 'status',
                state: 'ready',
                mode: 'smart_voice',
                message: 'Switched to Kisan Mitr Smart Voice mode'
              });
            },
            onclose: () => {
              isLiveActive = false;
              safeSend({ type: 'status', state: 'disconnected', message: 'Live session closed' });
            }
          }
        });

      } catch (liveErr: any) {
        console.warn('Could not establish Gemini Live session, falling back gracefully:', liveErr?.message || liveErr);
        isLiveActive = false;
        safeSend({
          type: 'status',
          state: 'ready',
          mode: 'smart_voice',
          message: 'Kisan Mitr ready (Smart Voice mode)'
        });
      }
    }

    // Handle messages coming from the browser client
    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());

        // 1. Audio stream from microphone (PCM 16kHz)
        if (msg.type === 'audio' && msg.audio) {
          if (isLiveActive && liveSession) {
            try {
              liveSession.sendRealtimeInput({
                audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
              });
            } catch (sendErr) {
              console.warn('Error streaming audio chunk to Gemini Live:', sendErr);
            }
          }
        }

        // 2. Text input from user
        if (msg.type === 'text' && msg.text) {
          if (isLiveActive && liveSession) {
            try {
              liveSession.sendRealtimeInput({ text: msg.text });
            } catch (err) {
              console.warn('Error sending text to Gemini Live:', err);
            }
          }
        }

        // 3. User barge-in / interrupt signal
        if (msg.type === 'interrupt') {
          safeSend({ type: 'interrupted' });
        }

      } catch (parseErr) {
        console.warn('WebSocket message parse error:', parseErr);
      }
    });

    clientWs.on('close', () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch (e) {}
      }
    });

    clientWs.on('error', (err) => {
      console.warn('Client WebSocket error:', err.message);
    });
  });

  console.log('🎙️ Kisan Mitr Gemini Live WebSocket server initialized on /api/live-ws');
}
