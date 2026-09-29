import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { store } from '../store.js';

export const geminiVoiceRouter = Router();

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

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

// GET /api/gemini/models - List supported AI models
geminiVoiceRouter.get('/models', (req, res) => {
  res.json({
    success: true,
    models: [
      {
        id: 'kisan-mitr',
        name: 'Kisan Mitr',
        engine: 'kisan',
        provider: 'KisanSetu Support',
        badge: 'Official Farmer Support',
        description: 'Warm, respectful, farmer-friendly assistant supporting Hindi, Telugu, and English.',
        isAvailable: true,
        isDefault: true
      }
    ],
    activeDefault: 'kisan-mitr'
  });
});

// POST /api/gemini/voice-assistant - Multi-model conversational AI endpoint
geminiVoiceRouter.post('/voice-assistant', async (req, res) => {
  try {
    const { 
      query, 
      language = 'auto', 
      farmerId, 
      tokenNumber, 
      selectedModel = 'gemini-3.7-flash',
      history = []
    } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Spoken query is required'
      });
    }

    const cleanQuery = query.trim();

    // 1. Gather live backend state
    const allCenters = store.getCenters();
    const allSchedules = store.getSchedules();
    const allAnnouncements = store.getAnnouncements();
    const allRequests = store.getRequests();

    // Find specific token if mentioned in query or params
    let matchedTokenInfo: any = null;
    const tokenRegexMatch = cleanQuery.match(/\b([A-Za-z]-?\d{1,5})\b/i);
    const lookupToken = tokenNumber || (tokenRegexMatch ? tokenRegexMatch[1].toUpperCase() : null);

    if (lookupToken) {
      const normalizedToken = lookupToken.replace(/\s+/g, '').toUpperCase();
      matchedTokenInfo = allRequests.find(r => 
        r.token_number.toUpperCase().replace(/\s+/g, '') === normalizedToken ||
        r.token_number.toUpperCase().replace('-', '') === normalizedToken.replace('-', '')
      );
    }

    // Prepare ground truth context payload
    const liveContext = {
      currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      procurementCenters: allCenters.map(c => ({
        id: c.id,
        name: c.center_name,
        district: c.district,
        state: c.state,
        crops_accepted: c.crops_accepted,
        timings: `${c.opening_time} to ${c.closing_time}`,
        status: c.status,
        contact: c.contact_number,
        address: c.location,
        daily_capacity: c.daily_capacity_quintals
      })),
      schedules: allSchedules.slice(0, 10).map(s => ({
        crop: s.crop_name,
        center_id: s.center_id,
        date: s.procurement_date,
        time: `${s.start_time} - ${s.end_time}`,
        remaining_slots: s.remaining_slots,
        available_slots: s.available_slots,
        status: s.status
      })),
      recentAnnouncements: allAnnouncements.slice(0, 3).map(a => `${a.title}: ${a.message}`),
      governmentMspRates: MSP_RATES,
      matchedTokenData: matchedTokenInfo ? {
        token: matchedTokenInfo.token_number,
        farmer_name: matchedTokenInfo.farmer_name,
        farmer_phone: matchedTokenInfo.farmer_phone,
        crop: matchedTokenInfo.crop_name,
        quantity: `${matchedTokenInfo.quantity_quintals} Quintals`,
        status: matchedTokenInfo.status,
        center: matchedTokenInfo.center_name,
        queue_position: matchedTokenInfo.queue_position,
        estimated_waiting_minutes: matchedTokenInfo.estimated_waiting_minutes,
        payment_status: matchedTokenInfo.payment_status,
        date: matchedTokenInfo.preferred_date,
        vehicle_number: matchedTokenInfo.vehicle_number
      } : null,
      documentsRequired: [
        'Original Aadhaar Card (for biometric verification at the gate)',
        'Pattadar Passbook / Land Record (Khasra / Khatauni / Adangal copy)',
        'Bank Account Passbook (Aadhaar-seeded for direct DBT payment)',
        'Crop Sowing Certificate / Girdawari receipt'
      ]
    };

    // System prompt for Kisan Mitr Digital Farmer Assistant
    const systemInstruction = `
You are "Kisan Mitr" (किसान मित्र / రైతు మిత్ర), an expert, warm, respectful, and farmer-friendly digital support assistant for the KisanSetu Farmer Procurement Portal.

BRAND IDENTITY (STRICT MANDATORY REQUIREMENT):
- Your name is exclusively "Kisan Mitr".
- NEVER mention or say "Gemini", "Gemini Voice", "Google Gemini", "ChatGPT", "OpenAI", or any other underlying AI system.
- Always present yourself purely as Kisan Mitr, the official farmer procurement assistant for KisanSetu.

VOICE PERSONALITY & SPEAKING STYLE:
- Natural, warm, respectful, patient, helpful, clear, and professional.
- Treat every farmer with deep respect and warmth.
- Never robotic. Never unnecessarily verbose.
- Keep sentences short so the farmer can easily follow when listening to the audio.
- Use natural pauses with commas and periods.
- Avoid repetitive filler openings such as "Sure!", "Certainly!", "Of course!", "According to the procurement management database...". Instead, give direct, farmer-friendly answers.
- For instructions, give at most 3 short, easy sequential steps (e.g. "First, open Book Slot. Then select your crop and preferred date. Finally, confirm to get your instant token.").

LANGUAGE RULES:
- Automatically respond in the EXACT language the farmer speaks:
  * If the farmer speaks or writes in Telugu -> Respond in natural, warm Telugu.
  * If the farmer speaks or writes in Hindi -> Respond in natural, respectful Hindi.
  * If the farmer speaks or writes in English -> Respond in simple, clear English.
- If the language preference is explicitly specified as '${language}', and the farmer's query is language-neutral, use '${language}'.
- If the language is completely unclear, briefly ask which language they prefer (English, Hindi, or Telugu).
- Use simple, natural conversational vocabulary familiar to farmers rather than complicated bureaucratic jargon.

TOPICS & QUESTIONS YOU HANDLE:
- Farmer registration & login on KisanSetu (with mobile number, Aadhaar, land record ID).
- Booking drop-off slots for crops (Paddy, Wheat, Cotton, Mustard, Maize, Soybean, Moong, Groundnut).
- Token numbers & live queue position tracking.
- Procurement schedules, dates, and operational hours.
- Procurement centers list, district locations, and contact phone numbers.
- Required documents (Aadhaar Card, Pattadar Passbook / Land Record copy, Aadhaar-seeded Bank Passbook for direct DBT).
- Official Minimum Support Price (MSP) government rates and moisture limit standards.
- Payment / DBT status (MSP payment credited directly into farmer's bank account via DBT within 48 to 72 hours).
- Important announcements and alerts.
- Portal navigation and step-by-step assistance.

GROUND TRUTH & DATA INTEGRITY (NEVER FABRICATE):
- Quote real facts and numbers ONLY from the LIVE SYSTEM CONTEXT provided.
- NEVER fabricate, invent, or guess token numbers, queue positions, appointment dates, center availability, payment status, or farmer records.
- If a requested token number or record is not found in the live context, clearly and politely inform the farmer that the record was not found and ask them to check their token number or book a new slot.
- For MSP rates and moisture limits, quote the exact numbers from the context.

FORMATTING:
- Plain text only. Do NOT use markdown asterisks (**), hashtags (###), bullet symbols, or code fences, because speech synthesizers read those characters aloud.
`;

    // Detect speech synthesis language code
    let speechLang = 'hi-IN';
    const lowerQuery = cleanQuery.toLowerCase();
    
    // Check Telugu: Telugu script or common words/romanized phrases
    const isTelugu = /[\u0C00-\u0C7F]/.test(cleanQuery) ||
      language === 'te' ||
      /\b(telugu|eppudu|dhara|dharalu|raithu|rythu|panta|vari|godhumalu|ekkada|kendra|kendram|sankhya|patralu|kaavali|chesukovali|slat|namaskaram|cheppandi)\b/i.test(lowerQuery);

    // Check Hindi: Devanagari script or common words/romanized phrases
    const isHindi = /[\u0900-\u097F]/.test(cleanQuery) ||
      language === 'hi' ||
      /\b(kisan|namaste|bhav|gehu|dhan|kaha|kab|mera|kaise|kitna|aaj|mandi|bataye|bhai|sarkari|paisa|khata|kagaz|dastavez|tulayi|tarikh)\b/i.test(lowerQuery);

    // Check English
    const isEnglish = language === 'en' || (!/[\u0900-\u0C7F]/.test(cleanQuery) && !isTelugu && !isHindi && /^[a-zA-Z0-9\s.,?!'-]+$/.test(cleanQuery));

    if (isTelugu) {
      speechLang = 'te-IN';
    } else if (isEnglish) {
      speechLang = 'en-IN';
    } else {
      speechLang = 'hi-IN';
    }

    // Determine Action Type for UI widgets
    let actionType = 'GENERAL_HELP';
    let actionUrl: string | null = null;
    let actionTitle: string | null = null;

    if (matchedTokenInfo) {
      actionType = 'TOKEN_STATUS';
      actionUrl = `/status.html?token=${matchedTokenInfo.token_number}`;
      actionTitle = `टोकन ${matchedTokenInfo.token_number} लाइव स्थिति`;
    } else if (lowerQuery.includes('rate') || lowerQuery.includes('bhav') || lowerQuery.includes('msp') || lowerQuery.includes('भाव') || lowerQuery.includes('ధర') || lowerQuery.includes('price')) {
      actionType = 'MSP_RATES';
      actionUrl = `/schedule.html`;
      actionTitle = 'सभी फसलों के सरकारी भाव (MSP)';
    } else if (lowerQuery.includes('book') || lowerQuery.includes('slot') || lowerQuery.includes('स्लॉट') || lowerQuery.includes('బుక్')) {
      actionType = 'BOOK_SLOT';
      actionUrl = `/request.html`;
      actionTitle = 'फसल बेचने का स्लॉट बुक करें';
    } else if (lowerQuery.includes('document') || lowerQuery.includes('kagas') || lowerQuery.includes('कागज') || lowerQuery.includes('पंजीकरण') || lowerQuery.includes('పత్రాలు')) {
      actionType = 'DOCUMENT_INFO';
      actionUrl = `/help.html`;
      actionTitle = 'जरूरी दस्तावेज व सत्यापन सहायता';
    } else if (lowerQuery.includes('center') || lowerQuery.includes('mandi') || lowerQuery.includes('केंद्र') || lowerQuery.includes('కేంద్రం')) {
      actionType = 'CENTER_INFO';
      actionUrl = `/centers.html`;
      actionTitle = 'नजदीकी सरकारी खरीद केंद्र सूची';
    }

    // Strategy 1: OpenAI ChatGPT (if selected and configured)
    if (selectedModel.includes('chatgpt') && process.env.OPENAI_API_KEY) {
      try {
        const openAIMessages: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemInstruction + `\n\nLIVE SYSTEM CONTEXT:\n${JSON.stringify(liveContext)}` }
        ];

        // Add sanitized history
        if (Array.isArray(history)) {
          for (const msg of history.slice(-6)) {
            if (msg.role && msg.content) {
              openAIMessages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: String(msg.content)
              });
            }
          }
        }

        openAIMessages.push({ role: 'user', content: cleanQuery });

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openAIMessages,
            temperature: 0.3,
            max_tokens: 600
          })
        });

        if (openAiRes.ok) {
          const gptData = await openAiRes.json();
          const gptText = gptData.choices?.[0]?.message?.content?.trim();
          if (gptText) {
            return res.json({
              success: true,
              spokenResponse: cleanSpokenText(gptText),
              markdownResponse: gptText,
              speechLang,
              modelUsed: 'Kisan Mitr',
              modelId: 'kisan-mitr',
              actionType,
              actionUrl,
              actionTitle,
              matchedToken: matchedTokenInfo,
              mspData: MSP_RATES,
              followUpSuggestions: getFollowUpSuggestions(cleanQuery, speechLang.split('-')[0])
            });
          }
        }
      } catch (openAiErr) {
        console.warn('OpenAI request failed, continuing to Gemini/Fallback:', openAiErr);
      }
    }

    // Strategy 2: Google Gemini 3.8 Flash (Primary official engine via @google/genai)
    const ai = getGeminiClient();
    if (ai) {
      try {
        // Construct conversation contents with system instruction and history
        let promptText = `
FARMER'S QUESTION: "${cleanQuery}"
SPOKEN LANGUAGE PREFERENCE: ${speechLang}

LIVE MANDI & PROCUREMENT GROUND TRUTH CONTEXT (DO NOT FABRICATE DATA OUTSIDE THIS):
${JSON.stringify(liveContext, null, 2)}
`;

        // If history is provided, include the recent dialogue context for follow-up continuity
        if (Array.isArray(history) && history.length > 0) {
          const recentHistoryText = history.slice(-6).map(h => `${h.role === 'user' ? 'Farmer' : 'Kisan Mitr'}: ${h.content}`).join('\n');
          promptText = `PREVIOUS CONVERSATION CONTEXT (FOR FOLLOW-UP UNDERSTANDING):\n${recentHistoryText}\n\n` + promptText;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.25
          }
        });

        const geminiText = response.text || '';
        if (geminiText.trim()) {
          return res.json({
            success: true,
            spokenResponse: cleanSpokenText(geminiText),
            markdownResponse: geminiText.trim(),
            speechLang,
            modelUsed: 'Kisan Mitr',
            modelId: 'kisan-mitr',
            actionType,
            actionUrl,
            actionTitle,
            matchedToken: matchedTokenInfo,
            mspData: MSP_RATES,
            followUpSuggestions: getFollowUpSuggestions(cleanQuery, speechLang.split('-')[0])
          });
        }
      } catch (geminiErr: any) {
        console.error('Gemini generateContent error:', geminiErr);
      }
    }

    // Strategy 3: Grounded Intelligent Fallback Engine
    const fallback = generateIntelligentFallback(cleanQuery, speechLang.split('-')[0], matchedTokenInfo, allCenters, allSchedules);
    return res.json({
      success: true,
      spokenResponse: fallback.text,
      markdownResponse: fallback.text,
      speechLang: fallback.lang || speechLang,
      modelUsed: 'Kisan Mitr',
      modelId: 'kisan-mitr',
      actionType,
      actionUrl,
      actionTitle,
      matchedToken: matchedTokenInfo,
      mspData: MSP_RATES,
      followUpSuggestions: getFollowUpSuggestions(cleanQuery, speechLang.split('-')[0])
    });

  } catch (error: any) {
    console.error('Voice Assistant global handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice request',
      error: error.message
    });
  }
});

// GET /api/gemini/quick-voice-prompts
geminiVoiceRouter.get('/quick-voice-prompts', (req, res) => {
  const prompts = [
    {
      id: 'msp',
      icon: '🌾',
      title_hi: 'आज का सरकारी भाव (MSP)',
      title_te: 'ఈరోజు మద్దతు ధరలు (MSP)',
      title_en: "Today's MSP Crop Rates",
      query_hi: 'आज का सरकारी समर्थन मूल्य (MSP) और गेहूं व धान का रेट क्या है?',
      query_te: 'ఈరోజు వరి మరియు గోధుమల ప్రభుత్వ మద్దతు ధరలు ఎంత?',
      query_en: 'What are the current government MSP rates for Wheat, Paddy and Mustard?'
    },
    {
      id: 'token',
      icon: '🎟️',
      title_hi: 'मेरा टोकन व लाइव कतार',
      title_te: 'నా టోకెన్ & లైవ్ క్యూ',
      title_en: 'My Token Queue Status',
      query_hi: 'मेरा टोकन नंबर A-104 का लाइव स्टेटस और कतार में नंबर बताएं',
      query_te: 'నా టోకెన్ A-104 లైవ్ స్టేటస్ చెప్పండి',
      query_en: 'Tell me the live queue position and wait time for Token A-104'
    },
    {
      id: 'slot',
      icon: '📅',
      title_hi: 'फसल बेचने का स्लॉट बुक करें',
      title_te: 'స్లాట్ ఎలా బుక్ చేయాలి?',
      title_en: 'Book Drop-off Slot',
      query_hi: 'फसल बेचने के लिए ऑनलाइन टोकन स्लॉट कैसे बुक करें?',
      query_te: 'ధాన్యం సేకరణ కోసం స్లాట్ ఎలా బుక్ చేయాలి?',
      query_en: 'How do I book a crop procurement drop-off slot online?'
    },
    {
      id: 'documents',
      icon: '📄',
      title_hi: 'मंडी में क्या कागज साथ ले जाएं?',
      title_te: 'కేంద్రానికి ఏ పత్రాలు కావాలి?',
      title_en: 'Required Documents',
      query_hi: 'खरीद केंद्र पर क्या क्या दस्तावेज और कागज साथ ले जाने होंगे?',
      query_te: 'కొనుగోలు కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      query_en: 'What documents do I need to bring to the procurement center?'
    },
    {
      id: 'centers',
      icon: '📍',
      title_hi: 'नजदीकी केंद्र व समय',
      title_te: 'సమీప కేంద్రం & వేళలు',
      title_en: 'Center Timings & Contact',
      query_hi: 'सरकारी खरीद केंद्र का समय क्या है और हेल्पलाइन नंबर क्या है?',
      query_te: 'సమీప కేంద్రం పని వేళలు మరియు ఫోన్ నంబర్ ఏమిటి?',
      query_en: 'What are the procurement center operational hours and helpline contact?'
    },
    {
      id: 'moisture',
      icon: '💧',
      title_hi: 'नमी (Moisture) के सरकारी नियम',
      title_te: 'తేమ శాతం నిబంధనలు',
      title_en: 'Moisture Rules for Crops',
      query_hi: 'गेहूं और धान में नमी कितने प्रतिशत तक स्वीकार की जाती है?',
      query_te: 'వరి మరియు గోధుమలలో తేమ శాతం ఎంత ఉండాలి?',
      query_en: 'What is the maximum allowed moisture percentage for wheat and paddy?'
    }
  ];

  res.json({ success: true, prompts });
});

// Helper: Strip markdown formatting for smooth speech synthesizer playback
function cleanSpokenText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*#_`~]/g, '') // remove markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace markdown links with text
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Provide 2-3 dynamic follow up suggestions based on user query and language
function getFollowUpSuggestions(query: string, lang: string): string[] {
  const q = query.toLowerCase();
  
  if (lang === 'te' || /[\u0C00-\u0C7F]/.test(query)) {
    if (q.includes('rate') || q.includes('ధర') || q.includes('msp')) {
      return ['స్లాట్ ఎలా బుక్ చేయాలి?', 'నా టోకెన్ స్థితి చెప్పండి', 'తేమ శాతం నిబంధనలు ఏమిటి?'];
    }
    if (q.includes('token') || q.includes('టోకెన్')) {
      return ['కేంద్రం సమయం ఏమిటి?', 'ఏ పత్రాలు తీసుకురావాలి?', 'ఈరోజు మద్దతు ధర ఎంత?'];
    }
    return ['ఈరోజు మద్దతు ధర ఎంత?', 'స్లాట్ ఎలా బుక్ చేయాలి?', 'సమీప కేంద్రం ఎక్కడ ఉంది?'];
  }

  if (lang === 'en' || /^[a-zA-Z0-9\s.,?!'-]+$/.test(query)) {
    if (q.includes('rate') || q.includes('price') || q.includes('msp')) {
      return ['How to book a drop-off slot?', 'What documents are required?', 'What is the moisture limit?'];
    }
    if (q.includes('token') || q.includes('status') || q.includes('queue')) {
      return ['Center hours and address', 'When will DBT payment arrive?', "Today's government MSP rate"];
    }
    return ["What is today's MSP rate?", 'How to book a slot?', 'Where is the nearest center?'];
  }

  // Hindi / default
  if (q.includes('rate') || q.includes('bhav') || q.includes('भाव') || q.includes('msp')) {
    return ['फसल बेचने का स्लॉट कैसे बुक करें?', 'मंडी में क्या कागज साथ ले जाएं?', 'गेहूं में नमी का क्या नियम है?'];
  }
  if (q.includes('token') || q.includes('टोकन') || q.includes('status')) {
    return ['मंडी का समय और पता क्या है?', 'पेमेंट सीधे बैंक में कब आएगी?', 'आज का सरकारी भाव क्या है?'];
  }
  if (q.includes('slot') || q.includes('स्लॉट') || q.includes('book')) {
    return ['मंडी में कौन से दस्तावेज चाहिए?', 'आज का गेहूं का भाव क्या है?', 'मेरा टोकन नंबर चेक करें'];
  }

  return ['आज का सरकारी भाव (MSP) क्या है?', 'मेरा टोकन नंबर चेक करें', 'फसल बेचने का स्लॉट कैसे बुक करें?'];
}

function generateIntelligentFallback(
  query: string,
  lang: string,
  tokenInfo: any,
  centers: any[],
  schedules: any[]
): { text: string; lang: string } {
  const q = query.toLowerCase();

  // Telugu language
  if (lang === 'te' || /[\u0C00-\u0C7F]/.test(query) || q.includes('telugu') || q.includes('dharalu') || q.includes('mariyu')) {
    if (tokenInfo) {
      return {
        text: `నమస్కారం రైతు సోదరా. మీ టోకెన్ నంబర్ ${tokenInfo.token_number}. పంట ${tokenInfo.crop_name}, పరిమాణం ${tokenInfo.quantity_quintals} క్వింటాళ్లు. ప్రస్తుత స్థితి: ${tokenInfo.status}. మీ ముందు ${tokenInfo.queue_position} మంది రైతులు ఉన్నారు. వేచి ఉండే సమయం సుమారు ${tokenInfo.estimated_waiting_minutes} నిమిషాలు. కొనుగోలు కేంద్రం: ${tokenInfo.center_name}.`,
        lang: 'te-IN'
      };
    } else if (q.includes('token') || q.includes('టోకెన్')) {
      return {
        text: 'నమస్కారం రైతు సోదరా. మీరు పేర్కొన్న టోకెన్ వివరాలు రికార్డులో లభించలేదు. దయచేసి మీ టోకెన్ నంబర్ సరిచూసుకోండి లేదా కొత్త స్లాట్ బుక్ చేసుకోండి.',
        lang: 'te-IN'
      };
    }
    if (q.includes('rate') || q.includes('ధర') || q.includes('msp') || q.includes('వరి') || q.includes('గోధుమ')) {
      return {
        text: 'ఈరోజు ప్రభుత్వ మద్దతు ధరలు: వరి సాధారణం క్వింటాలుకు ₹2,300, వరి గ్రేడ్-ఎ ₹2,320, గోధుమలు ₹2,275, ఆవాలు ₹5,650, మరియు పత్తి ₹7,121. ధాన్యంలో తేమ 17 శాతానికి తక్కువగా ఉండేలా చూసుకోండి.',
        lang: 'te-IN'
      };
    }
    if (q.includes('పత్రాలు') || q.includes('కాగితాలు') || q.includes('document')) {
      return {
        text: 'కేంద్రానికి వచ్చేటప్పుడు 3 ముఖ్యమైన పత్రాలు తీసుకురండి: 1. ఒరిజినల్ ఆధార్ కార్డు, 2. పట్టాదారు పాస్‌బుక్ లేదా అడంగల్ రికార్డు, 3. ఆధార్ లింక్ అయిన బ్యాంక్ పాస్‌బుక్ కాపీ.',
        lang: 'te-IN'
      };
    }
    if (q.includes('slot') || q.includes('బుక్') || q.includes('book')) {
      return {
        text: 'పంట అమ్మకానికి స్లాట్ బుక్ చేయడం చాలా సులభం. హోమ్ పేజీలో బుక్ స్లాట్ ఎంచుకోండి, పంట మరియు తేదీని ఎంచుకోండి, మీ వాహనం నంబర్ నమోదు చేసి డిజిటల్ టోకెన్ పొందండి.',
        lang: 'te-IN'
      };
    }
    if (q.includes('center') || q.includes('కేంద్రం') || q.includes('వేళలు') || q.includes('సమయం')) {
      return {
        text: 'ప్రభుత్వ కొనుగోలు కేంద్రాలు ప్రతిరోజూ ఉదయం 8:00 నుండి సాయంత్రం 6:00 వరకు పనిచేస్తాయి. కేంద్రాల పూర్తి వివరాల కోసం సెంటర్స్ పేజీ చూడండి.',
        lang: 'te-IN'
      };
    }
    return {
      text: 'నమస్కారం రైతు మిత్ర. కిసాన్ సేతు ద్వారా మీరు పంట స్లాట్ బుక్ చేసుకోవచ్చు, లైవ్ టోకెన్ ట్రాక్ చేయవచ్చు, మరియు మద్దతు ధరలు తెలుసుకోవచ్చు. మీ సందేహాన్ని మాట్లాడండి.',
      lang: 'te-IN'
    };
  }

  // English language
  if (lang === 'en') {
    if (tokenInfo) {
      return {
        text: `Hello farmer friend. Your token number is ${tokenInfo.token_number}. Crop: ${tokenInfo.crop_name}, quantity: ${tokenInfo.quantity_quintals} quintals. Current status is ${tokenInfo.status}. There are ${tokenInfo.queue_position} farmers ahead of you, and estimated waiting time is approximately ${tokenInfo.estimated_waiting_minutes} minutes at ${tokenInfo.center_name}.`,
        lang: 'en-IN'
      };
    } else if (q.includes('token') || q.includes('queue') || q.includes('status')) {
      return {
        text: 'Hello. The requested token record was not found in our live database. Please verify your token number or check the Track Status page.',
        lang: 'en-IN'
      };
    }
    if (q.includes('rate') || q.includes('msp') || q.includes('price')) {
      return {
        text: 'Current official government MSP rates per quintal are: Common Paddy ₹2,300, Grade-A Paddy ₹2,320, Wheat ₹2,275, Mustard ₹5,650, and Cotton ₹7,121. Payment is transferred directly to your bank account via DBT.',
        lang: 'en-IN'
      };
    }
    if (q.includes('document') || q.includes('paper') || q.includes('certificate')) {
      return {
        text: 'Please bring these 3 essential documents to the procurement center: 1. Original Aadhaar Card for gate verification, 2. Land Record / Pattadar Passbook copy, 3. Aadhaar-seeded Bank Passbook for direct payment.',
        lang: 'en-IN'
      };
    }
    if (q.includes('slot') || q.includes('book')) {
      return {
        text: 'Booking a procurement slot takes 3 simple steps: First, click Book Drop-off Slot. Second, select your crop, quantity, and preferred date. Third, enter your transport vehicle number and download your digital token.',
        lang: 'en-IN'
      };
    }
    if (q.includes('center') || q.includes('timing') || q.includes('hours') || q.includes('location')) {
      return {
        text: 'Procurement centers are open daily from 8:00 AM to 6:00 PM. You can find your nearest center address and contact details on the Centers page.',
        lang: 'en-IN'
      };
    }
    return {
      text: 'Hello farmer friend. I am Kisan Mitr, your dedicated digital procurement assistant. You can ask me about your token number, live queue status, government MSP rates, center timings, or required documents.',
      lang: 'en-IN'
    };
  }

  // Hindi language / default
  if (tokenInfo) {
    return {
      text: `नमस्ते किसान भाई। आपका टोकन नंबर ${tokenInfo.token_number} है। फसल ${tokenInfo.crop_name}, मात्रा ${tokenInfo.quantity_quintals} क्विंटल है। वर्तमान स्थिति ${tokenInfo.status} है। आपसे आगे ${tokenInfo.queue_position} किसान कतार में हैं, और अनुमानित प्रतीक्षा समय लगभग ${tokenInfo.estimated_waiting_minutes} मिनट है। आपका खरीद केंद्र ${tokenInfo.center_name} है।`,
      lang: 'hi-IN'
    };
  } else if (q.includes('token') || q.includes('टोकन') || q.includes('status')) {
    return {
      text: 'नमस्ते किसान भाई। आपका टोकन नंबर रिकॉर्ड में नहीं मिला। कृपया अपना टोकन नंबर जांचें या स्थिति पेज पर फिर से देखें।',
      lang: 'hi-IN'
    };
  }

  if (q.includes('rate') || q.includes('bhav') || q.includes('भाव') || q.includes('msp') || q.includes('gehu') || q.includes('dhan') || q.includes('गेहूं') || q.includes('धान')) {
    return {
      text: 'आज का सरकारी समर्थन मूल्य यानी एमएसपी रेट: गेहूं ₹2,275 प्रति क्विंटल, धान सामान्य ₹2,300 प्रति क्विंटल, धान ग्रेड-ए ₹2,320, सरसों ₹5,650, और कपास ₹7,121 प्रति क्विंटल है। भुगतान सीधा आपके बैंक खाते में डीबीटी द्वारा भेजा जाता है।',
      lang: 'hi-IN'
    };
  }

  if (q.includes('document') || q.includes('kagas') || q.includes('कागज') || q.includes('दस्तावेज') || q.includes('passbook')) {
    return {
      text: 'खरीद केंद्र पर जाते समय ये 3 जरूरी दस्तावेज साथ ले जाएं: 1. अपना असली आधार कार्ड बायोमेट्रिक जांच के लिए, 2. खसरा या पट्टादार पासबुक की कॉपी, 3. आधार से जुड़ा हुआ बैंक पासबुक ताकि पैसा सीधा खाते में आ सके।',
      lang: 'hi-IN'
    };
  }

  if (q.includes('slot') || q.includes('book') || q.includes('टोकन') || q.includes('स्लॉट') || q.includes('bechna')) {
    return {
      text: 'फसल बेचने के लिए स्लॉट बुक करना बहुत आसान है। ऊपर बुक स्लॉट बटन दबाएं, अपनी फसल और मात्रा चुनें, अपनी तारीख और वाहन नंबर डालें, और तुरंत डिजिटल टोकन प्राप्त करें। टोकन नंबर से आप घर बैठे अपनी कतार देख सकते हैं।',
      lang: 'hi-IN'
    };
  }

  if (q.includes('center') || q.includes('kendra') || q.includes('mandi') || q.includes('समय') || q.includes('केंद्र')) {
    return {
      text: 'सरकारी खरीद केंद्र सुबह 8 बजे से शाम 6 बजे तक खुले रहते हैं। आपके नजदीकी केंद्र पर गेहूं, धान और सरसों की तुलाई की जा रही है। किसी भी सहायता के लिए हेल्पडेस्क पर संपर्क करें।',
      lang: 'hi-IN'
    };
  }

  return {
    text: 'नमस्ते किसान भाई। मैं आपका किसान मित्र डिजिटल असिस्टेंट हूँ। आप बोलकर अपना टोकन नंबर, आज का सरकारी भाव, खरीद केंद्र का समय, या जरूरी दस्तावेजों की जानकारी कभी भी पूछ सकते हैं।',
    lang: 'hi-IN'
  };
}
