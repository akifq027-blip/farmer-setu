import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { store } from '../store.js';

export const geminiVoiceRouter = Router();

// Official MSP Benchmark Rates for Agricultural Procurement (₹ / Quintal)
const MSP_RATES: Record<string, { msp: number; season: string; quality_standard: string }> = {
  'Wheat': { msp: 2275, season: 'Rabi', quality_standard: 'FAQ (Moisture below 12%)' },
  'Paddy (Common)': { msp: 2300, season: 'Kharif', quality_standard: 'FAQ (Moisture below 17%)' },
  'Paddy (Grade A)': { msp: 2320, season: 'Kharif', quality_standard: 'FAQ (Moisture below 17%)' },
  'Paddy': { msp: 2300, season: 'Kharif', quality_standard: 'FAQ (Moisture below 17%)' },
  'Mustard': { msp: 5650, season: 'Rabi', quality_standard: 'FAQ (Moisture below 8%)' },
  'Cotton': { msp: 7121, season: 'Kharif', quality_standard: 'Medium/Long Staple' },
  'Gram / Chana': { msp: 5440, season: 'Rabi', quality_standard: 'FAQ (Moisture below 10%)' },
  'Chana': { msp: 5440, season: 'Rabi', quality_standard: 'FAQ (Moisture below 10%)' },
  'Soyabean': { msp: 4892, season: 'Kharif', quality_standard: 'FAQ (Moisture below 12%)' },
  'Maize': { msp: 2090, season: 'Kharif', quality_standard: 'FAQ (Moisture below 14%)' },
  'Moong': { msp: 8558, season: 'Kharif', quality_standard: 'FAQ' },
  'Groundnut': { msp: 6377, season: 'Kharif', quality_standard: 'FAQ' },
  'Sunflower': { msp: 6760, season: 'Kharif', quality_standard: 'FAQ' }
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

// POST /api/gemini/voice-assistant
geminiVoiceRouter.post('/voice-assistant', async (req, res) => {
  try {
    const { query, language = 'auto', farmerId, tokenNumber } = req.body;

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

    // Prepare context payload for Gemini
    const liveContext = {
      centers: allCenters.map(c => ({
        name: c.center_name,
        district: c.district,
        crops: c.crops_accepted,
        timings: `${c.opening_time} to ${c.closing_time}`,
        status: c.status,
        contact: c.contact_number
      })),
      schedules: allSchedules.slice(0, 10).map(s => ({
        crop: s.crop_name,
        date: s.procurement_date,
        time: `${s.start_time} - ${s.end_time}`,
        remaining_slots: s.remaining_slots,
        status: s.status
      })),
      announcements: allAnnouncements.slice(0, 3).map(a => a.title + ': ' + a.message),
      msp_rates: MSP_RATES,
      matched_token: matchedTokenInfo ? {
        token: matchedTokenInfo.token_number,
        farmer_name: matchedTokenInfo.farmer_name,
        crop: matchedTokenInfo.crop_name,
        quantity: `${matchedTokenInfo.quantity_quintals} Quintals`,
        status: matchedTokenInfo.status,
        center: matchedTokenInfo.center_name,
        queue_position: matchedTokenInfo.queue_position,
        estimated_waiting_minutes: matchedTokenInfo.estimated_waiting_minutes,
        payment_status: matchedTokenInfo.payment_status,
        date: matchedTokenInfo.preferred_date
      } : null,
      documents_required: [
        'Aadhaar Card (Original for biometric check)',
        'Pattadar Passbook / Land Record (Khasra/Adangal)',
        'Bank Passbook Copy (Aadhaar-linked for Direct DBT payment)',
        'Crop Sowing Certificate'
      ]
    };

    const ai = getGeminiClient();

    if (ai) {
      const systemInstruction = `
You are "Kisan Mitra" (किसान मित्र / రైతు మిత్ర), an ultra-friendly, respectful, and crystal-clear Agricultural Voice Assistant for KisanSetu.
Your PRIMARY audience is hardworking Indian farmers, many of whom CANNOT READ OR WRITE ANY TEXT.
They rely 100% on listening to your spoken words.

CORE RULES FOR GENERATING SPOKEN RESPONSES:
1. Speak in the EXACT SAME LANGUAGE and dialect as the farmer's query (e.g., Hindi, Telugu, Punjabi, Marathi, Tamil, Kannada, Bengali, Gujarati, or English).
2. Keep sentences SHORT, WARM, REASSURING, and VERY SIMPLE.
3. Pronounce numbers, dates, crop names, and rupee amounts clearly so they sound natural when read aloud by Text-To-Speech (TTS).
4. For Token/Queue queries:
   - If token is found, tell them: their token number, crop, current status, exactly how many farmers are ahead, approximate wait time in minutes, and what counter to approach.
   - If no token number was mentioned and they ask for their status, gently ask them to speak their token number (e.g. "A-104").
5. For MSP / Price queries:
   - Quote the official government MSP rates directly from the live MSP table provided.
   - Mention the moisture limit (e.g. "Wheat moisture must be below 12%").
6. For Booking / Center queries:
   - Explain in 2-3 simple steps how to book a slot, what center to go to, and opening timings.
7. For Documents:
   - Tell them the 3 essential documents: Aadhaar card, Land passbook, and Bank passbook.
8. NEVER output markdown symbols like Asterisks (**), Hashtags (###), or complex code blocks in your spoken answer, because these sound weird when spoken aloud by a speech synthesizer. Use plain, clean conversational text with natural pauses (commas and periods).
`;

      const prompt = `
FARMER'S SPOKEN QUESTION: "${cleanQuery}"
REQUESTED LANGUAGE PREFERENCE: ${language}

LIVE SYSTEM & MANDI CONTEXT:
${JSON.stringify(liveContext, null, 2)}

Provide a natural, helpful, spoken answer for the farmer.
Also determine:
1. actionType: one of ["TOKEN_STATUS", "MSP_RATES", "BOOK_SLOT", "CENTER_INFO", "DOCUMENT_INFO", "WEATHER_ADVICE", "GENERAL_HELP"]
2. detectedToken: string or null
3. quickFollowUps: array of 2-3 short spoken prompts the farmer can ask next
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3
        }
      });

      const spokenResponse = response.text || 'नमस्ते किसान भाई, आपकी सहायता के लिए किसान सेतु तैयार है।';

      // Detect speech synthesis language code
      let speechLang = 'hi-IN';
      const lowerQuery = cleanQuery.toLowerCase();
      if (language === 'te' || /[\u0C00-\u0C7F]/.test(cleanQuery) || lowerQuery.includes('telugu') || lowerQuery.includes('eppudu') || lowerQuery.includes('enta')) {
        speechLang = 'te-IN';
      } else if (language === 'hi' || /[\u0900-\u097F]/.test(cleanQuery) || lowerQuery.includes('namaste') || lowerQuery.includes('kisan') || lowerQuery.includes('bhav') || lowerQuery.includes('gehu')) {
        speechLang = 'hi-IN';
      } else if (language === 'pa' || /[\u0A00-\u0A7F]/.test(cleanQuery) || lowerQuery.includes('sat sri akaal') || lowerQuery.includes('kanak')) {
        speechLang = 'pa-IN';
      } else if (language === 'mr' || lowerQuery.includes('namaskar') || lowerQuery.includes('bhav kay')) {
        speechLang = 'mr-IN';
      } else if (language === 'ta' || /[\u0B80-\u0BFF]/.test(cleanQuery)) {
        speechLang = 'ta-IN';
      } else if (language === 'en' || /^[a-zA-Z0-9\s.,?!'-]+$/.test(cleanQuery)) {
        // If query is pure English
        speechLang = 'en-IN';
      }

      return res.json({
        success: true,
        spokenResponse: spokenResponse.trim(),
        speechLang: speechLang,
        matchedToken: matchedTokenInfo,
        actionUrl: matchedTokenInfo ? `/status.html?token=${matchedTokenInfo.token_number}` : null,
        mspData: MSP_RATES
      });
    }

    // Graceful offline/fallback assistant if Gemini key is not configured
    const fallbackAnswer = generateIntelligentFallback(cleanQuery, language, matchedTokenInfo, allCenters, allSchedules);
    return res.json({
      success: true,
      spokenResponse: fallbackAnswer.text,
      speechLang: fallbackAnswer.lang,
      matchedToken: matchedTokenInfo,
      actionUrl: matchedTokenInfo ? `/status.html?token=${matchedTokenInfo.token_number}` : null,
      mspData: MSP_RATES
    });

  } catch (error: any) {
    console.error('Gemini Voice Assistant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice request with Gemini',
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
      query_hi: 'आज का सरकारी भाव और गेहूं धान का रेट क्या है?',
      query_te: 'ఈరోజు వరి మరియు గోధుమల మద్దతు ధర ఎంత?',
      query_en: 'What are the current MSP rates for Wheat and Paddy?'
    },
    {
      id: 'token',
      icon: '🎟️',
      title_hi: 'मेरा टोकन नंबर और कतार',
      title_te: 'నా టోకెన్ స్థితి & క్యూ నంబర్',
      title_en: 'Check Token & Queue Status',
      query_hi: 'मेरा टोकन नंबर A-104 का लाइव स्टेटस क्या है?',
      query_te: 'నా టోకెన్ A-104 స్టేటస్ చెప్పండి',
      query_en: 'Tell me the live queue status for Token A-104'
    },
    {
      id: 'slot',
      icon: '📅',
      title_hi: 'फसल बेचने का स्लॉट कैसे बुक करें?',
      title_te: 'స్లాట్ ఎలా బుక్ చేసుకోవాలి?',
      title_en: 'How to Book Crop Drop-off Slot',
      query_hi: 'फसल बेचने के लिए ऑनलाइन टोकन स्लॉट कैसे बुक करें?',
      query_te: 'ధాన్యం అమ్మడానికి స్లాట్ ఎలా బుక్ చేయాలి?',
      query_en: 'How do I book a crop procurement slot online?'
    },
    {
      id: 'documents',
      icon: '📄',
      title_hi: 'मंडी में क्या कागज साथ ले जाएं?',
      title_te: 'కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      title_en: 'What Documents to Bring',
      query_hi: 'खरीद केंद्र पर क्या क्या दस्तावेज और कागज साथ ले जाने होंगे?',
      query_te: 'కొనుగోలు కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      query_en: 'What documents are required at the procurement center?'
    },
    {
      id: 'centers',
      icon: '📍',
      title_hi: 'नजदीकी खरीद केंद्र व समय',
      title_te: 'సమీప కొనుగోలు కేంద్రం & వేళలు',
      title_en: 'Nearest Center & Timings',
      query_hi: 'नजदीकी सरकारी खरीद केंद्र कब खुलता है और संपर्क नंबर क्या है?',
      query_te: 'సమీప కేంద్రం పని వేళలు మరియు ఫోన్ నంబర్ ఏమిటి?',
      query_en: 'What are the procurement center timings and contact numbers?'
    }
  ];

  res.json({ success: true, prompts });
});

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
        text: `నమస్కారం రైతు సోదరా. మీ టోకెన్ నంబర్ ${tokenInfo.token_number}. పంట ${tokenInfo.crop_name}, పరిమాణం ${tokenInfo.quantity_quintals} క్వింటాళ్లు. మీ ప్రస్తుత స్థితి: ${tokenInfo.status}. మీ ముందు ${tokenInfo.queue_position} మంది రైతులు ఉన్నారు. వేచి ఉండే సమయం సుమారు ${tokenInfo.estimated_waiting_minutes} నిమిషాలు. కేంద్రం: ${tokenInfo.center_name}.`,
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
    const center = centers[0];
    return {
      text: `सरकारी खरीद केंद्र सुबह 8 बजे से शाम 6 बजे तक खुले रहते हैं। आपके नजदीकी केंद्र पर गेहूं, धान और सरसों की तुलाई की जा रही है। किसी भी सहायता के लिए हेल्पडेस्क पर संपर्क करें।`,
      lang: 'hi-IN'
    };
  }

  return {
    text: 'नमस्ते किसान भाई। मैं आपका किसान मित्र वॉइस असिस्टेंट हूँ। आप बोलकर अपना टोकन नंबर, आज का सरकारी भाव, खरीद केंद्र का समय, या जरूरी दस्तावेजों की जानकारी कभी भी पूछ सकते हैं।',
    lang: 'hi-IN'
  };
}
