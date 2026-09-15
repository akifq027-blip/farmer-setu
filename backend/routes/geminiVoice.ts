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
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  res.json({
    success: true,
    models: [
      {
        id: 'gemini-3.7-flash',
        name: 'Google Gemini 3.7 Flash',
        engine: 'gemini',
        provider: 'Google AI',
        badge: 'Fast & Multilingual',
        description: 'Advanced reasoning, real-time Indian languages & agricultural intelligence.',
        isAvailable: hasGemini || true,
        isDefault: true
      },
      {
        id: 'chatgpt-4o',
        name: 'ChatGPT (GPT-4o Mini)',
        engine: 'chatgpt',
        provider: 'OpenAI',
        badge: 'Conversational',
        description: 'OpenAI ChatGPT conversational voice and structured guidance.',
        isAvailable: hasOpenAI || true,
        isDefault: false
      },
      {
        id: 'kisan-auto',
        name: 'KisanSetu Auto-AI',
        engine: 'auto',
        provider: 'KisanSetu AI Hub',
        badge: 'Grounded + Live DB',
        description: 'Auto-selects the fastest AI engine combined with live mandi queue data.',
        isAvailable: true,
        isDefault: false
      }
    ],
    activeDefault: 'gemini-3.7-flash'
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

    // System prompt for Indian Agricultural Voice Assistant
    const systemInstruction = `
You are "Kisan Mitra" (किसान मित्र / రైతు మిత్ర), an expert, ultra-friendly, respectful Agricultural AI Voice & Knowledge Assistant for KisanSetu.
Your audience includes Indian farmers, many of whom prefer listening to spoken audio over reading text.

CORE OPERATIONAL RULES:
1. LANGUAGE: Respond in the EXACT SAME LANGUAGE and dialect of the query (e.g. Hindi, Telugu, English, Punjabi, Marathi, Tamil, Kannada, Bengali, Gujarati). If language preference is explicitly specified as '${language}', prioritize that language.
2. SPOKEN AUDIO COMPATIBILITY: Keep your spoken answer natural, warm, reassuring, and easy to pronounce by a speech synthesizer (TTS). Avoid robotic acronyms.
3. LIVE MANDI DATA ACCURACY: Always quote real numbers from the LIVE SYSTEM CONTEXT provided:
   - For Tokens/Queue: Quote the token number, crop, status, farmers ahead in queue, approximate wait time, and counter advice.
   - For MSP: Quote the official Minimum Support Price (MSP) in ₹ per quintal and mention the moisture limit (e.g., Wheat moisture < 12%, Paddy < 17%).
   - For Slot Booking: Explain in 3 simple steps how to pick crop, date, vehicle number, and get instant digital token.
   - For Centers: State opening hours (typically 8:00 AM - 6:00 PM) and center contact number.
   - For Documents: Mention the 3 essential papers (Aadhaar, Land Passbook, Bank Passbook for DBT).
4. CROP DOCTOR & ADVISORY: If asked about farming advice (e.g. drying grain, pest prevention, storage, rain precautions), provide safe, practical farmer-first advice.
5. CLEAN TEXT: In the plain spoken response, do NOT use Markdown formatting like asterisks (**), hashtags (###), or code fences, because TTS synthesizers read those aloud awkwardly. Keep punctuation natural with commas and periods for speech pauses.
`;

    // Detect speech synthesis language code
    let speechLang = 'hi-IN';
    const lowerQuery = cleanQuery.toLowerCase();
    if (language === 'te' || /[\u0C00-\u0C7F]/.test(cleanQuery) || lowerQuery.includes('telugu') || lowerQuery.includes('eppudu') || lowerQuery.includes('ధర') || lowerQuery.includes('టోకెన్')) {
      speechLang = 'te-IN';
    } else if (language === 'hi' || /[\u0900-\u097F]/.test(cleanQuery) || lowerQuery.includes('namaste') || lowerQuery.includes('kisan') || lowerQuery.includes('bhav') || lowerQuery.includes('gehu') || lowerQuery.includes('भाव')) {
      speechLang = 'hi-IN';
    } else if (language === 'pa' || /[\u0A00-\u0A7F]/.test(cleanQuery) || lowerQuery.includes('sat sri akaal') || lowerQuery.includes('kanak')) {
      speechLang = 'pa-IN';
    } else if (language === 'mr' || lowerQuery.includes('namaskar') || lowerQuery.includes('bhav kay') || lowerQuery.includes('शेतकरी')) {
      speechLang = 'mr-IN';
    } else if (language === 'ta' || /[\u0B80-\u0BFF]/.test(cleanQuery)) {
      speechLang = 'ta-IN';
    } else if (language === 'kn' || /[\u0C80-\u0CFF]/.test(cleanQuery)) {
      speechLang = 'kn-IN';
    } else if (language === 'gu' || /[\u0A80-\u0AFF]/.test(cleanQuery)) {
      speechLang = 'gu-IN';
    } else if (language === 'bn' || /[\u0980-\u09FF]/.test(cleanQuery)) {
      speechLang = 'bn-IN';
    } else if (language === 'en' || /^[a-zA-Z0-9\s.,?!'-]+$/.test(cleanQuery)) {
      speechLang = 'en-IN';
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
    } else if (lowerQuery.includes('center') || lowerQuery.includes('mandi') || lowerQuery.includes('केंद्र') || lowerQuery.includes('కేంద్రం')) {
      actionType = 'CENTER_INFO';
      actionUrl = `/centers.html`;
      actionTitle = 'नजदीकी सरकारी खरीद केंद्र सूची';
    } else if (lowerQuery.includes('document') || lowerQuery.includes('kagas') || lowerQuery.includes('कागज') || lowerQuery.includes('पंजीकरण') || lowerQuery.includes('పత్రాలు')) {
      actionType = 'DOCUMENT_INFO';
      actionUrl = `/help.html`;
      actionTitle = 'जरूरी दस्तावेज व सत्यापन सहायता';
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
              modelUsed: 'ChatGPT (GPT-4o Mini)',
              modelId: 'chatgpt-4o',
              actionType,
              actionUrl,
              actionTitle,
              matchedToken: matchedTokenInfo,
              mspData: MSP_RATES,
              followUpSuggestions: getFollowUpSuggestions(cleanQuery, language)
            });
          }
        }
      } catch (openAiErr) {
        console.warn('OpenAI request failed, continuing to Gemini/Fallback:', openAiErr);
      }
    }

    // Strategy 2: Google Gemini 3.7 Flash (Primary official engine via @google/genai)
    const ai = getGeminiClient();
    if (ai) {
      try {
        // Construct conversation contents with system instruction and history
        let promptText = `
FARMER'S QUESTION: "${cleanQuery}"
LANGUAGE PREFERENCE: ${language}

LIVE MANDI & PROCUREMENT GROUND TRUTH:
${JSON.stringify(liveContext, null, 2)}
`;

        // If history is provided, include the recent dialogue context
        if (Array.isArray(history) && history.length > 0) {
          const recentHistoryText = history.slice(-4).map(h => `${h.role === 'user' ? 'Farmer' : 'Assistant'}: ${h.content}`).join('\n');
          promptText = `CONVERSATION HISTORY:\n${recentHistoryText}\n\n` + promptText;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
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
            modelUsed: 'Google Gemini 3.7 Flash',
            modelId: 'gemini-3.7-flash',
            actionType,
            actionUrl,
            actionTitle,
            matchedToken: matchedTokenInfo,
            mspData: MSP_RATES,
            followUpSuggestions: getFollowUpSuggestions(cleanQuery, language)
          });
        }
      } catch (geminiErr: any) {
        console.error('Gemini generateContent error:', geminiErr);
      }
    }

    // Strategy 3: Grounded Intelligent Fallback Engine
    const fallback = generateIntelligentFallback(cleanQuery, language, matchedTokenInfo, allCenters, allSchedules);
    return res.json({
      success: true,
      spokenResponse: fallback.text,
      markdownResponse: fallback.text,
      speechLang: fallback.lang || speechLang,
      modelUsed: 'KisanSetu Intelligent Grounding',
      modelId: 'kisan-auto',
      actionType,
      actionUrl,
      actionTitle,
      matchedToken: matchedTokenInfo,
      mspData: MSP_RATES,
      followUpSuggestions: getFollowUpSuggestions(cleanQuery, language)
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
      title_pa: 'ਅੱਜ ਦਾ ਸਰਕਾਰੀ ਰੇਟ (MSP)',
      query_hi: 'आज का सरकारी समर्थन मूल्य (MSP) और गेहूं व धान का रेट क्या है?',
      query_te: 'ఈరోజు వరి మరియు గోధుమల ప్రభుత్వ మద్దతు ధరలు ఎంత?',
      query_en: 'What are the current government MSP rates for Wheat, Paddy and Mustard?',
      query_pa: 'ਕਣਕ ਅਤੇ ਝੋਨੇ ਦਾ ਅੱਜ ਦਾ ਸਰਕਾਰੀ ਸਮਰਥਨ ਮੁੱਲ ਕੀ ਹੈ?'
    },
    {
      id: 'token',
      icon: '🎟️',
      title_hi: 'मेरा टोकन व लाइव कतार',
      title_te: 'నా టోకెన్ & లైవ్ క్యూ',
      title_en: 'My Token Queue Status',
      title_pa: 'ਮੇਰਾ ਟੋਕਨ ਅਤੇ ਕਤਾਰ',
      query_hi: 'मेरा टोकन नंबर A-104 का लाइव स्टेटस और कतार में नंबर बताएं',
      query_te: 'నా టోకెన్ A-104 లైవ్ స్టేటస్ చెప్పండి',
      query_en: 'Tell me the live queue position and wait time for Token A-104',
      query_pa: 'ਮੇਰੇ ਟੋਕਨ A-104 ਦਾ ਲਾਈਵ ਸਟੇਟਸ ਦੱਸੋ'
    },
    {
      id: 'slot',
      icon: '📅',
      title_hi: 'फसल बेचने का स्लॉट बुक करें',
      title_te: 'స్లాట్ ఎలా బుక్ చేయాలి?',
      title_en: 'Book Drop-off Slot',
      title_pa: 'ਸਲਾਟ ਕਿਵੇਂ ਬੁੱਕ ਕਰਨਾ ਹੈ?',
      query_hi: 'फसल बेचने के लिए ऑनलाइन टोकन स्लॉट कैसे बुक करें?',
      query_te: 'ధాన్యం సేకరణ కోసం స్లాట్ ఎలా బుక్ చేయాలి?',
      query_en: 'How do I book a crop procurement drop-off slot online?',
      query_pa: 'ਫਸਲ ਵੇਚਣ ਲਈ ਆਨਲਾਈਨ ਟੋਕਨ ਸਲਾਟ ਕਿਵੇਂ ਬੁੱਕ ਕਰੀਏ?'
    },
    {
      id: 'documents',
      icon: '📄',
      title_hi: 'मंडी में क्या कागज साथ ले जाएं?',
      title_te: 'కేంద్రానికి ఏ పత్రాలు కావాలి?',
      title_en: 'Required Documents',
      title_pa: 'ਮੰਡੀ ਵਿੱਚ ਕਿਹੜੇ ਕਾਗਜ਼ ਲੈ ਕੇ ਜਾਣੇ ਹਨ?',
      query_hi: 'खरीद केंद्र पर क्या क्या दस्तावेज और कागज साथ ले जाने होंगे?',
      query_te: 'కొనుగోలు కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      query_en: 'What documents do I need to bring to the procurement center?',
      query_pa: 'ਖਰੀਦ ਕੇਂਦਰ ਵਿੱਚ ਕਿਹੜੇ ਦਸਤਾਵੇਜ਼ ਲੈ ਕੇ ਜਾਣੇ ਪੈਣਗੇ?'
    },
    {
      id: 'centers',
      icon: '📍',
      title_hi: 'नजदीकी केंद्र व समय',
      title_te: 'సమీప కేంద్రం & వేళలు',
      title_en: 'Center Timings & Contact',
      title_pa: 'ਨੇੜਲਾ ਕੇਂਦਰ ਅਤੇ ਸਮਾਂ',
      query_hi: 'सरकारी खरीद केंद्र का समय क्या है और हेल्पलाइन नंबर क्या है?',
      query_te: 'సమీప కేంద్రం పని వేళలు మరియు ఫోన్ నంబర్ ఏమిటి?',
      query_en: 'What are the procurement center operational hours and helpline contact?',
      query_pa: 'ਸਰਕਾਰੀ ਖਰੀਦ ਕੇਂਦਰ ਦਾ ਸਮਾਂ ਅਤੇ ਹੈਲਪਲਾਈਨ ਨੰਬਰ ਕੀ ਹੈ?'
    },
    {
      id: 'moisture',
      icon: '💧',
      title_hi: 'नमी (Moisture) के सरकारी नियम',
      title_te: 'తేమ శాతం నిబంధనలు',
      title_en: 'Moisture Rules for Crops',
      title_pa: 'ਨਮੀ (Moisture) ਦੇ ਨਿਯਮ',
      query_hi: 'गेहूं और धान में नमी कितने प्रतिशत तक स्वीकार की जाती है?',
      query_te: 'వరి మరియు గోధుమలలో తేమ శాతం ఎంత ఉండాలి?',
      query_en: 'What is the maximum allowed moisture percentage for wheat and paddy?',
      query_pa: 'ਕਣਕ ਅਤੇ ਝੋਨੇ ਵਿੱਚ ਨਮੀ ਦੀ ਕਿੰਨੀ ਹੱਦ ਮਨਜ਼ੂਰ ਹੈ?'
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

// Helper: Provide 2-3 dynamic follow up suggestions based on user query
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

  // Telugu language queries
  if (lang === 'te' || /[\u0C00-\u0C7F]/.test(query) || q.includes('telugu') || q.includes('dharalu') || q.includes('token') || q.includes('mariyu')) {
    if (tokenInfo) {
      return {
        text: `నమస్కారం రైతు సోదరా. మీ టోకెన్ నంబర్ ${tokenInfo.token_number}. పంట ${tokenInfo.crop_name}, పరిమాణం ${tokenInfo.quantity_quintals} క్వింటాళ్లు. ప్రస్తుత స్థితి: ${tokenInfo.status}. మీ ముందు ${tokenInfo.queue_position} మంది రైతులు ఉన్నారు. వేచి ఉండే సమయం సుమారు ${tokenInfo.estimated_waiting_minutes} నిమిషాలు. కేంద్రం: ${tokenInfo.center_name}.`,
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
    return {
      text: 'నమస్కారం రైతు మిత్ర. కిసాన్ సేతు ద్వారా మీరు పంట స్లాట్ బుక్ చేసుకోవచ్చు, లైవ్ టోకెన్ ట్రాక్ చేయవచ్చు, మరియు మద్దతు ధరలు తెలుసుకోవచ్చు. మీ టోకెన్ నంబర్ లేదా సందేహాన్ని మాట్లాడండి.',
      lang: 'te-IN'
    };
  }

  // Hindi / default queries
  if (tokenInfo) {
    return {
      text: `नमस्ते किसान भाई। आपका टोकन नंबर ${tokenInfo.token_number} है। फसल ${tokenInfo.crop_name}, मात्रा ${tokenInfo.quantity_quintals} क्विंटल है। वर्तमान स्थिति ${tokenInfo.status} है। आपसे आगे ${tokenInfo.queue_position} किसान कतार में हैं, और अनुमानित प्रतीक्षा समय लगभग ${tokenInfo.estimated_waiting_minutes} मिनट है। आपका खरीद केंद्र ${tokenInfo.center_name} है।`,
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
    text: 'नमस्ते किसान भाई। मैं आपका किसान मित्र वॉइस असिस्टेंट हूँ। आप बोलकर अपना टोकन नंबर, आज का सरकारी भाव, खरीद केंद्र का समय, या जरूरी दस्तावेजों की जानकारी कभी भी पूछ सकते हैं।',
    lang: 'hi-IN'
  };
}
