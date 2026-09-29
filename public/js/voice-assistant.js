/**
 * KisanSetu - Kisan Mitr Real-Time Voice Assistant
 * Powered by Google Gemini Live API Real-Time Audio Streaming (Bidirectional WebSocket)
 * Supports natural conversational voice, real-time microphone input, streaming audio response,
 * instant interruption (barge-in), continuous conversation, and multilingual support
 * (Hindi, Telugu, English, and rural farmer dialects).
 */

(function () {
  'use strict';

  // State Management
  let isListening = false;
  let isSpeaking = false;
  let isConnecting = false;
  let currentLanguage = localStorage.getItem('kisansetu_lang') || 'hi';
  let lastSpokenText = '';
  let lastSpeechLang = 'hi-IN';
  let conversationHistory = [];

  // Live WebSocket & Real-Time Audio Streaming State
  let liveWs = null;
  let liveMode = 'connecting'; // 'gemini_live' | 'smart_voice'
  let inputAudioCtx = null;
  let outputAudioCtx = null;
  let micMediaStream = null;
  let micAudioSource = null;
  let audioProcessor = null;
  let nextAudioStartTime = 0;
  let activeAudioSources = [];
  let isMicrophoneActive = false;
  let currentTranscriptBuffer = '';
  let reconnectTimer = null;

  // Fallback Web Speech API
  let recognition = null;
  let currentSpeechUtterance = null;

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

  function getLocalizedMessage(key) {
    const msgs = {
      idle: {
        hi: 'किसान मित्र (Kisan Mitr)',
        te: 'కిసాన్ మిత్ర (Kisan Mitr)',
        en: 'Kisan Mitr'
      },
      connecting: {
        hi: 'Connecting... (कनेक्ट हो रहे हैं...)',
        te: 'Connecting... (కనెక్ట్ అవుతోంది...)',
        en: 'Connecting to Kisan Mitr...'
      },
      listening: {
        hi: 'Listening... (सुन रहे हैं, बोलिए...)',
        te: 'Listening... (వింటున్నాము, మాట్లాడండి...)',
        en: 'Listening... Speak naturally'
      },
      thinking: {
        hi: 'Thinking... (सोच रहे हैं...)',
        te: 'Thinking... (ఆలోచిస్తున్నాము...)',
        en: 'Checking procurement records...'
      },
      speaking: {
        hi: 'Speaking... (किसान मित्र बोल रहे हैं...)',
        te: 'Speaking... (కిసాన్ మిత్ర మాట్లాడుతున్నారు...)',
        en: 'Kisan Mitr Speaking...'
      },
      disconnected: {
        hi: 'Disconnected. Reconnecting...',
        te: 'పునఃసంధానించబడుతోంది...',
        en: 'Disconnected. Reconnecting...'
      },
      tap_to_speak: {
        hi: 'माइक दबाकर बोलें या नीचे कोई भी विषय चुनें',
        te: 'మైక్ నొక్కి మాట్లాడండి లేదా కింద ఎంచుకోండి',
        en: 'Tap mic to speak or select a quick topic below'
      },
      no_speech: {
        hi: 'मैं सुन नहीं पाया। कृपया फिर से बोलें।',
        te: 'వినపడలేదు. దయచేసి మళ్ళీ మాట్లాడండి.',
        en: "I didn't catch that. Please speak again."
      },
      mic_permission: {
        hi: 'माइक्रोफ़ोन की अनुमति आवश्यक है। कृपया ब्राउज़र में माइक चालू करें।',
        te: 'మైక్రోఫోన్ అనుమతి అవసరం. దయచేసి బ్రౌజర్‌లో మైక్రోఫోన్‌ను అనుమతించండి.',
        en: 'Microphone permission is required. Please allow microphone access.'
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

  // ---------------------------------------------------------------------------
  // 1. GEMINI LIVE REAL-TIME WEBSOCKET CONNECTION
  // ---------------------------------------------------------------------------
  function initLiveWebSocket() {
    if (liveWs && (liveWs.readyState === WebSocket.OPEN || liveWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;

      updateUIState('connecting');
      liveWs = new WebSocket(wsUrl);

      liveWs.onopen = function () {
        console.log('🎙️ Kisan Mitr Live Audio WebSocket connected');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      liveWs.onmessage = async function (event) {
        try {
          const msg = JSON.parse(event.data);

          // Status & handshake update
          if (msg.type === 'status') {
            if (msg.mode) liveMode = msg.mode;
            if (msg.state === 'ready') {
              if (isMicrophoneActive) {
                updateUIState('listening');
              } else {
                updateUIState('idle');
              }
            } else if (msg.state === 'connecting') {
              updateUIState('connecting');
            } else if (msg.state === 'disconnected') {
              updateUIState('disconnected');
            }
          }

          // Real-time Audio output chunk (24kHz PCM from Gemini Live)
          else if (msg.type === 'audio' && msg.audio) {
            playLiveAudioChunk(msg.audio);
          }

          // Interruption event (user spoke while model was talking)
          else if (msg.type === 'interrupted') {
            stopLiveAudioPlayback();
            updateUIState('listening');
          }

          // Turn complete: model finished outputting response
          else if (msg.type === 'turnComplete') {
            // Keep listening for continuous back-and-forth conversation!
            if (activeAudioSources.length === 0) {
              updateUIState('listening');
            }
          }

          // Real-time Text Transcript from model
          else if (msg.type === 'transcript' && msg.text) {
            handleLiveTranscriptPart(msg.text);
          }

          // Thinking / database check event
          else if (msg.type === 'thinking') {
            updateUIState('thinking', msg.detail);
          }

        } catch (err) {
          console.warn('Error parsing Live WebSocket message:', err);
        }
      };

      liveWs.onerror = function (err) {
        console.warn('Live WebSocket notice:', err);
        liveMode = 'smart_voice';
      };

      liveWs.onclose = function () {
        console.log('Live WebSocket closed, will retry if modal is open');
        const modal = document.getElementById('kisan-voice-modal-overlay');
        if (modal && modal.classList.contains('active')) {
          reconnectTimer = setTimeout(initLiveWebSocket, 3000);
        }
      };
    } catch (e) {
      console.warn('WebSocket connection init notice:', e);
      liveMode = 'smart_voice';
    }
  }

  // ---------------------------------------------------------------------------
  // 2. REAL-TIME MICROPHONE STREAMING (16kHz PCM CHUNKS)
  // ---------------------------------------------------------------------------
  async function startMicrophoneStreaming() {
    try {
      // 1. Ensure Live WebSocket is open
      if (!liveWs || liveWs.readyState !== WebSocket.OPEN) {
        initLiveWebSocket();
      }

      // 2. Request user microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      micMediaStream = stream;

      // 3. Setup AudioContext at 16,000 Hz for input
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });

      micAudioSource = inputAudioCtx.createMediaStreamSource(stream);

      // ScriptProcessor node to capture raw PCM audio buffer
      audioProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);

      audioProcessor.onaudioprocess = function (e) {
        if (!isMicrophoneActive) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS audio level to animate sound wave and detect voice barge-in
        let sumSquares = 0;
        const len = inputChannelData.length;
        const pcm16 = new Int16Array(len);

        for (let i = 0; i < len; i++) {
          const sample = Math.max(-1, Math.min(1, inputChannelData[i]));
          sumSquares += sample * sample;
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        const rms = Math.sqrt(sumSquares / len);

        // If user speaks loud enough while assistant is speaking, trigger barge-in interrupt!
        if (isSpeaking && rms > 0.08) {
          handleUserInterruption();
        }

        // Animate wave visually with user mic level
        if (isListening && !isSpeaking) {
          animateVisualizerVolume(rms);
        }

        // Stream PCM16 chunk to Gemini Live over WebSocket
        if (liveWs && liveWs.readyState === WebSocket.OPEN) {
          const base64Audio = arrayBufferToBase64(pcm16.buffer);
          liveWs.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        }
      };

      micAudioSource.connect(audioProcessor);
      audioProcessor.connect(inputAudioCtx.destination);

      isMicrophoneActive = true;
      isListening = true;
      updateUIState('listening');

      // Also ensure output AudioContext is primed for low-latency playback
      initOutputAudioContext();

    } catch (err) {
      console.warn('Microphone access notice:', err);
      isMicrophoneActive = false;
      isListening = false;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        updateUIState('idle', getLocalizedMessage('mic_permission'));
      } else {
        updateUIState('idle', getLocalizedMessage('try_again'));
      }

      // Fallback to Web Speech API or text prompt
      initSpeechRecognition();
    }
  }

  function stopMicrophoneStreaming() {
    isMicrophoneActive = false;
    isListening = false;

    if (audioProcessor) {
      try {
        audioProcessor.disconnect();
      } catch (e) {}
      audioProcessor = null;
    }

    if (micAudioSource) {
      try {
        micAudioSource.disconnect();
      } catch (e) {}
      micAudioSource = null;
    }

    if (micMediaStream) {
      try {
        micMediaStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      micMediaStream = null;
    }

    if (inputAudioCtx) {
      try {
        inputAudioCtx.close();
      } catch (e) {}
      inputAudioCtx = null;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. REAL-TIME AUDIO PLAYBACK (24kHz GAPLESS SCHEDULING)
  // ---------------------------------------------------------------------------
  function initOutputAudioContext() {
    if (!outputAudioCtx || outputAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      nextAudioStartTime = outputAudioCtx.currentTime;
    } else if (outputAudioCtx.state === 'suspended') {
      outputAudioCtx.resume();
    }
  }

  function playLiveAudioChunk(base64Audio) {
    try {
      initOutputAudioContext();

      const binaryStr = atob(base64Audio);
      const byteLen = binaryStr.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Convert 16-bit PCM little-endian to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const sampleCount = int16Array.length;
      const float32Array = new Float32Array(sampleCount);

      for (let i = 0; i < sampleCount; i++) {
        const val = int16Array[i];
        float32Array[i] = val < 0 ? val / 0x8000 : val / 0x7FFF;
      }

      const audioBuffer = outputAudioCtx.createBuffer(1, sampleCount, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(outputAudioCtx.destination);

      const now = outputAudioCtx.currentTime;
      if (nextAudioStartTime < now) {
        nextAudioStartTime = now;
      }

      sourceNode.start(nextAudioStartTime);
      nextAudioStartTime += audioBuffer.duration;

      activeAudioSources.push(sourceNode);
      isSpeaking = true;
      updateUIState('speaking');

      sourceNode.onended = function () {
        const index = activeAudioSources.indexOf(sourceNode);
        if (index > -1) {
          activeAudioSources.splice(index, 1);
        }

        // When all scheduled chunks finish playing:
        if (activeAudioSources.length === 0 && outputAudioCtx.currentTime >= nextAudioStartTime) {
          isSpeaking = false;
          // Remain continuously listening for the farmer's next question!
          if (isMicrophoneActive) {
            updateUIState('listening');
          } else {
            updateUIState('idle');
          }
        }
      };

    } catch (playbackErr) {
      console.warn('Live audio playback chunk error:', playbackErr);
    }
  }

  function stopLiveAudioPlayback() {
    activeAudioSources.forEach(src => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeAudioSources = [];

    if (outputAudioCtx) {
      nextAudioStartTime = outputAudioCtx.currentTime;
    }

    isSpeaking = false;
  }

  // ---------------------------------------------------------------------------
  // 4. USER INTERRUPTION (BARGE-IN)
  // ---------------------------------------------------------------------------
  function handleUserInterruption() {
    // 1. Immediately stop currently playing audio chunks
    stopLiveAudioPlayback();

    // 2. Stop any browser synthesis speech
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // 3. Notify backend / Gemini Live that user interrupted
    if (liveWs && liveWs.readyState === WebSocket.OPEN) {
      try {
        liveWs.send(JSON.stringify({ type: 'interrupt' }));
      } catch (e) {}
    }

    // 4. Switch UI immediately back to listening
    isSpeaking = false;
    isListening = true;
    updateUIState('listening');
  }

  // ---------------------------------------------------------------------------
  // 5. LIVE TRANSCRIPT & ACTION BUTTONS
  // ---------------------------------------------------------------------------
  function handleLiveTranscriptPart(text) {
    currentTranscriptBuffer += text;

    const responseBox = document.getElementById('kisan-voice-response-box');
    const responseTextEl = document.getElementById('kisan-voice-response-text');
    const actionContainer = document.getElementById('kisan-voice-action-container');

    if (responseBox && responseTextEl) {
      responseBox.classList.add('visible');
      responseTextEl.textContent = currentTranscriptBuffer.trim();

      // Smart detection of tokens or links
      if (actionContainer) {
        actionContainer.innerHTML = '';
        const tokenMatch = currentTranscriptBuffer.match(/\b([A-Z]{1,3}-\d{2,4})\b/i);
        if (tokenMatch) {
          const foundToken = tokenMatch[1].toUpperCase();
          const actionBtn = document.createElement('a');
          actionBtn.href = `/status.html?token=${encodeURIComponent(foundToken)}`;
          actionBtn.className = 'kisan-voice-action-btn';
          actionBtn.innerHTML = `<span>👉 टोकन ${foundToken} लाइव स्थिति देखें (Track Queue)</span>`;
          actionContainer.appendChild(actionBtn);
        } else if (/स्लॉट|slot|బుకింగ్/i.test(currentTranscriptBuffer)) {
          const actionBtn = document.createElement('a');
          actionBtn.href = '/request.html';
          actionBtn.className = 'kisan-voice-action-btn';
          actionBtn.innerHTML = `<span>👉 नया खरीद स्लॉट बुक करें (Book Slot)</span>`;
          actionContainer.appendChild(actionBtn);
        } else if (/केंद्र|center|కేంద్రం/i.test(currentTranscriptBuffer)) {
          const actionBtn = document.createElement('a');
          actionBtn.href = '/centers.html';
          actionBtn.className = 'kisan-voice-action-btn';
          actionBtn.innerHTML = `<span>👉 खरीद केंद्र सूची व संपर्क देखें (View Centers)</span>`;
          actionContainer.appendChild(actionBtn);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. UI CONSTRUCTION & VISUALIZER
  // ---------------------------------------------------------------------------
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

    if (state === 'connecting') {
      statusIcon.textContent = '🔄';
      statusText.textContent = 'Connecting...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('connecting');
      wave.classList.remove('active', 'speaking');
    } else if (state === 'listening') {
      statusIcon.textContent = '👂';
      statusText.textContent = 'Listening...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('listening');
      wave.classList.add('active');
      mainMicBtn.classList.add('listening');
      if (interruptBtn) interruptBtn.style.display = 'none';
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
    } else if (state === 'disconnected') {
      statusIcon.textContent = '⚠️';
      statusText.textContent = 'Reconnecting...';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('disconnected');
    } else {
      statusIcon.textContent = '🌾';
      statusText.textContent = 'Kisan Mitr';
      if (statusSub) statusSub.textContent = customMessage || getLocalizedMessage('tap_to_speak');
    }
  }

  function animateVisualizerVolume(volume) {
    const bars = document.querySelectorAll('.kisan-audio-bar');
    if (!bars || bars.length === 0) return;

    const normalized = Math.min(1, volume * 10);
    bars.forEach((bar, idx) => {
      const height = Math.max(6, Math.floor(normalized * 38 * ((idx % 3) + 1) / 2));
      bar.style.height = `${height}px`;
    });
  }

  function openVoiceModal(initialPrompt) {
    const overlay = document.getElementById('kisan-voice-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Connect real-time WebSocket on open
      initLiveWebSocket();

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

      // Stop any speech or audio streaming
      stopLiveAudioPlayback();
      stopMicrophoneStreaming();
      stopSpeaking();

      if (recognition && isListening) {
        try { recognition.stop(); } catch (e) {}
      }

      updateUIState('idle');
    }
  }

  // Voice Interruption & Toggle
  function toggleListening() {
    // If assistant is speaking, farmer interruption takes priority!
    if (isSpeaking) {
      handleUserInterruption();
      return;
    }

    // If currently listening, toggle off
    if (isListening && isMicrophoneActive) {
      stopMicrophoneStreaming();
      updateUIState('idle');
      return;
    }

    // Start live microphone streaming
    currentTranscriptBuffer = '';
    startMicrophoneStreaming();
  }

  // ---------------------------------------------------------------------------
  // 7. TEXT/TOPIC QUERY & SMART VOICE FALLBACK
  // ---------------------------------------------------------------------------
  async function handleVoiceQuery(userQuery) {
    if (!userQuery || !userQuery.trim()) return;

    // Interrupt any ongoing speech immediately
    stopLiveAudioPlayback();
    stopSpeaking();
    updateUIState('thinking');

    currentTranscriptBuffer = '';

    // If Live WebSocket is active, send as text to Gemini Live!
    if (liveWs && liveWs.readyState === WebSocket.OPEN && liveMode === 'gemini_live') {
      try {
        liveWs.send(JSON.stringify({
          type: 'text',
          text: userQuery
        }));
        return;
      } catch (err) {
        console.warn('Live WebSocket text query fallback:', err);
      }
    }

    // Fallback: Smart Voice HTTP endpoint
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    let farmerId = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const user = JSON.parse(localStorage.getItem('kisansetu_user') || '{}');
        farmerId = user.id || null;
      } catch (e) {}
    }

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

      const data = await response.json();

      if (data && data.success && (data.spokenResponse || data.markdownResponse)) {
        const answer = data.spokenResponse || data.markdownResponse;
        conversationHistory.push({ role: 'assistant', content: answer });

        displayAndSpeakResponse(
          answer, 
          data.speechLang || 'hi-IN', 
          data.actionUrl, 
          data.matchedToken, 
          data.followUpSuggestions
        );
      } else {
        displayLocalFallback(userQuery);
      }
    } catch (err) {
      console.error('Voice assistant request notice:', err);
      displayLocalFallback(userQuery);
    }
  }

  function displayLocalFallback(userQuery) {
    const cleanQ = (userQuery || '').toLowerCase();
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
    currentSpeechUtterance.rate = 0.95;
    currentSpeechUtterance.pitch = 1.0;

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

    currentSpeechUtterance.onerror = function () {
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

  // ---------------------------------------------------------------------------
  // 8. FALLBACK WEB SPEECH RECOGNITION
  // ---------------------------------------------------------------------------
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

        const langCodeMap = { 'hi': 'hi-IN', 'te': 'te-IN', 'en': 'en-IN' };
        recognition.lang = langCodeMap[currentLanguage] || 'hi-IN';

        recognition.onstart = function () {
          isListening = true;
          updateUIState('listening');
        };

        recognition.onresult = function (event) {
          const transcript = event.results[0][0].transcript;
          isListening = false;

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
        console.warn('SpeechRecognition init notice:', e);
      }
    }
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

  // ---------------------------------------------------------------------------
  // 9. EVENT LISTENERS
  // ---------------------------------------------------------------------------
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
      interruptBtn.addEventListener('click', handleUserInterruption);
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

  // ---------------------------------------------------------------------------
  // 10. UTILITIES
  // ---------------------------------------------------------------------------
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
    stop: stopSpeaking,
    interrupt: handleUserInterruption
  };

})();
