/**
 * KisanSetu - Gemini Voice Assistant for Farmers
 * Voice-first conversational AI powered by Google Gemini for farmers who cannot read.
 */

(function () {
  let isListening = false;
  let isSpeaking = false;
  let recognition = null;
  let currentSpeechUtterance = null;
  let currentLanguage = localStorage.getItem('kisansetu_lang') || 'hi'; // Default Hindi for broad voice accessibility
  let lastSpokenText = '';
  let lastSpeechLang = 'hi-IN';

  // Voice topics in multiple regional languages
  const TOPIC_PRESETS = [
    {
      id: 'msp',
      icon: '🌾',
      hi: 'आज का सरकारी भाव (MSP)',
      te: 'ఈరోజు మద్దతు ధరలు (MSP)',
      en: 'Current MSP Crop Rates',
      query_hi: 'आज का सरकारी भाव और गेहूं धान का समर्थन मूल्य क्या है?',
      query_te: 'ఈరోజు వరి మరియు గోధుమల మద్దతు ధర ఎంత?',
      query_en: 'What are the current government MSP rates for Wheat and Paddy?'
    },
    {
      id: 'token',
      icon: '🎟️',
      hi: 'मेरा टोकन व कतार स्थिति',
      te: 'నా టోకెన్ స్థితి & క్యూ',
      en: 'My Token Queue Status',
      query_hi: 'मेरा टोकन नंबर A-104 का लाइव स्टेटस और कतार बताओ',
      query_te: 'నా టోకెన్ A-104 స్టేటస్ చెప్పండి',
      query_en: 'Tell me the live queue status of Token A-104'
    },
    {
      id: 'slot',
      icon: '📅',
      hi: 'फसल बेचने का स्लॉट कैसे बुक करें?',
      te: 'స్లాట్ ఎలా బుక్ చేయాలి?',
      en: 'How to Book Drop-off Slot',
      query_hi: 'फसल बेचने के लिए ऑनलाइन टोकन स्लॉट कैसे बुक करें?',
      query_te: 'ధాన్యం సేకరణ కోసం స్లాట్ ఎలా బుక్ చేయాలి?',
      query_en: 'How do I book a crop procurement slot online?'
    },
    {
      id: 'documents',
      icon: '📄',
      hi: 'मंडी में क्या कागज साथ ले जाएं?',
      te: 'కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      en: 'What Documents to Bring',
      query_hi: 'खरीद केंद्र पर क्या क्या दस्तावेज और कागज साथ ले जाने होंगे?',
      query_te: 'కొనుగోలు కేంద్రానికి ఏ పత్రాలు తీసుకురావాలి?',
      query_en: 'What documents are required at the procurement center?'
    },
    {
      id: 'centers',
      icon: '📍',
      hi: 'नजदीकी केंद्र व समय',
      te: 'సమీప కొనుగోలు కేంద్రం వేళలు',
      en: 'Center Timings & Contact',
      query_hi: 'सरकारी खरीद केंद्र का समय क्या है और कैसे संपर्क करें?',
      query_te: 'సమీప కేంద్రం పని వేళలు ఏమిటి?',
      query_en: 'What are the procurement center timings and contact details?'
    }
  ];

  // Initialize Speech Recognition if supported
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Map language code
      const langCodeMap = {
        'hi': 'hi-IN',
        'te': 'te-IN',
        'en': 'en-IN',
        'pa': 'pa-IN',
        'mr': 'mr-IN',
        'ta': 'ta-IN'
      };
      recognition.lang = langCodeMap[currentLanguage] || 'hi-IN';

      recognition.onstart = function () {
        isListening = true;
        updateUIState('listening');
      };

      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Farmer Spoke:', transcript);
        isListening = false;
        handleVoiceQuery(transcript);
      };

      recognition.onerror = function (event) {
        console.warn('Speech recognition error:', event.error);
        isListening = false;
        if (event.error === 'no-speech') {
          updateUIState('idle', getLocalizedMessage('no_speech'));
        } else if (event.error === 'not-allowed') {
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
    }
  }

  function getLocalizedMessage(key) {
    const msgs = {
      listening: {
        hi: 'किसान भाई बोलिए... हम सुन रहे हैं 🌾',
        te: 'రైతు సోదరా మాట్లాడండి... వింటున్నాము 🌾',
        en: 'Listening... Please speak your question 🌾'
      },
      thinking: {
        hi: 'जेमिनी एआई जानकारी खोज रहा है...',
        te: 'జెమినీ ఏఐ సమాచారం వెతుకుతోంది...',
        en: 'Gemini AI is fetching information...'
      },
      speaking: {
        hi: 'किसान मित्र बोल रहा है... ध्यान से सुनें 🔊',
        te: 'రైతు మిత్ర సమాధానం ఇస్తున్నారు... వినండి 🔊',
        en: 'Kisan Mitra is speaking... Listen carefully 🔊'
      },
      tap_to_speak: {
        hi: 'माइक दबाकर बोलें या नीचे कोई भी विषय चुनें',
        te: 'మైక్ నొక్కి మాట్లాడండి లేదా కింద ఎంచుకోండి',
        en: 'Tap the mic to speak or tap any topic below'
      },
      no_speech: {
        hi: 'आवाज सुनाई नहीं दी, कृपया माइक दबाकर फिर बोलें',
        te: 'వాయిస్ వినిపించలేదు, దయచేసి మళ్ళీ మాట్లాడండి',
        en: 'No speech heard. Please tap and speak again.'
      },
      mic_permission: {
        hi: 'कृपया ब्राउज़र में माइक्रोफोन की अनुमति दें',
        te: 'దయచేసి మైక్రోఫోన్ అనుమతి ఇవ్వండి',
        en: 'Please allow microphone access in your browser'
      },
      try_again: {
        hi: 'माइक दबाकर अपना सवाल फिर से पूछें',
        te: 'మళ్ళీ మైక్ నొక్కి మాట్లాడండి',
        en: 'Tap mic and ask again'
      }
    };

    const lang = currentLanguage in msgs[key] ? currentLanguage : 'hi';
    return msgs[key][lang] || msgs[key]['hi'];
  }

  // Inject HTML Elements for Floating FAB and Modal
  function createVoiceAssistantUI() {
    // 1. Floating Action Button (FAB)
    const fab = document.createElement('button');
    fab.id = 'kisan-voice-fab-btn';
    fab.className = 'kisan-voice-fab';
    fab.setAttribute('aria-label', 'Open Google Gemini Voice Assistant for Farmers');
    fab.innerHTML = `
      <div class="kisan-voice-mic-icon-wrap">
        🎙️
      </div>
      <div class="kisan-voice-fab-text">
        <div class="kisan-voice-fab-title">
          <span>Kisan Gemini Voice</span>
          <span class="kisan-voice-fab-badge">AI Assistant</span>
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
      <div class="kisan-voice-modal" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="kisan-voice-header">
          <div class="kisan-voice-header-brand">
            <div class="kisan-voice-avatar">🌾</div>
            <div>
              <h2 class="kisan-voice-header-title">Kisan Mitra AI Voice</h2>
              <p class="kisan-voice-header-sub">Powered by Google Gemini • किसान वाणी सहायता</p>
            </div>
          </div>
          <button id="kisan-voice-close-btn" class="kisan-voice-close-btn" aria-label="Close Assistant">✕</button>
        </div>

        <!-- Body -->
        <div class="kisan-voice-body">
          
          <!-- Language Selector -->
          <div class="kisan-voice-lang-bar">
            <button class="kisan-voice-lang-pill ${currentLanguage === 'hi' ? 'active' : ''}" data-lang="hi">🇮🇳 हिन्दी (Hindi)</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'te' ? 'active' : ''}" data-lang="te">🇮🇳 తెలుగు (Telugu)</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'en' ? 'active' : ''}" data-lang="en">🇬🇧 English</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'pa' ? 'active' : ''}" data-lang="pa">🇮🇳 ਪੰਜਾਬੀ (Punjabi)</button>
            <button class="kisan-voice-lang-pill ${currentLanguage === 'mr' ? 'active' : ''}" data-lang="mr">🇮🇳 मराठी (Marathi)</button>
          </div>

          <!-- Status Card -->
          <div class="kisan-voice-status-card">
            <div id="kisan-voice-status-icon" class="kisan-voice-status-icon">🎙️</div>
            <div id="kisan-voice-status-text" class="kisan-voice-status-text">${getLocalizedMessage('tap_to_speak')}</div>
            
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

            <!-- Big Central Mic Button -->
            <button id="kisan-main-mic-btn" class="kisan-voice-mic-main-btn" aria-label="Tap to speak">
              🎙️
            </button>
          </div>

          <!-- Spoken Response Box -->
          <div id="kisan-voice-response-box" class="kisan-voice-response-box">
            <div class="kisan-voice-response-header">
              <span class="kisan-voice-response-badge">🔊 उत्तर (Spoken Answer)</span>
              <button id="kisan-repeat-speech-btn" class="kisan-voice-repeat-btn">
                <span>🔊 फिर से सुनें (Repeat)</span>
              </button>
            </div>
            <div id="kisan-voice-response-text" class="kisan-voice-response-text"></div>
            <div id="kisan-voice-action-container" style="margin-top: 10px;"></div>
          </div>

          <!-- Quick Spoken Topics for Non-Readers -->
          <div class="kisan-voice-topics-section">
            <div class="kisan-voice-topics-title">
              <span>👉</span>
              <span>सीधे दबाकर सुनें (One-Tap Voice Topics):</span>
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
        <button class="kisan-voice-topic-card" data-topic-id="${t.id}">
          <span class="kisan-voice-topic-icon">${t.icon}</span>
          <span class="kisan-voice-topic-label">${label}</span>
        </button>
      `;
    }).join('');
  }

  function updateUIState(state, customMessage) {
    const statusText = document.getElementById('kisan-voice-status-text');
    const statusIcon = document.getElementById('kisan-voice-status-icon');
    const wave = document.getElementById('kisan-audio-wave');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');

    if (!statusText || !wave || !mainMicBtn) return;

    wave.className = 'kisan-audio-wave';
    mainMicBtn.classList.remove('listening');

    if (state === 'listening') {
      statusIcon.textContent = '👂';
      statusText.textContent = customMessage || getLocalizedMessage('listening');
      wave.classList.add('active');
      mainMicBtn.classList.add('listening');
    } else if (state === 'thinking') {
      statusIcon.textContent = '🧠';
      statusText.textContent = customMessage || getLocalizedMessage('thinking');
      wave.classList.add('active');
    } else if (state === 'speaking') {
      statusIcon.textContent = '🗣️';
      statusText.textContent = customMessage || getLocalizedMessage('speaking');
      wave.classList.add('speaking');
    } else {
      statusIcon.textContent = '🎙️';
      statusText.textContent = customMessage || getLocalizedMessage('tap_to_speak');
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
        // Welcome speech greeting for non-readers on first tap
        const welcomeText = currentLanguage === 'te' 
          ? 'నమస్కారం రైతు సోదరా. నేను మీ కిసాన్ మిత్ర వాయిస్ అసిస్టెంట్‌ని. మైక్ నొక్కి మీ సందేహాన్ని మాట్లాడండి.'
          : 'नमस्ते किसान भाई। मैं आपका किसान मित्र वॉइस असिस्टेंट हूँ। माइक दबाकर अपना सवाल बोलें या नीचे कोई भी विषय चुनें।';
        speakAloud(welcomeText, currentLanguage === 'te' ? 'te-IN' : 'hi-IN');
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
        recognition.stop();
        isListening = false;
      }
      updateUIState('idle');
    }
  }

  function toggleListening() {
    if (isSpeaking) {
      stopSpeaking();
    }

    if (isListening) {
      if (recognition) recognition.stop();
      isListening = false;
      updateUIState('idle');
      return;
    }

    if (!recognition) {
      initSpeechRecognition();
    }

    if (recognition) {
      try {
        const langCodeMap = {
          'hi': 'hi-IN',
          'te': 'te-IN',
          'en': 'en-IN',
          'pa': 'pa-IN',
          'mr': 'mr-IN',
          'ta': 'ta-IN'
        };
        recognition.lang = langCodeMap[currentLanguage] || 'hi-IN';
        recognition.start();
      } catch (err) {
        console.warn('Recognition start exception:', err);
        // Prompt fallback
        fallbackPromptQuery();
      }
    } else {
      fallbackPromptQuery();
    }
  }

  function fallbackPromptQuery() {
    const promptText = prompt(
      currentLanguage === 'te' 
        ? 'రైతు మిత్ర ప్రశ్న (మీ సందేహం రాయండి):'
        : 'किसान मित्र से सवाल पूछें (अपना सवाल यहाँ लिखें या टोकन नंबर डालें):',
      'आज का सरकारी भाव क्या है?'
    );
    if (promptText) {
      handleVoiceQuery(promptText);
    }
  }

  async function handleVoiceQuery(userQuery) {
    if (!userQuery || !userQuery.trim()) return;

    updateUIState('thinking');

    // Get any active token from session or URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const storedUser = localStorage.getItem('kisansetu_user');
    let farmerId = null;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        farmerId = parsed.id;
      } catch (e) {}
    }

    try {
      const response = await fetch('/api/gemini/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          language: currentLanguage,
          tokenNumber: tokenFromUrl,
          farmerId: farmerId
        })
      });

      const data = await response.json();

      if (data.success && data.spokenResponse) {
        displayAndSpeakResponse(data.spokenResponse, data.speechLang || 'hi-IN', data.actionUrl, data.matchedToken);
      } else {
        const fallbackMsg = 'नमस्ते किसान भाई, आपकी जानकारी प्राप्त हो गई है। कृपया फिर से प्रयास करें।';
        displayAndSpeakResponse(fallbackMsg, 'hi-IN');
      }
    } catch (err) {
      console.error('Voice assistant fetch error:', err);
      const errVoice = currentLanguage === 'te' 
        ? 'క్షమించండి, సర్వర్ కనెక్ట్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.'
        : 'क्षमा करें, सर्वर से संपर्क नहीं हो पाया। कृपया माइक दबाकर फिर से बोलें।';
      displayAndSpeakResponse(errVoice, currentLanguage === 'te' ? 'te-IN' : 'hi-IN');
    }
  }

  function displayAndSpeakResponse(text, langCode, actionUrl, tokenData) {
    lastSpokenText = text;
    lastSpeechLang = langCode;

    const responseBox = document.getElementById('kisan-voice-response-box');
    const responseTextEl = document.getElementById('kisan-voice-response-text');
    const actionContainer = document.getElementById('kisan-voice-action-container');

    if (responseBox && responseTextEl) {
      responseBox.classList.add('visible');
      responseTextEl.textContent = text;

      if (actionContainer) {
        actionContainer.innerHTML = '';
        if (actionUrl) {
          const actionBtn = document.createElement('a');
          actionBtn.href = actionUrl;
          actionBtn.className = 'kisan-voice-action-btn';
          actionBtn.innerHTML = `<span>👉</span> <span>${tokenData ? `टोकन ${tokenData.token_number} लाइव स्टेटस देखें` : 'पेज पर जाएं'}</span>`;
          actionContainer.appendChild(actionBtn);
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

    currentSpeechUtterance = new SpeechSynthesisUtterance(text);
    currentSpeechUtterance.lang = langCode || 'hi-IN';
    currentSpeechUtterance.rate = 0.95; // Slightly slower, clear cadence for elderly/rural farmers
    currentSpeechUtterance.pitch = 1.0;

    // Pick best regional voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(langCode.substring(0, 2)) || v.lang === langCode);
    if (matchedVoice) {
      currentSpeechUtterance.voice = matchedVoice;
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
      console.warn('SpeechSynthesis error:', e);
      isSpeaking = false;
      updateUIState('idle');
    };

    window.speechSynthesis.speak(currentSpeechUtterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
  }

  function attachEventListeners() {
    const fabBtn = document.getElementById('kisan-voice-fab-btn');
    const closeBtn = document.getElementById('kisan-voice-close-btn');
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    const mainMicBtn = document.getElementById('kisan-main-mic-btn');
    const repeatBtn = document.getElementById('kisan-repeat-speech-btn');

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

    if (repeatBtn) {
      repeatBtn.addEventListener('click', function () {
        if (lastSpokenText) {
          speakAloud(lastSpokenText, lastSpeechLang);
        }
      });
    }

    // Language switch pills inside voice modal
    document.querySelectorAll('.kisan-voice-lang-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        const lang = this.getAttribute('data-lang');
        currentLanguage = lang;
        localStorage.setItem('kisansetu_lang', lang);

        document.querySelectorAll('.kisan-voice-lang-pill').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        renderTopicCards();
        initSpeechRecognition();

        const greeting = lang === 'te' 
          ? 'తెలుగు వాయిస్ సహాయం ఎంచుకున్నారు. మాట్లాడండి.'
          : (lang === 'en' ? 'English voice assistance selected. Please speak.' : 'हिन्दी भाषा चुनी गई है। बोलकर पूछें।');
        speakAloud(greeting, lang === 'te' ? 'te-IN' : (lang === 'en' ? 'en-IN' : 'hi-IN'));
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

    // Global shortcut: Pressing Space or V while modal open toggles mic
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

  // Expose global helper so any page button can trigger the voice assistant
  window.KisanVoiceAssistant = {
    open: openVoiceModal,
    close: closeVoiceModal,
    speak: speakAloud,
    ask: handleVoiceQuery
  };

})();
