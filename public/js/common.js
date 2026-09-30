/**
 * KisanSetu - Common Utilities & Multilingual Localization Engine
 * Languages: English (en), Telugu (te), Hindi (hi)
 */

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_schedule: "Harvest Batches",
    nav_status: "Track Direct Order",
    nav_centers: "Aggregation Hubs",
    nav_request: "Sell Direct (No Broker)",
    nav_help: "Farmer Helpdesk",
    nav_dashboard: "My Dashboard",
    nav_profile: "My Profile",
    nav_login: "Farmer Login",
    nav_register: "Register Farmer",
    nav_logout: "Logout",
    nav_admin: "FPO Hub Admin",

    // Hero
    hero_badge: "Government Recognized Farmer-to-Buyer Disintermediation Platform",
    hero_title: "Direct Farm to Fork. Zero Middlemen. Maximum Farmer Profit.",
    hero_desc: "Eliminate 4 to 6 traditional supply chain intermediaries. Book direct dispatch slots, get transparent digital weighment, and receive 100% direct bank credit without broker commissions.",
    hero_btn_schedule: "View Harvest Batches",
    hero_btn_status: "Track Direct Deal",
    hero_btn_request: "Sell Direct (0% Brokerage)",
    hero_btn_centers: "Find FPO Hubs",

    // Features
    feat_schedule_title: "Direct Harvest Pre-Orders",
    feat_schedule_desc: "Institutional buyers and mills pre-book verified farmer harvest batches directly, eliminating mandi hoarding.",
    feat_token_title: "Zero-Brokerage Digital Deal Token",
    feat_token_desc: "Instant direct trade contract with locked fair prices, transparent electronic queue, and zero middleman fee.",
    feat_status_title: "Live Transit & Quality Tracking",
    feat_status_desc: "Track digital moisture testing at the local FPO hub, weighbridge verification, and direct account settlement.",
    feat_updates_title: "Direct Buyer Demands & MSP+ Rates",
    feat_updates_desc: "Real-time updates on bulk buyer requirements, premium quality incentives, and local FPO hub logistics.",

    // Dashboard & Queue
    dash_welcome: "Welcome,",
    dash_active_token: "Active Direct Trade Deal",
    dash_token_no: "DIRECT DEAL TOKEN",
    dash_status: "DISINTERMEDIATION STAGE",
    dash_farmers_ahead: "Farmers Ahead in Hub Queue",
    dash_estimated_wait: "Estimated Inspection Time",
    dash_approx: "Approximately",
    dash_mins: "minutes",
    dash_crop: "Crop Batch",
    dash_quantity: "Quantity",
    dash_center: "FPO Aggregation Hub",
    dash_date: "Dispatch / Delivery Date",
    dash_btn_view_status: "Track Direct Dispatch",
    dash_btn_new_request: "List Harvest for Direct Sale",
    dash_btn_print: "Print / Save Deal Slip",
    dash_commission_saved: "Middleman Brokerage Saved",
    dash_direct_buyer: "Matched Direct Buyer",
    dash_net_benefit: "Net Farmer Profit Premium",

    // Status Steps
    step_submitted: "Direct Deal Booked",
    step_token: "Deal Confirmed (0% Brokerage)",
    step_scheduled: "FPO Hub Slot Scheduled",
    step_in_queue: "FPO Hub Inward & Queue",
    step_processing: "Digital Quality & Weighment",
    step_completed: "Delivered & Settled (Direct Payment)",

    // Instructions & Documents
    docs_to_bring: "Guidelines for FPO Hub Direct Delivery",
    doc_aadhaar: "1. Farmer ID / Aadhaar Card (For Direct Payment Escrow)",
    doc_land: "2. Land Record / Pattadar Passbook Copy (Crop Ownership Proof)",
    doc_bank: "3. Bank Passbook / UPI Details (For 100% Commission-Free Transfer)",
    doc_sowing: "4. Quality Sample / Moisture Certificate (Target Moisture < 14%)"
  },
  te: {
    // Telugu Localization
    nav_home: "హోమ్",
    nav_schedule: "పంట లభ్యత",
    nav_status: "ఆర్డర్ ట్రాక్",
    nav_centers: "రైతు కేంద్రాలు",
    nav_request: "నేరుగా అమ్మండి",
    nav_help: "రైతు సహాయం",
    nav_dashboard: "నా డ్యాష్‌బోర్డ్",
    nav_profile: "నా ప్రొఫైల్",
    nav_login: "రైతు లాగిన్",
    nav_register: "కొత్త రైతు నమోదు",
    nav_logout: "లాగ్ అవుట్",
    nav_admin: "హబ్ మేనేజర్",

    // Hero
    hero_badge: "రైతు - కొనుగోలుదారు ప్రత్యక్ష విక్రయ వ్యవస్థ (దళారీ రహితం)",
    hero_title: "రైతు నుండి నేరుగా వినియోగదారునికి. దళారులు లేరు. అధిక లాభం.",
    hero_desc: "4 నుండి 6 మంది దళారుల ప్రమేయం లేకుండా, మీ పంటను నేరుగా బల్క్ కొనుగోలుదారులు మరియు వినియోగదారులకు విక్రయించండి. 100% పూర్తి బ్యాంక్ చెల్లింపు పొందండి.",
    hero_btn_schedule: "పంట లభ్యత చూడండి",
    hero_btn_status: "డీల్ ట్రాక్ చేయండి",
    hero_btn_request: "నేరుగా అమ్మండి (0% కమిషన్)",
    hero_btn_centers: "FPO కేంద్రం కనుగొనండి",

    // Features
    feat_schedule_title: "ప్రత్యక్ష పంట ముందస్తు ఆర్డర్లు",
    feat_schedule_desc: "మిల్లులు, రిటైలర్లు నేరుగా రైతుల నుండి పంటను ముందస్తుగా బుక్ చేసుకుంటారు, దళారీల కృత్రిమ కొరతను అరికడతారు.",
    feat_token_title: "జీరో బ్రోకరేజ్ డిజిటల్ టోకెన్",
    feat_token_desc: "ఎలాంటి దళారీ కమిషన్ లేకుండా స్థిరమైన సరసమైన ధరకు ప్రత్యక్ష వ్యాపార ఒప్పందం మరియు డిజిటల్ టోకెన్.",
    feat_status_title: "లైవ్ రవాణా & నాణ్యత ట్రాకింగ్",
    feat_status_desc: "FPO హబ్‌లో నాణ్యత పరీక్ష, డిజిటల్ ఎలక్ట్రానిక్ తూకం నుండి నేరుగా బ్యాంక్ జమ వరకు లైవ్ ట్రాకింగ్.",
    feat_updates_title: "నేరుగా కొనుగోలుదారుల డిమాండ్ & ధరలు",
    feat_updates_desc: "బల్క్ కొనుగోలుదారుల ఆర్డర్లు, అదనపు నాణ్యతా ప్రోత్సాహకాలు మరియు FPO హబ్ తాజా సమాచారం.",

    // Dashboard & Queue
    dash_welcome: "స్వాగతం,",
    dash_active_token: "మీ ప్రస్తుత ప్రత్యక్ష డీల్",
    dash_token_no: "డైరెక్ట్ డీల్ టోకెన్",
    dash_status: "ప్రస్తుత స్థితి",
    dash_farmers_ahead: "హబ్ క్యూలో మీ ముందు ఉన్న రైతులు",
    dash_estimated_wait: "అంచనా తనిఖీ సమయం",
    dash_approx: "సుమారు",
    dash_mins: "నిమిషాలు",
    dash_crop: "పంట బ్యాచ్",
    dash_quantity: "పరిమాణం",
    dash_center: "FPO సేకరణ కేంద్రం",
    dash_date: "పంపిణీ తేదీ",
    dash_btn_view_status: "పూర్తి డీల్ వివరాలు",
    dash_btn_new_request: "నేరుగా విక్రయానికి నమోదు",
    dash_btn_print: "డీల్ స్లిప్ డౌన్‌లోడ్",
    dash_commission_saved: "ఆదా చేసిన దళారీ రుసుము",
    dash_direct_buyer: "ప్రత్యక్ష కొనుగోలుదారు",
    dash_net_benefit: "రైతుకు అదనపు లాభం",

    // Status Steps
    step_submitted: "ప్రత్యక్ష డీల్ నమోదైంది",
    step_token: "డీల్ నిర్ధారించబడింది (0% కమిషన్)",
    step_scheduled: "FPO హబ్ స్లాట్ నిర్ణయించబడింది",
    step_in_queue: "FPO హబ్‌కు చేరింది",
    step_processing: "డిజిటల్ నాణ్యత & తూకం",
    step_completed: "పంపిణీ & బ్యాంక్ జమ పూర్తయింది",

    // Instructions & Documents
    docs_to_bring: "FPO హబ్ వద్ద తేవాల్సిన పత్రాలు",
    doc_aadhaar: "1. ఆధార్ కార్డు (ప్రత్యక్ష బ్యాంక్ చెల్లింపు కోసం)",
    doc_land: "2. పట్టాదారు పాస్‌బుక్ / అడంగల్ నకలు",
    doc_bank: "3. బ్యాంక్ ఖాతా వివరాలు (దళారీ రహిత పూర్తి చెల్లింపు కోసం)",
    doc_sowing: "4. పంట నాణ్యతా నమూనా (తేమ 14% లోపు)"
  },
  hi: {
    // Hindi Localization
    nav_home: "होम",
    nav_schedule: "फसल उपलब्धता",
    nav_status: "ऑर्डर ट्रैकिंग",
    nav_centers: "कृषक संकलन केंद्र",
    nav_request: "सीधी बिक्री (बिना दलाल)",
    nav_help: "किसान हेल्पलाइन",
    nav_dashboard: "मेरा डैशबोर्ड",
    nav_profile: "मेरी प्रोफ़ाइल",
    nav_login: "किसान लॉगिन",
    nav_register: "किसान पंजीकरण",
    nav_logout: "लॉग आउट",
    nav_admin: "FPO हब अधिकारी",

    // Hero
    hero_badge: "किसान-से-खरीदार प्रत्यक्ष विपणन एवं बिचौलिया-मुक्त मंच",
    hero_title: "खेत से सीधे खरीदार तक। बिना बिचौलिए। किसान का अधिकतम मुनाफा।",
    hero_desc: "पारंपरिक 4 से 6 बिचौलियों व आढ़तियों को हटाएं। सीधी बिक्री स्लॉट बुक करें, पारदर्शी डिजिटल वजन पाएं और बिना किसी दलाली कटौती के 100% सीधा बैंक भुगतान प्राप्त करें।",
    hero_btn_schedule: "फसल बैच देखें",
    hero_btn_status: "डायरेक्ट डील ट्रैक करें",
    hero_btn_request: "सीधी बिक्री (0% दलाली)",
    hero_btn_centers: "FPO केंद्र खोजें",

    // Features
    feat_schedule_title: "प्रत्यक्ष फसल प्री-ऑर्डर",
    feat_schedule_desc: "थोक खरीदार, मिलें व खुदरा विक्रेता सीधे किसानों से फसल अग्रिम बुक करते हैं, जिससे जमाखोरी खत्म होती है।",
    feat_token_title: "शून्य-दलाली डिजिटल डील टोकन",
    feat_token_desc: "पारदर्शी इलेक्ट्रॉनिक टोकन, निश्चित निष्पक्ष मूल्य और बिना किसी बिचौलिए की कमीशन कटौती।",
    feat_status_title: "लाइव परिवहन एवं गुणवत्ता ट्रैकिंग",
    feat_status_desc: "FPO केंद्र पर नमी जांच, डिजिटल वजन और सीधे बैंक खाते में भुगतान तक हर चरण का लाइव विवरण।",
    feat_updates_title: "सीधी खरीदार मांग एवं MSP+ दरें",
    feat_updates_desc: "थोक खरीदारों की मांग, गुणवत्ता प्रीमियम और FPO केंद्र की रसद संबंधी तुरंत जानकारी।",

    // Dashboard & Queue
    dash_welcome: "नमस्ते,",
    dash_active_token: "आपकी सक्रिय प्रत्यक्ष डील",
    dash_token_no: "डायरेक्ट डील टोकन",
    dash_status: "वर्तमान स्थिति",
    dash_farmers_ahead: "हब कतार में आगे किसान",
    dash_estimated_wait: "अनुमानित निरीक्षण समय",
    dash_approx: "लगभग",
    dash_mins: "मिनट",
    dash_crop: "फसल बैच",
    dash_quantity: "मात्रा (क्विंटल)",
    dash_center: "FPO संकलन केंद्र",
    dash_date: "डिलीवरी / प्रेषण तारीख",
    dash_btn_view_status: "पूरी ट्रैकिंग देखें",
    dash_btn_new_request: "सीधी बिक्री के लिए फसल दर्ज करें",
    dash_btn_print: "डील पर्ची प्रिंट करें",
    dash_commission_saved: "बचाई गई बिचौलिया दलाली",
    dash_direct_buyer: "संबद्ध सीधा खरीदार",
    dash_net_benefit: "किसान को अतिरिक्त लाभ",

    // Status Steps
    step_submitted: "प्रत्यक्ष डील दर्ज",
    step_token: "डील स्वीकृत (0% दलाली)",
    step_scheduled: "FPO हब स्लॉट निर्धारित",
    step_in_queue: "FPO हब आवक व कतार",
    step_processing: "डिजिटल गुणवत्ता व वजन",
    step_completed: "वितरित व सीधा भुगतान सम्पन्न",

    // Instructions & Documents
    docs_to_bring: "FPO केंद्र पर आवश्यक दस्तावेज",
    doc_aadhaar: "1. आधार कार्ड (सीधे खाते में भुगतान के लिए)",
    doc_land: "2. खसरा / खतौनी / पट्टा पासबुक की प्रति",
    doc_bank: "3. बैंक पासबुक प्रति (बिना दलाली 100% अंतरण हेतु)",
    doc_sowing: "4. फसल नमूना (नमी 14% से कम रखने का प्रयास करें)"
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
