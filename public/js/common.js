/**
 * KisanSetu - Common Utilities & Multilingual Localization Engine
 * Languages: English (en), Telugu (te), Hindi (hi)
 */

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_schedule: "Procurement Schedule",
    nav_status: "Track Status",
    nav_centers: "Procurement Centers",
    nav_request: "Book Token Slot",
    nav_help: "Farmer Helpdesk",
    nav_dashboard: "My Dashboard",
    nav_profile: "My Profile",
    nav_login: "Farmer Login",
    nav_register: "Register Farmer",
    nav_logout: "Logout",
    nav_admin: "Officer Admin",

    // Hero
    hero_badge: "Government Agricultural Digital Procurement",
    hero_title: "Know Your Procurement Date. Track Your Token. Save Your Time.",
    hero_desc: "Direct government procurement system for farmers. Book grain drop-off slots online, check live token queues, avoid long mandi waiting lines, and receive direct DBT bank transfers.",
    hero_btn_schedule: "Check Schedule",
    hero_btn_status: "Track My Token",
    hero_btn_request: "Book Drop-off Slot",
    hero_btn_centers: "Find Center",

    // Features
    feat_schedule_title: "Procurement Schedule",
    feat_schedule_desc: "View center-wise date timetables, crop availability, and open slots before starting from your village.",
    feat_token_title: "Live Token & Queue",
    feat_token_desc: "Get an instant digital token number. Check how many farmers are ahead of you in real time.",
    feat_status_title: "Your Procurement Status",
    feat_status_desc: "Track every step from gate entry, weighbridge sampling, and moisture check to direct bank payment.",
    feat_updates_title: "Instant Announcements",
    feat_updates_desc: "Receive real-time alerts regarding mandi timings, additional counters, and moisture regulations.",

    // Dashboard & Queue
    dash_welcome: "Welcome,",
    dash_active_token: "Your Active Token",
    dash_token_no: "TOKEN NUMBER",
    dash_status: "CURRENT STATUS",
    dash_farmers_ahead: "Farmers Ahead of You",
    dash_estimated_wait: "Estimated Waiting Time",
    dash_approx: "Approximately",
    dash_mins: "minutes",
    dash_crop: "Crop Name",
    dash_quantity: "Quantity",
    dash_center: "Procurement Center",
    dash_date: "Procurement Date",
    dash_btn_view_status: "View Full Tracking",
    dash_btn_new_request: "Book New Crop Slot",
    dash_btn_print: "Print / Save Token Slip",

    // Status Steps
    step_submitted: "Request Submitted",
    step_token: "Token Assigned",
    step_scheduled: "Scheduled",
    step_in_queue: "In Queue",
    step_processing: "Processing / Weighment",
    step_completed: "Completed (DBT Sent)",

    // Instructions & Documents
    docs_to_bring: "Important Documents to Bring",
    doc_aadhaar: "1. Original Aadhaar Card (For biometric verification)",
    doc_land: "2. Pattadar Passbook / Land Record Copy",
    doc_bank: "3. Bank Passbook Copy (Linked with Aadhaar for DBT)",
    doc_sowing: "4. Crop Sowing Certificate (Adangal / Khasra)"
  },
  te: {
    // Telugu Localization
    nav_home: "హోమ్",
    nav_schedule: "కొనుగోలు షెడ్యూల్",
    nav_status: "స్టేటస్ ట్రాక్ చేయండి",
    nav_centers: "కొనుగోలు కేంద్రాలు",
    nav_request: "స్లాట్ & టోకెన్ బుకింగ్",
    nav_help: "రైతు సహాయం",
    nav_dashboard: "నా డ్యాష్‌బోర్డ్",
    nav_profile: "నా ప్రొఫైల్",
    nav_login: "రైతు లాగిన్",
    nav_register: "కొత్త రైతు నమోదు",
    nav_logout: "లాగ్ అవుట్",
    nav_admin: "అధికారి లాగిన్",

    // Hero
    hero_badge: "ప్రభుత్వ ధాన్య సేకరణ డిజిటల్ పోర్టల్",
    hero_title: "కొనుగోలు తేదీ తెలుసుకోండి. టోకెన్ ట్రాక్ చేయండి. సమయం ఆదా చేసుకోండి.",
    hero_desc: "రైతుల కోసం సులభతర ధాన్య కొనుగోలు వ్యవస్థ. ఆన్‌లైన్‌లో స్లాట్ బుక్ చేసుకోండి, లైవ్ క్యూలో మీ టోకెన్ నంబర్ చూసుకోండి, నేరుగా బ్యాంక్ ఖాతాలో మద్దతు ధర పొందండి.",
    hero_btn_schedule: "షెడ్యూల్ చూడండి",
    hero_btn_status: "టోకెన్ ట్రాక్ చేయండి",
    hero_btn_request: "స్లాట్ బుక్ చేయండి",
    hero_btn_centers: "కేంద్రం కనుగొనండి",

    // Features
    feat_schedule_title: "కొనుగోలు షెడ్యూల్",
    feat_schedule_desc: "మీ జిల్లా కేంద్రాల వారీగా పంటల తేదీలు మరియు ఖాళీగా ఉన్న స్లాట్లు తెలుసుకోండి.",
    feat_token_title: "లైవ్ టోకెన్ & క్యూ",
    feat_token_desc: "డిజిటల్ టోకెన్ నంబర్ పొందండి. మీ ముందు ఎంతమంది రైతులు ఉన్నారో లైవ్‌లో చూడండి.",
    feat_status_title: "మీ పంట సేకరణ స్థితి",
    feat_status_desc: "గేట్ ఎంట్రీ నుండి తూకం, తేమ పరీక్ష మరియు బ్యాంక్ జమ వరకు ప్రతి అడుగు ట్రాక్ చేయండి.",
    feat_updates_title: "ముఖ్యమైన సమాచారం",
    feat_updates_desc: "కేంద్రాల పని వేళలు, తేమ పరిమితులు మరియు అదనపు కౌంటర్ల తాజా సమాచారం.",

    // Dashboard & Queue
    dash_welcome: "స్వాగతం,",
    dash_active_token: "మీ ప్రస్తుత టోకెన్",
    dash_token_no: "టోకెన్ నంబర్",
    dash_status: "ప్రస్తుత స్థితి",
    dash_farmers_ahead: "మీ ముందు ఉన్న రైతుల సంఖ్య",
    dash_estimated_wait: "అంచనా వేచి ఉండే సమయం",
    dash_approx: "సుమారు",
    dash_mins: "నిమిషాలు",
    dash_crop: "పంట పేరు",
    dash_quantity: "పరిమాణం",
    dash_center: "కొనుగోలు కేంద్రం",
    dash_date: "తేదీ",
    dash_btn_view_status: "పూర్తి వివరాలు చూడండి",
    dash_btn_new_request: "కొత్త స్లాట్ బుక్ చేయండి",
    dash_btn_print: "టోకెన్ స్లిప్ డౌన్‌లోడ్",

    // Status Steps
    step_submitted: "అభ్యర్థన అందింది",
    step_token: "టోకెన్ కేటాయించబడింది",
    step_scheduled: "షెడ్యూల్ చేయబడింది",
    step_in_queue: "క్యూలో ఉన్నారు",
    step_processing: "తూకం / ప్రాసెసింగ్",
    step_completed: "పూర్తయింది (బ్యాంక్ జమ)"
  },
  hi: {
    // Hindi Localization
    nav_home: "होम",
    nav_schedule: "खरीद अनुसूची",
    nav_status: "स्थिति ट्रैक करें",
    nav_centers: "खरीद केंद्र",
    nav_request: "टोकन स्लॉट बुक करें",
    nav_help: "किसान हेल्पलाइन",
    nav_dashboard: "मेरा डैशबोर्ड",
    nav_profile: "मेरी प्रोफ़ाइल",
    nav_login: "किसान लॉगिन",
    nav_register: "किसान पंजीकरण",
    nav_logout: "लॉग आउट",
    nav_admin: "अधिकारी लॉगिन",

    // Hero
    hero_badge: "सरकारी फसल खरीद डिजिटल पोर्टल",
    hero_title: "खरीद तिथि जानें। टोकन ट्रैक करें। अपना समय बचाएं।",
    hero_desc: "किसानों के लिए प्रत्यक्ष सरकारी फसल खरीद प्रणाली। ऑनलाइन स्लॉट बुक करें, लाइव कतार में अपना नंबर देखें, मंडी में लंबा इंतज़ार खत्म करें और सीधे बैंक खाते में भुगतान पाएं।",
    hero_btn_schedule: "शेड्यूल देखें",
    hero_btn_status: "टोकन ट्रैक करें",
    hero_btn_request: "स्लॉट बुक करें",
    hero_btn_centers: "खरीद केंद्र खोजें",

    // Features
    feat_schedule_title: "खरीद अनुसूची",
    feat_schedule_desc: "जिलेवार केंद्र और फसल के अनुसार उपलब्ध स्लॉट और तारीखें पहले ही देखें।",
    feat_token_title: "लाइव टोकन व कतार",
    feat_token_desc: "तुरंत डिजिटल टोकन प्राप्त करें और देखें कि आपके आगे कितने किसान कतार में हैं।",
    feat_status_title: "आपकी खरीद स्थिति",
    feat_status_desc: "गेट एंट्री, वजन, नमी जांच से लेकर प्रत्यक्ष बैंक भुगतान तक हर कदम ट्रैक करें।",
    feat_updates_title: "ताज़ा घोषणाएं",
    feat_updates_desc: "मंडी समय, नए काउंटर और नमी मानकों के संबंध में तुरंत आधिकारिक सूचनाएं पाएं।",

    // Dashboard & Queue
    dash_welcome: "नमस्ते,",
    dash_active_token: "आपका सक्रिय टोकन",
    dash_token_no: "टोकन संख्या",
    dash_status: "वर्तमान स्थिति",
    dash_farmers_ahead: "आपके आगे किसान",
    dash_estimated_wait: "अनुमानित प्रतीक्षा समय",
    dash_approx: "लगभग",
    dash_mins: "मिनट",
    dash_crop: "फसल का नाम",
    dash_quantity: "मात्रा (क्विंटल)",
    dash_center: "खरीद केंद्र",
    dash_date: "खरीद की तारीख",
    dash_btn_view_status: "पूरी ट्रैकिंग देखें",
    dash_btn_new_request: "नया स्लॉट बुक करें",
    dash_btn_print: "टोकन पर्ची प्रिंट करें",

    // Status Steps
    step_submitted: "अनुरोध प्राप्त हुआ",
    step_token: "टोकन आवंटित",
    step_scheduled: "अनुसूचित",
    step_in_queue: "कतार में हैं",
    step_processing: "वजन / प्रसंस्करण चालू",
    step_completed: "सम्पन्न (भुगतान भेजा गया)"
  }
};

let currentLanguage = localStorage.getItem('kisansetu_lang') || 'en';

function getTranslation(key) {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
  return dict[key] || TRANSLATIONS['en'][key] || key;
}

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = getTranslation(key);
    if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
      el.setAttribute('placeholder', text);
    } else {
      el.textContent = text;
    }
  });

  // Update active state in language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const lang = btn.getAttribute('data-lang');
    if (lang === currentLanguage) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLanguage = lang;
    localStorage.setItem('kisansetu_lang', lang);
    applyTranslations();
  }
}

// Toast System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'warning') icon = '⚠';
  if (type === 'info') icon = 'ℹ';

  toast.innerHTML = `<span style="font-size:18px;font-weight:bold;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Mobile Menu Setup
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
}

// Audio Cue Synthesizer (for Queue announcements)
function playChime(freq = 587.33, duration = 0.3) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silent fail if audio blocked
  }
}

// Auto Init on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  applyTranslations();

  // Language selector button listeners
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.getAttribute('data-lang'));
    });
  });
});
