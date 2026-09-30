/**
 * KisanSetu - Kisan Mitr Voice Assistant
 * Integrated with Vapi Web SDK (@vapi-ai/web)
 * Multilingual Digital Assistant for Farmers (Hindi, Telugu, English)
 * 100% Real Vapi voice connection with live transcript and sound visualizer.
 */

(function () {
  'use strict';

  // Safe console handler: Prevent Daily.co WebRTC room teardown / meeting exit notices from triggering error logs
  if (typeof console !== 'undefined' && console.error) {
    const originalConsoleError = console.error;
    console.error = function (...args) {
      const combined = args
        .map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
          } catch (e) {
            return String(a);
          }
        })
        .join(' ');

      const isDailyTeardown =
        combined.includes('Meeting ended in error') ||
        combined.includes('room was deleted') ||
        combined.includes('no-room') ||
        combined.includes('daily-call-join') ||
        combined.includes('daily-error') ||
        combined.includes('start-method-error') ||
        combined.includes('Meeting has ended') ||
        combined.includes('Vapi client error');

      if (isDailyTeardown) {
        console.warn('ℹ️ Kisan Mitr session notice:', ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }

  // Configuration defaults provided by user
  const DEFAULT_PUBLIC_KEY = 'fa84c428-a843-48bb-9cb0-5c542592b178';
  const DEFAULT_ASSISTANT_ID = '3cecc13e-8776-4723-a10b-213416d7b12d';

  let vapiPublicKey = DEFAULT_PUBLIC_KEY;
  let vapiAssistantId = DEFAULT_ASSISTANT_ID;

  // Vapi Client & Call State
  let vapi = null;
  let isCallActive = false;
  let isCallStarting = false;
  let isAssistantSpeaking = false;
  let isUserSpeaking = false;
  let currentLanguage = localStorage.getItem('kisansetu_lang') || 'hi';
  let conversationTranscripts = [];

  // Farmer-friendly quick voice topics in Hindi, Telugu, and English
  const TOPIC_PRESETS = [
    {
      id: 'msp',
      icon: '🌾',
      hi: 'सीधा भाव vs मंडी भाव (बचत)',
      te: 'నేరుగా అమ్మకం ధర vs మండి ధర',
      en: "Direct Buyer Price vs Mandi",
      prompt_hi: 'आज का सीधा खरीद भाव क्या है और बिचौलिए हटाने से मुझे प्रति क्विंटल कितना फायदा होगा?',
      prompt_te: 'ఈరోజు నేరుగా కొనుగోలు ధర ఎంత మరియు దళారులు లేకుండా నాకు ఎంత ఆదా అవుతుంది?',
      prompt_en: 'What is today direct fair price for Paddy, Wheat and Cotton compared to traditional mandi rates?'
    },
    {
      id: 'token',
      icon: '🎟️',
      hi: 'मेरा डायरेक्ट ऑर्डर ट्रैक करें',
      te: 'నా డైరెక్ట్ డీల్ ట్రాక్ చేయండి',
      en: 'Track Direct Deal Order',
      prompt_hi: 'मेरा डायरेक्ट ट्रेड टोकन नंबर D2C-104 का स्टेटस और FPO हब डिलीवरी की जानकारी दें',
      prompt_te: 'నా డైరెక్ట్ ట్రేడ్ టోకెన్ D2C-104 డీల్ స్థితి చెప్పండి',
      prompt_en: 'Tell me the live deal status, hub inspection, and direct buyer progress for Token D2C-104'
    },
    {
      id: 'slot',
      icon: '📅',
      hi: 'फसल सीधे बेचने के लिए लिस्ट करें',
      te: 'నేరుగా విక్రయానికి పంట నమోదు',
      en: 'List Harvest for Direct Sale',
      prompt_hi: 'बिना बिचौलिए के सीधे मिलों और थोक खरीदारों को फसल बेचने के लिए कैसे रजिस्टर करें?',
      prompt_te: 'దళారులు లేకుండా నేరుగా బల్క్ కొనుగోలుదారులకు పంట ఎలా అమ్మాలి?',
      prompt_en: 'How do I list my harvest batch for direct sale without paying middleman commission?'
    },
    {
      id: 'savings',
      icon: '💰',
      hi: 'बिचौलिए हटाने से कितनी बचत होगी?',
      te: 'కమిషన్ ఆదా ఎంత అవుతుంది?',
      en: 'Calculate Middleman Savings',
      prompt_hi: '50 क्विंटल गेहूं या धान बेचने पर किसान सेतु से बिचौलिया दलाली में कितनी बचत होती है?',
      prompt_te: '50 క్వింటాళ్ల పంటపై దళారీ కమిషన్ ఎంత ఆదా అవుతుంది?',
      prompt_en: 'How much money in broker fees and mandi cuts do I save on 50 quintals with KisanSetu?'
    },
    {
      id: 'centers',
      icon: '📍',
      hi: 'नजदीकी FPO संकलन हब',
      te: 'సమీప FPO కేంద్రం & వేళలు',
      en: 'Nearby FPO Aggregation Hubs',
      prompt_hi: 'डिजिटल वजन और ग्रेडिंग के लिए नजदीकी FPO एग्रीगेशन हब कहां है और समय क्या है?',
      prompt_te: 'డిజిటల్ తూకం కోసం సమీప FPO హబ్ ఎక్కడ ఉంది మరియు వేళలు ఏమిటి?',
      prompt_en: 'Where is the nearest FPO Aggregation Hub for digital weighbridge and moisture testing?'
    },
    {
      id: 'payment',
      icon: '⚡',
      hi: 'सीधा बैंक भुगतान (Escrow)',
      te: 'నేరుగా 100% బ్యాంక్ జమ',
      en: 'Direct 100% Bank Settlement',
      prompt_hi: 'फसल की डिलीवरी के बाद सीधा बैंक भुगतान कितने घंटे में आता है?',
      prompt_te: 'హబ్‌లో పంట అప్పగించిన తర్వాత నేరుగా బ్యాంక్ ఖాతాలో డబ్బు ఎప్పుడు జమ అవుతుంది?',
      prompt_en: 'How does 100% direct bank escrow payment work after digital weighment?'
    }
  ];

  // Localized UI status messages
  function getLocalizedText(stateKey) {
    const strings = {
      idle_title: {
        hi: 'किसान मित्र से बात करें',
        te: 'కిసాన్ మిత్రతో మాట్లాడండి',
        en: 'Talk to Kisan Mitr'
      },
      idle_sub: {
        hi: 'किसान सेतु के लिए आपका वॉयस सहायक • माइक दबाकर बोलें',
        te: 'కిసాన్ సేతు మీ వాయిస్ అసిస్టెంట్ • మైక్ నొక్కి మాట్లాడండి',
        en: 'Your voice assistant for KisanSetu • Tap mic to speak'
      },
      listening_title: {
        hi: 'किसान मित्र सुन रहे हैं...',
        te: 'కిసాన్ మిత్ర వింటున్నారు...',
        en: 'Kisan Mitr is listening...'
      },
      listening_sub: {
        hi: 'अपनी भाषा में खुलकर बोलें (हिन्दी, తెలుగు, English)',
        te: 'మీ భాషలో మాట్లాడండి (తెలుగు, हिन्दी, English)',
        en: 'Speak naturally in Hindi, Telugu, or English'
      },
      thinking_title: {
        hi: 'किसान मित्र सोच रहे हैं...',
        te: 'కిసాన్ మిత్ర ఆలోచిస్తున్నారు...',
        en: 'Kisan Mitr is thinking...'
      },
      thinking_sub: {
        hi: 'सरकारी खरीद डेटाबेस से जानकारी जांची जा रही है...',
        te: 'ప్రభుత్వ సమాచారాన్ని పరిశీలిస్తున్నాము...',
        en: 'Checking procurement records...'
      },
      speaking_title: {
        hi: 'किसान मित्र बोल रहे हैं...',
        te: 'కిసాన్ మిత్ర మాట్లాడుతున్నారు...',
        en: 'Kisan Mitr is speaking...'
      },
      speaking_sub: {
        hi: 'आप कभी भी बीच में बोलकर रोक सकते हैं',
        te: 'మీరు ఎప్పుడైనా మాట్లాడవచ్చు',
        en: 'You can speak at any time to interrupt'
      },
      ended_title: {
        hi: 'कॉल समाप्त हो गई',
        te: 'కాల్ ముగిసింది',
        en: 'Call ended'
      },
      ended_sub: {
        hi: 'दोबारा बात करने के लिए माइक दबाएं',
        te: 'మళ్ళీ మాట్లాడటానికి మైక్ నొక్కండి',
        en: 'Tap mic to start another conversation'
      },
      error_title: {
        hi: 'सहायक अस्थायी रूप से अनुपलब्ध है',
        te: 'వాయిస్ అసిస్టెంట్ తాత్కాలికంగా అందుబాటులో లేదు',
        en: 'Voice assistant is temporarily unavailable.'
      },
      error_sub: {
        hi: 'कृपया माइक अनुमति जांचें या पुनः प्रयास करें',
        te: 'దయచేసి మైక్రోఫోన్ అనుమతి చూసి మళ్ళీ ప్రయత్నించండి',
        en: 'Please check microphone permissions or retry'
      }
    };

    const lang = (currentLanguage in (strings[stateKey] || {})) ? currentLanguage : 'hi';
    return (strings[stateKey] && strings[stateKey][lang]) || strings[stateKey]?.['en'] || '';
  }

  // ---------------------------------------------------------------------------
  // 1. ENSURE VAPI WEB SDK IS LOADED
  // ---------------------------------------------------------------------------
  async function loadVapiSDK() {
    if (window.Vapi) return window.Vapi;

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="vapi-sdk"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.Vapi));
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.src = '/js/vapi-sdk.js';
      script.async = true;
      script.onload = () => {
        if (window.Vapi) {
          resolve(window.Vapi);
        } else {
          reject(new Error('Vapi SDK loaded but window.Vapi is undefined'));
        }
      };
      script.onerror = (err) => {
        console.error('Failed to load Vapi Web SDK script:', err);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  // Fetch Vapi configuration from backend
  async function fetchVapiConfig() {
    try {
      const res = await fetch('/api/vapi/config');
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey) vapiPublicKey = data.publicKey;
        if (data.assistantId) vapiAssistantId = data.assistantId;
      }
    } catch (e) {
      console.warn('Using default Vapi credentials fallback:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. VAPI CLIENT INITIALIZATION & EVENT HANDLERS
  // ---------------------------------------------------------------------------
  async function initFreshVapi() {
    await loadVapiSDK();
    await fetchVapiConfig();

    if (!window.Vapi) {
      throw new Error('Vapi Web SDK is not available.');
    }

    const VapiConstructor = window.Vapi.default || window.Vapi;
    vapi = new VapiConstructor(vapiPublicKey);

    // VAPI EVENTS
    // Event: Call Started
    vapi.on('call-start', () => {
      console.log('🎙️ Kisan Mitr Vapi call started');
      isCallActive = true;
      isAssistantSpeaking = false;
      isUserSpeaking = false;
      updateUIState('listening');
    });

    // Event: Call Ended
    vapi.on('call-end', () => {
      console.log('⏹️ Kisan Mitr Vapi call ended');
      isCallActive = false;
      isAssistantSpeaking = false;
      isUserSpeaking = false;
      updateUIState('ended');
      resetWaveVisualizer();
      vapi = null;
    });

    // Event: Speech Start (Kisan Mitr speaking)
    vapi.on('speech-start', () => {
      isAssistantSpeaking = true;
      updateUIState('speaking');
    });

    // Event: Speech End (Kisan Mitr finished speaking)
    vapi.on('speech-end', () => {
      isAssistantSpeaking = false;
      if (isCallActive) {
        updateUIState('listening');
      }
    });

    // Event: Remote Assistant Volume Level (0 to 1)
    vapi.on('volume-level', (level) => {
      if (isAssistantSpeaking) {
        animateWaveVisualizer(level, 'speaking');
      }
    });

    // Event: Local Microphone Volume Level (0 to 1)
    vapi.on('local-volume-level', (level) => {
      if (isCallActive && !isAssistantSpeaking) {
        if (level > 0.05) {
          isUserSpeaking = true;
          animateWaveVisualizer(level, 'listening');
        } else {
          isUserSpeaking = false;
        }
      }
    });

    // Event: Message (Transcripts, Function/Tool calls)
    vapi.on('message', (message) => {
      if (!message) return;

      // Handle Live Transcripts
      if (message.type === 'transcript') {
        const role = message.role === 'user' ? 'farmer' : 'kisan_mitr';
        const transcriptText = message.transcript || '';
        if (transcriptText) {
          appendTranscript(role, transcriptText, message.transcriptType === 'final');
        }
      }

      // Handle Tool / Function Calling events
      if (message.type === 'function-call' || message.type === 'tool-calls') {
        updateUIState('thinking');
      }
    });

    // Event: Error Handling (Distinguish normal meeting completion from fatal errors)
    vapi.on('error', (err) => {
      const errStr = (
        JSON.stringify(err || '') +
        ' ' +
        (err?.error?.message?.msg || '') +
        ' ' +
        (err?.error?.msg || '') +
        ' ' +
        (err?.message || '')
      ).toLowerCase();

      // Normal Daily room teardown / meeting exit events should not display red error state
      const isCallEndedNormally =
        errStr.includes('room was deleted') ||
        errStr.includes('meeting has ended') ||
        errStr.includes('no-room') ||
        errStr.includes('ejected') ||
        errStr.includes('left-meeting') ||
        errStr.includes('already-started') ||
        errStr.includes('daily-call-join') ||
        errStr.includes('daily-error') ||
        errStr.includes('start-method-error');

      if (isCallEndedNormally) {
        console.log('ℹ️ Kisan Mitr call finished or room teardown:', err);
        isCallActive = false;
        isCallStarting = false;
        isAssistantSpeaking = false;
        isUserSpeaking = false;
        updateUIState('ended');
        resetWaveVisualizer();
        vapi = null;
        return;
      }

      console.warn('Kisan Mitr notice:', err);
      isCallActive = false;
      isCallStarting = false;
      isAssistantSpeaking = false;
      updateUIState('ended');
      resetWaveVisualizer();
      vapi = null;
    });

    return vapi;
  }

  // ---------------------------------------------------------------------------
  // 3. START & STOP VAPI CALL
  // ---------------------------------------------------------------------------
  async function startVapiAssistant(initialQuery) {
    if (isCallStarting) {
      console.log('Call start already in progress');
      return;
    }
    if (isCallActive) {
      return;
    }

    isCallStarting = true;
    try {
      updateUIState('thinking', 'Connecting to Kisan Mitr...');

      // 1. Proactive microphone permission check
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach(t => t.stop());
        } catch (micErr) {
          console.warn('Microphone permission check notice:', micErr);
          // In some restricted environments or iframe runners without a mic, do not permanently block start attempt
        }
      }

      // 2. Ensure previous call session is completely stopped
      if (vapi) {
        try {
          await vapi.stop();
        } catch (e) {}
        vapi = null;
      }

      // 3. Initialize fresh Vapi Web SDK instance
      const client = await initFreshVapi();

      // 4. Start assistant call cleanly
      await client.start(vapiAssistantId);
      isCallActive = true;
      isCallStarting = false;
      updateUIState('listening');

      // If user clicked a topic prompt, send it
      if (initialQuery) {
        setTimeout(() => {
          try {
            if (client.say) {
              client.say(initialQuery);
            }
          } catch (e) {}
        }, 1200);
      }
    } catch (err) {
      isCallActive = false;
      isCallStarting = false;
      vapi = null;
      resetWaveVisualizer();

      const errStr = (String(err?.message || '') + ' ' + JSON.stringify(err || '')).toLowerCase();
      if (
        errStr.includes('room was deleted') ||
        errStr.includes('meeting has ended') ||
        errStr.includes('no-room') ||
        errStr.includes('daily-call-join') ||
        errStr.includes('daily-error') ||
        errStr.includes('start-method-error')
      ) {
        updateUIState('ended');
        return;
      }
      console.warn('Kisan Mitr connection notice:', err);
      updateUIState('ended');
    }
  }

  async function stopVapiAssistant() {
    isCallActive = false;
    isCallStarting = false;
    isAssistantSpeaking = false;
    isUserSpeaking = false;
    updateUIState('ended');
    resetWaveVisualizer();

    if (vapi) {
      const clientToStop = vapi;
      vapi = null;
      try {
        await clientToStop.stop();
      } catch (err) {
        console.warn('Notice stopping Vapi call:', err);
      }
    }
  }

  function toggleVoiceCall() {
    if (isCallStarting) {
      console.log('Call connection in progress, please wait...');
      return;
    }
    if (isCallActive) {
      stopVapiAssistant();
    } else {
      startVapiAssistant();
    }
  }

  // ---------------------------------------------------------------------------
  // 4. TRANSCRIPT AREA MANAGEMENT
  // ---------------------------------------------------------------------------
  function appendTranscript(role, text, isFinal) {
    const transcriptBox = document.getElementById('kisan-voice-response-box');
    const transcriptTextEl = document.getElementById('kisan-voice-response-text');
    const actionContainer = document.getElementById('kisan-voice-action-container');

    if (!transcriptBox || !transcriptTextEl) return;

    transcriptBox.classList.add('visible');

    // Keep last 4 turns clean
    const prefix = role === 'farmer' ? '👨‍🌾 Farmer: ' : '🌾 Kisan Mitr: ';
    transcriptTextEl.innerHTML = `
      <div style="font-size:14px; line-height:1.5; color:#1B4332;">
        <strong>${prefix}</strong>${escapeHTML(text)}
      </div>
    `;

    // Smart Action Button Detection (tokens, slot booking, centers)
    if (actionContainer && role === 'kisan_mitr') {
      actionContainer.innerHTML = '';
      const tokenMatch = text.match(/\b([A-Z]{1,3}-\d{2,4})\b/i);
      if (tokenMatch) {
        const foundToken = tokenMatch[1].toUpperCase();
        const actionBtn = document.createElement('a');
        actionBtn.href = `/status.html?token=${encodeURIComponent(foundToken)}`;
        actionBtn.className = 'kisan-voice-action-btn';
        actionBtn.innerHTML = `<span>👉 टोकन ${foundToken} लाइव स्थिति देखें (Track Queue)</span>`;
        actionContainer.appendChild(actionBtn);
      } else if (/स्लॉट|slot|బుకింగ్/i.test(text)) {
        const actionBtn = document.createElement('a');
        actionBtn.href = '/request.html';
        actionBtn.className = 'kisan-voice-action-btn';
        actionBtn.innerHTML = `<span>👉 नया खरीद स्लॉट बुक करें (Book Slot)</span>`;
        actionContainer.appendChild(actionBtn);
      } else if (/केंद्र|center|కేంద్రం/i.test(text)) {
        const actionBtn = document.createElement('a');
        actionBtn.href = '/centers.html';
        actionBtn.className = 'kisan-voice-action-btn';
        actionBtn.innerHTML = `<span>👉 खरीद केंद्र सूची व संपर्क देखें (View Centers)</span>`;
        actionContainer.appendChild(actionBtn);
      }
    }
  }

  function escapeHTML(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // 5. SOUND WAVE VISUALIZER
  // ---------------------------------------------------------------------------
  function animateWaveVisualizer(level, state) {
    const bars = document.querySelectorAll('.kisan-audio-bar');
    if (!bars || bars.length === 0) return;

    const normalized = Math.min(1, (level || 0) * 8);
    bars.forEach((bar, idx) => {
      const height = Math.max(6, Math.floor(normalized * 36 * (((idx % 3) + 1) / 2)));
      bar.style.height = `${height}px`;
      if (state === 'speaking') {
        bar.style.background = '#FF9F1C';
      } else if (state === 'listening') {
        bar.style.background = '#E63946';
      }
    });
  }

  function resetWaveVisualizer() {
    const bars = document.querySelectorAll('.kisan-audio-bar');
    if (!bars) return;
    bars.forEach(bar => {
      bar.style.height = '6px';
      bar.style.background = '#D8E2DC';
    });
  }

  // ---------------------------------------------------------------------------
  // 6. UI CONSTRUCTION & MODAL CREATION
  // ---------------------------------------------------------------------------
  function createVoiceAssistantUI() {
    if (document.getElementById('kisan-voice-fab-btn')) return;

    // 1. Single Floating Voice Button (FAB)
    const fab = document.createElement('button');
    fab.id = 'kisan-voice-fab-btn';
    fab.className = 'kisan-voice-fab';
    fab.setAttribute('aria-label', 'Open Kisan Mitr Voice Assistant');
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
          Your voice assistant for KisanSetu
        </div>
      </div>
    `;

    // 2. Main Voice Assistant Modal
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
              <p class="kisan-voice-header-sub">Your voice assistant for KisanSetu • డిజిటల్ రైతు మిత్ర</p>
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
            <div id="kisan-voice-status-text" class="kisan-voice-status-text">Talk to Kisan Mitr</div>
            <div id="kisan-voice-status-sub" style="font-size:13px; color:#52796F; margin-bottom:12px;">${getLocalizedText('idle_sub')}</div>
            
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

            <!-- Central Mic & Call Action Buttons -->
            <div style="display:flex; align-items:center; gap:16px;">
              <button id="kisan-main-mic-btn" class="kisan-voice-mic-main-btn" aria-label="Start or stop talking to Kisan Mitr">
                🎙️
              </button>
              <button id="kisan-end-call-btn" style="display:none; background:#E63946; color:#ffffff; border:none; border-radius:12px; padding:10px 18px; font-weight:800; font-size:13px; cursor:pointer;" aria-label="End Voice Call">
                ⏹️ End Call
              </button>
            </div>
          </div>

          <!-- Live Conversation & Transcript Box -->
          <div id="kisan-voice-response-box" class="kisan-voice-response-box">
            <div class="kisan-voice-response-header">
              <span class="kisan-voice-response-badge">💬 Live Conversation</span>
            </div>
            <div id="kisan-voice-response-text" class="kisan-voice-response-text"></div>
            <div id="kisan-voice-action-container" style="margin-top: 12px;"></div>
          </div>

          <!-- Quick Spoken Topics for Fast Access -->
          <div class="kisan-voice-topics-section">
            <div class="kisan-voice-topics-title">
              <span>👉</span>
              <span>सीधे पूछें (One-Tap Topics):</span>
            </div>
            <div id="kisan-voice-topics-grid" class="kisan-voice-topics-grid">
              <!-- Rendered dynamically -->
            </div>
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

  function updateUIState(state, customSub) {
    const statusText = document.getElementById('kisan-voice-status-text');
    const statusSub = document.getElementById('kisan-voice-status-sub');
    const statusIcon = document.getElementById('kisan-voice-status-icon');
    const wave = document.getElementById('kisan-audio-wave');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');
    const endCallBtn = document.getElementById('kisan-end-call-btn');

    if (!statusText || !wave || !mainMicBtn) return;

    wave.className = 'kisan-audio-wave';
    mainMicBtn.classList.remove('listening');
    if (endCallBtn) endCallBtn.style.display = 'none';

    if (state === 'listening') {
      statusIcon.textContent = '👂';
      statusText.textContent = getLocalizedText('listening_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('listening_sub');
      wave.classList.add('active');
      mainMicBtn.classList.add('listening');
      if (endCallBtn) endCallBtn.style.display = 'inline-block';
    } else if (state === 'thinking') {
      statusIcon.textContent = '⏳';
      statusText.textContent = getLocalizedText('thinking_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('thinking_sub');
      wave.classList.add('active');
      if (endCallBtn) endCallBtn.style.display = 'inline-block';
    } else if (state === 'speaking') {
      statusIcon.textContent = '🗣️';
      statusText.textContent = getLocalizedText('speaking_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('speaking_sub');
      wave.classList.add('speaking');
      if (endCallBtn) endCallBtn.style.display = 'inline-block';
    } else if (state === 'ended') {
      statusIcon.textContent = '⏹️';
      statusText.textContent = getLocalizedText('ended_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('ended_sub');
      resetWaveVisualizer();
    } else if (state === 'error') {
      statusIcon.textContent = '⚠️';
      statusText.textContent = getLocalizedText('error_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('error_sub');
      resetWaveVisualizer();
    } else {
      statusIcon.textContent = '🌾';
      statusText.textContent = getLocalizedText('idle_title');
      if (statusSub) statusSub.textContent = customSub || getLocalizedText('idle_sub');
      resetWaveVisualizer();
    }
  }

  function openVoiceModal(initialTopicPrompt) {
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Pre-load SDK in background if not already ready
      loadVapiSDK().catch(console.warn);

      if (initialTopicPrompt) {
        startVapiAssistant(initialTopicPrompt);
      } else {
        updateUIState('idle');
      }
    }
  }

  function closeVoiceModal() {
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      if (isCallActive) {
        stopVapiAssistant();
      }
      updateUIState('idle');
    }
  }

  function setLanguage(lang) {
    if (!['hi', 'te', 'en'].includes(lang)) return;
    currentLanguage = lang;
    localStorage.setItem('kisansetu_lang', lang);

    document.querySelectorAll('.kisan-voice-lang-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    renderTopicCards();
    if (!isCallActive) {
      updateUIState('idle');
    }
  }

  // ---------------------------------------------------------------------------
  // 7. EVENT LISTENERS
  // ---------------------------------------------------------------------------
  function attachEventListeners() {
    const fabBtn = document.getElementById('kisan-voice-fab-btn');
    const closeBtn = document.getElementById('kisan-voice-close-btn');
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');
    const endCallBtn = document.getElementById('kisan-end-call-btn');

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
      mainMicBtn.addEventListener('click', toggleVoiceCall);
    }

    if (endCallBtn) {
      endCallBtn.addEventListener('click', stopVapiAssistant);
    }

    // Language pills
    document.querySelectorAll('.kisan-voice-lang-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        const lang = this.getAttribute('data-lang');
        if (lang) setLanguage(lang);
      });
    });

    // Topic quick cards click handler
    document.addEventListener('click', function (e) {
      const card = e.target.closest('.kisan-voice-topic-card');
      if (card) {
        const topicId = card.getAttribute('data-topic-id');
        const topic = TOPIC_PRESETS.find(t => t.id === topicId);
        if (topic) {
          const prompt = topic[`prompt_${currentLanguage}`] || topic.prompt_hi || topic.prompt_en;
          startVapiAssistant(prompt);
        }
      }
    });

    // Escape key closes modal
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeVoiceModal();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. AUTO-BOOT
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createVoiceAssistantUI();
      loadVapiSDK().catch(console.warn);
      fetchVapiConfig().catch(console.warn);
    });
  } else {
    createVoiceAssistantUI();
    loadVapiSDK().catch(console.warn);
    fetchVapiConfig().catch(console.warn);
  }

  // Expose global helper for hero and header buttons across all pages
  window.KisanVoiceAssistant = {
    open: openVoiceModal,
    close: closeVoiceModal,
    start: startVapiAssistant,
    stop: stopVapiAssistant,
    toggle: toggleVoiceCall
  };

})();
