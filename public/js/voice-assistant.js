/**
 * KisanSetu - Kisan Mitr Digital Voice Assistant for Farmers
 * Natural, warm, multi-lingual agricultural procurement assistant supporting
 * Hindi, Telugu, and English with live database integration and voice interruption.
 */

(function () {
  'use strict';

  let isListening = false;
  let isSpeaking = false;
  let recognition = null;
  let currentSpeechUtterance = null;
  let currentLanguage = localStorage.getItem('kisansetu_lang') || 'hi';
  let lastSpokenText = '';
  let lastSpeechLang = 'hi-IN';
  let conversationHistory = [];

  // Farmer-friendly quick voice topics in Hindi, Telugu, and English
  const TOPIC_PRESETS = [
    {
      id: 'msp',
      icon: '🌾',
      hi: 'आज का सरकारी भाव (MSP)',
      te: 'ఈరోజు మద్దతు ధరలు (MSP)',
      en: "Today's MSP Crop Rates",
      query_hi: 'आज का सरकारी समर्थन मूल्य (MSP) और गेहूं व धान का रेट क्या है?',
      query_te: 'ఈరోజు వరి మరియు గోధుమల ప్రభుత్వ మద్దతు ధరలు ఎంత?',
      query_en: 'What are the current government MSP rates for Wheat, Paddy and Mustard?'
    },
    {
      id: 'token',
      icon: '🎟️',
      hi: 'मेरा टोकन व लाइव कतार',
      te: 'నా టోకెన్ & లైవ్ క్యూ',
      en: 'My Token Queue Status',
      query_hi: 'मेरा टोकन नंबर A-104 का लाइव स्टेटस और कतार बताएं',
      query_te: 'నా టోకెన్ A-104 లైవ్ స్టేటస్ చెప్పండి',
      query_en: 'Tell me the live queue position and wait time for Token A-104'
    },
    {
      id: 'slot',
      icon: '📅',
      hi: 'फसल बेचने का स्लॉट बुक करें',
      te: 'స్లాట్ ఎలా బుక్ చేయాలి?',
      en: 'Book Drop-off Slot',
      query_hi: 'फसल बेचने के लिए ऑनलाइन टोकन स्लॉट कैसे बुक करें?',
      query_te: 'ధాన్యం సేకరణ కోసం స్లాట్ ఎలా బుక్ చేయాలి?',
      query_en: 'How do I book a crop procurement drop-off slot online?'
    },
    {
      id: 'documents',
      icon: '📄',
      hi: 'मंडी में क्या कागज साथ ले जाएं?',
      te: 'కేంద్రానికి ఏ పత్రాలు కావాలి?',
      en: 'Required Documents',
      query_hi: 'खरीद केंद्र पर क्या क्या दस्तावेज और कागज साथ ले जाने होंगे?',
      query_te: 'కొనుగోలు కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      query_en: 'What documents do I need to bring to the procurement center?'
    },
    {
      id: 'centers',
      icon: '📍',
      hi: 'नजदीकी केंद्र व समय',
      te: 'సమీప కేంద్రం & వేళలు',
      en: 'Center Timings & Contact',
      query_hi: 'सरकारी खरीद केंद्र का समय क्या है और हेल्पलाइन नंबर क्या है?',
      query_te: 'సమీప కేంద్రం పని వేళలు మరియు ఫోన్ నంబర్ ఏమిటి?',
      query_en: 'What are the procurement center operational hours and helpline contact?'
    },
    {
      id: 'moisture',
      icon: '💧',
      hi: 'नमी (Moisture) के नियम',
      te: 'తేమ శాతం నిబంధనలు',
      en: 'Crop Moisture Standards',
      query_hi: 'गेहूं और धान में नमी कितने प्रतिशत तक स्वीकार की जाती है?',
      query_te: 'వరి మరియు గోధుమలలో తేమ శాతం ఎంత ఉండాలి?',
      query_en: 'What is the maximum allowed moisture percentage for wheat and paddy?'
    }
  ];

  // Initialize Speech Recognition if supported
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognition) {
          try { recognition.abort(); } catch (e) {}
        }
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const langCodeMap = {
          'hi': 'hi-IN',
          'te': 'te-IN',
          'en': 'en-IN'
        };
        recognition.lang = langCodeMap[currentLanguage] || 'hi-IN';

        recognition.onstart = function () {
          isListening = true;
          updateUIState('listening');
        };

        recognition.onresult = function (event) {
          const transcript = event.results[0][0].transcript;
          isListening = false;
          
          // Auto-detect language from transcript if it has distinctive characters
          if (/[\u0C00-\u0C7F]/.test(transcript)) {
            setAssistantLanguage('te', false);
          } else if (/[\u0900-\u097F]/.test(transcript)) {
            setAssistantLanguage('hi', false);
          } else if (/^[a-zA-Z0-9\s.,?!'-]+$/.test(transcript) && currentLanguage === 'en') {
            setAssistantLanguage('en', false);
          }

          handleVoiceQuery(transcript);
        };

        recognition.onerror = function (event) {
          isListening = false;
          const err = event.error;
          if (err === 'no-speech') {
            updateUIState('idle', getLocalizedMessage('no_speech'));
          } else if (err === 'not-allowed' || err === 'service-not-allowed') {
            updateUIState('idle', getLocalizedMessage('mic_permission'));
          } else {
            updateUIState('idle', getLocalizedMessage('try_again'));
          }
        };

        recognition.onend = function () {
          isListening = false;
          const mainBtn = document.getElementById('kisan-main-mic-btn');
          if (mainBtn && !isSpeaking) {
            mainBtn.classList.remove('listening');
          }
        };
      } catch (e) {
        console.warn('SpeechRecognition initialization notice:', e);
      }
    }
  }

  function getLocalizedMessage(key) {
    const msgs = {
      idle: {
        hi: 'किसान मित्र (Kisan Mitr)',
        te: 'కిసాన్ మిత్ర (Kisan Mitr)',
        en: 'Kisan Mitr'
      },
      listening: {
        hi: 'Listening... (सुन रहे हैं...)',
        te: 'Listening... (వింటున్నాము...)',
        en: 'Listening...'
      },
      thinking: {
        hi: 'Thinking... (सोच रहे हैं...)',
        te: 'Thinking... (ఆలోచిస్తున్నాము...)',
        en: 'Thinking...'
      },
      speaking: {
        hi: 'Speaking... (बोल रहे हैं...)',
        te: 'Speaking... (సమాధానం ఇస్తున్నారు...)',
        en: 'Speaking...'
      },
      tap_to_speak: {
        hi: 'माइक दबाकर बोलें या नीचे कोई भी विषय चुनें',
        te: 'మైక్ నొక్కి మాట్లాడండి లేదా కింద ఎంచుకోండి',
        en: 'Tap the mic to speak or choose a topic below'
      },
      no_speech: {
        hi: 'मैं सुन नहीं पाया। कृपया फिर से बोलें।',
        te: 'వినపడలేదు. దయచేసి మళ్ళీ మాట్లాడండి.',
        en: "I didn't catch that. Please try again."
      },
      mic_permission: {
        hi: 'माइक्रोफ़ोन की अनुमति बंद है। कृपया अपने ब्राउज़र में माइक की अनुमति दें।',
        te: 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్‌లో మైక్రోఫోన్‌ను అనుమతించండి.',
        en: 'Microphone access is denied. Please allow microphone access in browser.'
      },
      try_again: {
        hi: 'कृपया माइक दबाकर फिर से बोलें।',
        te: 'దయచేసి మైక్ నొక్కి మళ్ళీ మాట్లాడండి.',
        en: 'Please tap the mic and try again.'
      }
    };

    const lang = (currentLanguage in msgs[key]) ? currentLanguage : 'hi';
    return msgs[key][lang] || msgs[key]['en'];
  }

  // Inject HTML Elements for Floating FAB and Modal
  function createVoiceAssistantUI() {
    if (document.getElementById('kisan-voice-fab-btn')) return;

    // 1. Floating Action Button (FAB)
    const fab = document.createElement('button');
    fab.id = 'kisan-voice-fab-btn';
    fab.className = 'kisan-voice-fab';
    fab.setAttribute('aria-label', 'Open Kisan Mitr Farmer Support Voice Assistant');
    fab.innerHTML = `
      <div class="kisan-voice-mic-icon-wrap">
        🎙️
      </div>
      <div class="kisan-voice-fab-text">
        <div class="kisan-voice-fab-title">
          <span>Kisan Mitr</span>
          <span class="kisan-voice-fab-badge">Farmer Support</span>
        </div>
        <div class="kisan-voice-fab-sub">
          बोलकर जानकारी पाएं • మాట్లాడి తెలుసుకోండి
        </div>
      </div>
    `;

    // 2. Modal Overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'kisan-voice-modal-overlay';
    modalOverlay.className = 'kisan-voice-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="kisan-voice-modal" role="dialog" aria-modal="true" aria-labelledby="kisan-assistant-title">
        <!-- Header -->
        <div class="kisan-voice-header">
          <div class="kisan-voice-header-brand">
            <div class="kisan-voice-avatar">🌾</div>
            <div>
              <h2 id="kisan-assistant-title" class="kisan-voice-header-title">Kisan Mitr</h2>
              <p class="kisan-voice-header-sub">Government Farmer Support • డిజిటల్ రైతు మిత్ర</p>
            </div>
          </div>
          <button id="kisan-voice-close-btn" class="kisan-voice-close-btn" aria-label="Close Kisan Mitr">✕</button>
        </div>

        <!-- Body -->
        <div class="kisan-voice-body">
          
          <!-- Language Selector -->
          <div class="kisan-voice-lang-bar">
            <button class="kisan-voice-lang-pill ${currentLanguage === 'hi' ? 'active' : ''}" data-lang="hi">🇮🇳 हिन्दी (Hindi)</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'te' ? 'active' : ''}" data-lang="te">🇮🇳 తెలుగు (Telugu)</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'en' ? 'active' : ''}" data-lang="en">🇬🇧 English</button>
          </div>

          <!-- Status Card -->
          <div class="kisan-voice-status-card">
            <div id="kisan-voice-status-icon" class="kisan-voice-status-icon">🌾</div>
            <div id="kisan-voice-status-text" class="kisan-voice-status-text">Kisan Mitr</div>
            <div id="kisan-voice-status-sub" style="font-size:13px; color:#52796F; margin-bottom:12px;">${getLocalizedMessage('tap_to_speak')}</div>
            
            <!-- Sound Wave Visualizer -->
            <div id="kisan-audio-wave" class="kisan-audio-wave">
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
              <div class="kisan-audio-bar"></div>
            </div>

            <!-- Central Mic Button with Interruption Capability -->
            <div style="display:flex; align-items:center; gap:16px;">
              <button id="kisan-main-mic-btn" class="kisan-voice-mic-main-btn" aria-label="Tap to speak or interrupt">
                🎙️
              </button>
              <button id="kisan-interrupt-btn" class="kisan-interrupt-btn" style="display:none; background:#E63946; color:#ffffff; border:none; border-radius:12px; padding:10px 16px; font-weight:800; font-size:13px; cursor:pointer;" aria-label="Stop Speaking">
                ⏹️ Stop & Speak
              </button>
            </div>
          </div>

          <!-- Spoken Response Box -->
          <div id="kisan-voice-response-box" class="kisan-voice-response-box">
            <div class="kisan-voice-response-header">
              <span class="kisan-voice-response-badge">🔊 उत्तर / సమాధానం</span>
              <div style="display:flex; gap:8px;">
                <button id="kisan-repeat-speech-btn" class="kisan-voice-repeat-btn" aria-label="Repeat speech">
                  <span>🔊 Repeat</span>
                </button>
              </div>
            </div>
            <div id="kisan-voice-response-text" class="kisan-voice-response-text"></div>
            <div id="kisan-voice-action-container" style="margin-top: 12px;"></div>
            
            <!-- Dynamic follow up suggestions -->
            <div id="kisan-followups-container" style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;"></div>
          </div>

          <!-- Quick Spoken Topics for Fast Access -->
          <div class="kisan-voice-topics-section">
            <div class="kisan-voice-topics-title">
              <span>👉</span>
              <span>सीधे दबाकर पूछें (One-Tap Topics):</span>
            </div>
            <div id="kisan-voice-topics-grid" class="kisan-voice-topics-grid">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Optional Text Fallback Input -->
          <div class="kisan-voice-text-fallback">
            <input 
              type="text" 
              id="kisan-voice-text-input" 
              class="kisan-voice-text-input" 
              placeholder="या यहाँ सवाल लिखें (उदा. आज का भाव, टोकन A-104)..."
            />
            <button id="kisan-voice-text-send-btn" class="kisan-voice-text-send-btn">पूछें</button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(modalOverlay);

    renderTopicCards();
    attachEventListeners();
  }

  function renderTopicCards() {
    const grid = document.getElementById('kisan-voice-topics-grid');
    if (!grid) return;

    grid.innerHTML = TOPIC_PRESETS.map(t => {
      const label = t[currentLanguage] || t.hi || t.en;
      return `
        <button class="kisan-voice-topic-card" data-topic-id="${t.id}" aria-label="${label}">
          <span class="kisan-voice-topic-icon">${t.icon}</span>
          <span class="kisan-voice-topic-label">${label}</span>
        </button>
      `;
    }).join('');
  }

  function updateUIState(state, customMessage) {
    const statusText = document.getElementById('kisan-voice-status-text');
    const statusSub = document.getElementById('kisan-voice-status-sub');
    const statusIcon = document.getElementById('kisan-voice-status-icon');
    const wave = document.getElementById('kisan-audio-wave');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');
    const interruptBtn = document.getElementById('kisan-interrupt-btn');

    if (!statusText || !wave || !mainMicBtn) return;

    wave.className = 'kisan-audio-wave';
    mainMicBtn.classList.remove('listening');
    if (interruptBtn) interruptBtn.style.display = 'none';

    if (state === 'listening') {
      statusIcon.textContent = '👂';
      statusText.textContent = 'Listening...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('listening');
      wave.classList.add('active');
      mainMicBtn.classList.add('listening');
    } else if (state === 'thinking') {
      statusIcon.textContent = '⏳';
      statusText.textContent = 'Thinking...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('thinking');
      wave.classList.add('active');
    } else if (state === 'speaking') {
      statusIcon.textContent = '🗣️';
      statusText.textContent = 'Speaking...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('speaking');
      wave.classList.add('speaking');
      if (interruptBtn) interruptBtn.style.display = 'inline-block';
    } else {
      statusIcon.textContent = '🌾';
      statusText.textContent = 'Kisan Mitr';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('tap_to_speak');
    }
  }

  function openVoiceModal(initialPrompt) {
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (initialPrompt) {
        handleVoiceQuery(initialPrompt);
      } else {
        // Welcoming greeting
        const welcomeGreetings = {
          hi: 'नमस्ते किसान भाई। मैं आपका किसान मित्र हूँ। माइक दबाकर अपना सवाल बोलें या नीचे कोई भी विषय चुनें।',
          te: 'నమస్కారం రైతు సోదరా. నేను మీ కిసాన్ మిత్ర సహాయకుడిని. మైక్ నొక్కి మీ సందేహాన్ని మాట్లాడండి.',
          en: 'Hello farmer friend. I am Kisan Mitr, your digital procurement assistant. Tap the mic to speak or choose a topic.'
        };
        const welcomeText = welcomeGreetings[currentLanguage] || welcomeGreetings['hi'];
        const speechCode = currentLanguage === 'te' ? 'te-IN' : (currentLanguage === 'en' ? 'en-IN' : 'hi-IN');
        speakAloud(welcomeText, speechCode);
      }
    }
  }

  function closeVoiceModal() {
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      stopSpeaking();
      if (recognition && isListening) {
        try { recognition.stop(); } catch (e) {}
        isListening = false;
      }
      updateUIState('idle');
    }
  }

  // Voice Interruption & Toggle
  function toggleListening() {
    // If assistant is speaking, farmer interruption takes priority!
    if (isSpeaking) {
      stopSpeaking();
      startRecognitionNow();
      return;
    }

    if (isListening) {
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      isListening = false;
      updateUIState('idle');
      return;
    }

    startRecognitionNow();
  }

  function startRecognitionNow() {
    if (!recognition) {
      initSpeechRecognition();
    }

    if (recognition) {
      try {
        const langCodeMap = {
          'hi': 'hi-IN',
          'te': 'te-IN',
          'en': 'en-IN'
        };
        recognition.lang = langCodeMap[currentLanguage] || 'hi-IN';
        recognition.start();
      } catch (err) {
        console.warn('Recognition start exception, retrying:', err);
        try {
          recognition.abort();
          setTimeout(() => {
            try { recognition.start(); } catch (e) { fallbackPromptQuery(); }
          }, 150);
        } catch (e) {
          fallbackPromptQuery();
        }
      }
    } else {
      fallbackPromptQuery();
    }
  }

  function fallbackPromptQuery() {
    const promptPlaceholder = currentLanguage === 'te' 
      ? 'కిసాన్ మిత్ర ప్రశ్న (మీ సందేహం రాయండి):' 
      : (currentLanguage === 'en' ? 'Ask Kisan Mitr a question:' : 'किसान मित्र से पूछें (अपना सवाल यहाँ लिखें):');
    const promptText = prompt(promptPlaceholder, '');
    if (promptText && promptText.trim()) {
      handleVoiceQuery(promptText.trim());
    }
  }

  async function handleVoiceQuery(userQuery) {
    if (!userQuery || !userQuery.trim()) return;

    // Interrupt any ongoing speech immediately
    stopSpeaking();
    updateUIState('thinking');

    // Get any active token from session or URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    let farmerId = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const user = JSON.parse(localStorage.getItem('kisansetu_user') || '{}');
        farmerId = user.id || null;
      } catch (e) {}
    }

    // Maintain conversation history for follow-up context
    conversationHistory.push({ role: 'user', content: userQuery });
    if (conversationHistory.length > 8) {
      conversationHistory = conversationHistory.slice(-8);
    }

    try {
      const response = await fetch('/api/gemini/voice-assistant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: userQuery,
          language: currentLanguage,
          tokenNumber: tokenFromUrl,
          farmerId: farmerId,
          history: conversationHistory
        })
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (data && data.success && (data.spokenResponse || data.markdownResponse)) {
        const answer = data.spokenResponse || data.markdownResponse;
        
        // Add to history
        conversationHistory.push({ role: 'assistant', content: answer });
        
        // Auto-adapt language if response returned a specific language
        if (data.speechLang) {
          const codePrefix = data.speechLang.split('-')[0];
          if (['hi', 'te', 'en'].includes(codePrefix) && codePrefix !== currentLanguage) {
            setAssistantLanguage(codePrefix, false);
          }
        }

        displayAndSpeakResponse(
          answer, 
          data.speechLang || 'hi-IN', 
          data.actionUrl, 
          data.matchedToken, 
          data.followUpSuggestions
        );
      } else {
        // Fallback local query intelligence
        const cleanQ = userQuery.toLowerCase();
        let fallbackMsg = '';
        let targetUrl = '/schedule.html';

        if (cleanQ.includes('token') || cleanQ.includes('status') || cleanQ.includes('టోకెన్') || cleanQ.includes('टोकन')) {
          fallbackMsg = currentLanguage === 'te' 
            ? 'మీ టోకెన్ స్థితిని ట్రాక్ చేయడానికి స్టేటస్ పేజీని చూడండి.' 
            : (currentLanguage === 'en' ? 'To track your token and queue position, please open the Track Status page.' : 'अपने टोकन की स्थिति देखने के लिए कृपया स्टेटस पेज खोलें।');
          targetUrl = '/status.html';
        } else if (cleanQ.includes('center') || cleanQ.includes('కేంద్రం') || cleanQ.includes('मंडी') || cleanQ.includes('केंद्र')) {
          fallbackMsg = currentLanguage === 'te' 
            ? 'సమీప ప్రభుత్వ ధాన్య కొనుగోలు కేంద్రాలు మరియు వేళలు సెంటర్స్ పేజీలో ఉన్నాయి.' 
            : (currentLanguage === 'en' ? 'Nearest procurement centers and operational hours are available on the Centers page.' : 'निकटतम सरकारी खरीद केंद्र और समय की जानकारी सेंटर्स पेज पर उपलब्ध है।');
          targetUrl = '/centers.html';
        } else {
          fallbackMsg = currentLanguage === 'te' 
            ? 'నమస్కారం రైతు సోదరా, పంట స్లాట్ బుకింగ్ మరియు వివరాలు కిసాన్ సేతు పోర్టల్ లో అందుబాటులో ఉన్నాయి.' 
            : (currentLanguage === 'en' ? 'Hello farmer friend. Crop procurement schedules and slot bookings are available on KisanSetu.' : 'नमस्ते किसान भाई, खरीद समय सारणी और स्लॉट बुकिंग किसान सेतु पर उपलब्ध है।');
          targetUrl = '/schedule.html';
        }

        displayAndSpeakResponse(fallbackMsg, currentLanguage === 'te' ? 'te-IN' : (currentLanguage === 'en' ? 'en-IN' : 'hi-IN'), targetUrl);
      }
    } catch (err) {
      console.error('Voice assistant request notice:', err);
      const errVoice = currentLanguage === 'te' 
        ? 'నమస్కారం, కొనుగోలు వివరాల కోసం షెడ్యూల్ పేజీ చూడండి.' 
        : (currentLanguage === 'en' ? 'Procurement details and slot booking are available on the Schedule page.' : 'नमस्ते किसान भाई, खरीद समय सारणी देखने के लिए शेड्यूल पेज खोलें।');
      displayAndSpeakResponse(errVoice, currentLanguage === 'te' ? 'te-IN' : (currentLanguage === 'en' ? 'en-IN' : 'hi-IN'), '/schedule.html');
    }
  }

  function displayAndSpeakResponse(text, langCode, actionUrl, tokenData, followUps) {
    lastSpokenText = text;
    lastSpeechLang = langCode;

    const responseBox = document.getElementById('kisan-voice-response-box');
    const responseTextEl = document.getElementById('kisan-voice-response-text');
    const actionContainer = document.getElementById('kisan-voice-action-container');
    const followupsContainer = document.getElementById('kisan-followups-container');

    if (responseBox && responseTextEl) {
      responseBox.classList.add('visible');
      responseTextEl.textContent = text;

      if (actionContainer) {
        actionContainer.innerHTML = '';
        if (actionUrl) {
          const actionBtn = document.createElement('a');
          actionBtn.href = actionUrl;
          actionBtn.className = 'kisan-voice-action-btn';
          const btnLabel = tokenData 
            ? `👉 टोकन ${tokenData.token_number || tokenData.token} लाइव स्थिति देखें`
            : (actionUrl.includes('status') ? '👉 टोकन स्थिति देखें' : (actionUrl.includes('request') ? '👉 स्लॉट बुक करें' : '👉 विवरण देखें'));
          actionBtn.innerHTML = `<span>${btnLabel}</span>`;
          actionContainer.appendChild(actionBtn);
        }
      }

      if (followupsContainer) {
        followupsContainer.innerHTML = '';
        if (Array.isArray(followUps) && followUps.length > 0) {
          followUps.forEach(f => {
            const chip = document.createElement('button');
            chip.style.cssText = 'background:#ffffff; border:1px solid #2D6A4F; color:#2D6A4F; padding:4px 10px; border-radius:14px; font-size:12px; font-weight:700; cursor:pointer;';
            chip.textContent = f;
            chip.addEventListener('click', () => handleVoiceQuery(f));
            followupsContainer.appendChild(chip);
          });
        }
      }
    }

    speakAloud(text, langCode);
  }

  function speakAloud(text, langCode) {
    if (!('speechSynthesis' in window)) {
      updateUIState('idle');
      return;
    }

    stopSpeaking();

    // Clean plain spoken text for natural synthesis without awkward punctuation
    const cleanSpeechText = text
      .replace(/[*#_`~[\]()<>]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanSpeechText) {
      updateUIState('idle');
      return;
    }

    currentSpeechUtterance = new SpeechSynthesisUtterance(cleanSpeechText);
    currentSpeechUtterance.lang = langCode || (currentLanguage === 'te' ? 'te-IN' : (currentLanguage === 'en' ? 'en-IN' : 'hi-IN'));
    currentSpeechUtterance.rate = 0.94;
    currentSpeechUtterance.pitch = 1.0;

    // Select natural matching voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetLang = currentSpeechUtterance.lang;
      const matchedVoice = voices.find(v => v.lang === targetLang) ||
                           voices.find(v => v.lang.startsWith(targetLang.split('-')[0])) ||
                           voices.find(v => v.lang.includes('IN'));
      if (matchedVoice) {
        currentSpeechUtterance.voice = matchedVoice;
      }
    }

    currentSpeechUtterance.onstart = function () {
      isSpeaking = true;
      updateUIState('speaking');
    };

    currentSpeechUtterance.onend = function () {
      isSpeaking = false;
      updateUIState('idle');
    };

    currentSpeechUtterance.onerror = function (e) {
      isSpeaking = false;
      updateUIState('idle');
    };

    window.speechSynthesis.speak(currentSpeechUtterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    isSpeaking = false;
  }

  function setAssistantLanguage(lang, announce) {
    if (!['hi', 'te', 'en'].includes(lang)) return;
    currentLanguage = lang;
    localStorage.setItem('kisansetu_lang', lang);

    document.querySelectorAll('.kisan-voice-lang-pill').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });

    renderTopicCards();
    initSpeechRecognition();

    if (announce) {
      const greetingMessages = {
        hi: 'हिन्दी भाषा चुनी गई है। बोलकर पूछें।',
        te: 'తెలుగు వాయిస్ సహాయం ఎంచుకున్నారు. మాట్లాడండి.',
        en: 'English voice assistance selected. Please speak.'
      };
      const greeting = greetingMessages[lang] || greetingMessages['hi'];
      const speechCode = lang === 'te' ? 'te-IN' : (lang === 'en' ? 'en-IN' : 'hi-IN');
      speakAloud(greeting, speechCode);
    }
  }

  function attachEventListeners() {
    const fabBtn = document.getElementById('kisan-voice-fab-btn');
    const closeBtn = document.getElementById('kisan-voice-close-btn');
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');
    const interruptBtn = document.getElementById('kisan-interrupt-btn');
    const repeatBtn = document.getElementById('kisan-repeat-speech-btn');
    const sendBtn = document.getElementById('kisan-voice-text-send-btn');
    const textInput = document.getElementById('kisan-voice-text-input');

    if (fabBtn) {
      fabBtn.addEventListener('click', () => openVoiceModal());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeVoiceModal);
    }

    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeVoiceModal();
      });
    }

    if (mainMicBtn) {
      mainMicBtn.addEventListener('click', toggleListening);
    }

    if (interruptBtn) {
      interruptBtn.addEventListener('click', function () {
        stopSpeaking();
        startRecognitionNow();
      });
    }

    if (repeatBtn) {
      repeatBtn.addEventListener('click', function () {
        if (lastSpokenText) {
          speakAloud(lastSpokenText, lastSpeechLang);
        }
      });
    }

    if (sendBtn && textInput) {
      sendBtn.addEventListener('click', function () {
        const val = textInput.value.trim();
        if (val) {
          textInput.value = '';
          handleVoiceQuery(val);
        }
      });

      textInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const val = textInput.value.trim();
          if (val) {
            textInput.value = '';
            handleVoiceQuery(val);
          }
        }
      });
    }

    // Language pills
    document.querySelectorAll('.kisan-voice-lang-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        const lang = this.getAttribute('data-lang');
        if (lang) {
          setAssistantLanguage(lang, true);
        }
      });
    });

    // Topic quick cards click handler
    document.addEventListener('click', function (e) {
      const card = e.target.closest('.kisan-voice-topic-card');
      if (card) {
        const topicId = card.getAttribute('data-topic-id');
        const topic = TOPIC_PRESETS.find(t => t.id === topicId);
        if (topic) {
          const query = topic[`query_${currentLanguage}`] || topic.query_hi || topic.query_en;
          handleVoiceQuery(query);
        }
      }
    });

    // Global shortcut: Escape closes modal
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeVoiceModal();
      }
    });
  }

  // Auto-boot UI when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createVoiceAssistantUI();
      initSpeechRecognition();
    });
  } else {
    createVoiceAssistantUI();
    initSpeechRecognition();
  }

  // Pre-load synthesis voices in Chromium browsers
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function () {
      window.speechSynthesis.getVoices();
    };
  }

  // Expose global helper so any page button can trigger Kisan Mitr
  window.KisanVoiceAssistant = {
    open: openVoiceModal,
    close: closeVoiceModal,
    speak: speakAloud,
    ask: handleVoiceQuery,
    stop: stopSpeaking
  };

})();
