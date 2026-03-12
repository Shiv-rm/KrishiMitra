// ── KrishiMitra Multilingual Module ──────────────────────────────────────────
// Simple, zero-dependency i18n: English ↔ Hindi
// Usage:  import { t, setLang, getLang, onLangChange } from './i18n.js';

const translations = {
  en: {
    // Header
    tagline: "Empowering farmers with data-driven insights",

    // Card
    cardTitle: "Field Analysis",
    cardDesc:  "Get real-time soil and climate data for your specific location.",

    // Button / status
    analyzeBtn:       "Analyze My Location",
    requestingLoc:    "Requesting location access…",
    analysingCoords:  "Analysing coordinates…",
    success:          "Success! Data retrieved.",
    errorPrefix:      "Error:",
    connError:        "Connection error: Server may be offline",

    // Geolocation errors
    permDenied:    "Permission denied. Enable GPS.",
    posUnavail:    "Location unavailable.",
    timeout:       "Request timed out.",
    unknownErr:    "An unknown error occurred.",

    // Results panel
    recommendedCrop: "Recommended Crop",
    bestMatch:       "Best match for your soil & climate",
    nitrogen:        "Nitrogen",
    phosphorus:      "Phosphorus",
    potassium:       "Potassium",
    soilPH:          "Soil pH",
    temperature:     "Temperature",
    humidity:        "Humidity",
    rainfall:        "Rainfall",

    // Footer
    footer: "© 2026 KrishiMitra. Advanced Agricultural Intelligence.",
  },

  hi: {
    // Header
    tagline: "किसानों को डेटा-आधारित जानकारी से सशक्त बनाना",

    // Card
    cardTitle: "क्षेत्र विश्लेषण",
    cardDesc:  "अपने स्थान के लिए वास्तविक समय की मिट्टी और जलवायु डेटा प्राप्त करें।",

    // Button / status
    analyzeBtn:       "मेरे स्थान का विश्लेषण करें",
    requestingLoc:    "स्थान की अनुमति माँगी जा रही है…",
    analysingCoords:  "निर्देशांक का विश्लेषण हो रहा है…",
    success:          "सफल! डेटा प्राप्त हुआ।",
    errorPrefix:      "त्रुटि:",
    connError:        "कनेक्शन त्रुटि: सर्वर ऑफ़लाइन हो सकता है",

    // Geolocation errors
    permDenied:    "अनुमति अस्वीकृत। GPS सक्षम करें।",
    posUnavail:    "स्थान उपलब्ध नहीं है।",
    timeout:       "अनुरोध का समय समाप्त।",
    unknownErr:    "एक अज्ञात त्रुटि हुई।",

    // Results panel
    recommendedCrop: "अनुशंसित फसल",
    bestMatch:       "आपकी मिट्टी और जलवायु के लिए सर्वोत्तम",
    nitrogen:        "नाइट्रोजन",
    phosphorus:      "फास्फोरस",
    potassium:       "पोटेशियम",
    soilPH:          "मिट्टी का pH",
    temperature:     "तापमान",
    humidity:        "आर्द्रता",
    rainfall:        "वर्षा",

    // Footer
    footer: "© 2026 कृषिमित्र। उन्नत कृषि बुद्धिमत्ता।",
  },
};

// ── State ─────────────────────────────────────────────────────────────────────
let currentLang = localStorage.getItem("km_lang") || "en";
const listeners = [];

// ── Public API ────────────────────────────────────────────────────────────────

/** Translate a key into the current language (falls back to English). */
export function t(key) {
  return (translations[currentLang] && translations[currentLang][key])
      || translations["en"][key]
      || key;
}

/** Get the current language code ("en" | "hi"). */
export function getLang() { return currentLang; }

/** Switch language and notify all subscribers. */
export function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("km_lang", lang);
  applyTranslations();
  listeners.forEach(cb => cb(lang));
}

/**
 * Register a callback fired whenever the language changes.
 * Returns an unsubscribe function.
 */
export function onLangChange(cb) {
  listeners.push(cb);
  return () => listeners.splice(listeners.indexOf(cb), 1);
}

// ── DOM auto-translation ───────────────────────────────────────────────────────
/**
 * Any element with a  data-i18n="key"  attribute will have its
 * textContent replaced automatically on every language switch.
 */
export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  // Update the html lang attribute for accessibility
  document.documentElement.lang = currentLang;
}