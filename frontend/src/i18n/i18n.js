// ── KrishiMitra Multilingual Module ──────────────────────────────────────────
// Simple, zero-dependency i18n: English ↔ Hindi
// Usage:  import { t, setLang, getLang, onLangChange } from './i18n.js';

const translations = {
  en: {
    // Header
    tagline: "Empowering farmers with data-driven insights",
    navLogin: "Login / Register",

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

    // Login page
    loginTitle:         "Welcome Back",
    loginSubtitle:      "Sign in to access your KrishiMitra dashboard",
    loginPhone:         "Mobile Number",
    loginPhonePlaceholder: "Enter your 10-digit mobile number",
    loginPassword:      "Password",
    loginPasswordPlaceholder: "Enter your password",
    loginBtn:           "Login",
    loginForgot:        "Forgot Password?",
    loginNoAccount:     "Don't have an account?",
    loginRegister:      "Register here",
    loginOr:            "or",
    loginWithOTP:       "Login with OTP",
    loginErrPhone:      "Please enter a valid 10-digit mobile number.",
    loginErrPassword:   "Password must be at least 6 characters.",
    loginErrGeneral:    "Login failed. Please try again.",
    loginSuccess:       "Login successful! Redirecting…",
    loginLogging:       "Logging in…",
    loginGreeting:      "Good farming starts here",

    // Register page
    regTitle:              "Create Your Account",
    regSubtitle:           "Join thousands of farmers using KrishiMitra",
    regGreeting:           "Grow smarter with KrishiMitra",
    regStep1:              "Personal Info",
    regStep2:              "Farm Details",
    regStep3:              "Set Password",
    regFullName:           "Full Name",
    regFullNamePh:         "Enter your full name",
    regPhone:              "Mobile Number",
    regPhonePh:            "Enter your 10-digit mobile number",
    regState:              "State",
    regStatePh:            "Select your state",
    regDistrict:           "District / Taluka",
    regDistrictPh:         "Enter your district or taluka",
    regVillage:            "Village / Area",
    regVillagePh:          "Enter your village or area",
    regLandSize:           "Land Size",
    regLandSizePh:         "e.g. 2.5",
    regLandUnit:           "Unit",
    regAcres:              "Acres",
    regHectares:           "Hectares",
    regCropType:           "Primary Crop Type",
    regCropTypePh:         "Select crop type",
    regCropGrain:          "Grain / Cereal",
    regCropVeg:            "Vegetables",
    regCropFruit:          "Fruits",
    regCropCash:           "Cash Crops",
    regCropOther:          "Other",
    regPassword:           "Password",
    regPasswordPh:         "Create a password (min. 6 characters)",
    regConfirmPassword:    "Confirm Password",
    regConfirmPasswordPh:  "Re-enter your password",
    regTerms:              "I agree to the Terms & Conditions",
    regNext:               "Next",
    regBack:               "Back",
    regSubmit:             "Create Account",
    regSubmitting:         "Creating account…",
    regHaveAccount:        "Already have an account?",
    regLogin:              "Login here",
    regSuccess:            "Account created! Welcome to KrishiMitra!",
    regErrName:            "Please enter your full name.",
    regErrPhone:           "Please enter a valid 10-digit mobile number.",
    regErrState:           "Please select your state.",
    regErrDistrict:        "Please enter your district.",
    regErrLand:            "Please enter a valid land size.",
    regErrPassword:        "Password must be at least 6 characters.",
    regErrConfirm:         "Passwords do not match.",
    regErrTerms:           "You must agree to the terms to continue.",
    regErrGeneral:         "Registration failed. Please try again.",
    regStrWeak:            "Weak",
    regStrFair:            "Fair",
    regStrGood:            "Good",
    regStrStrong:          "Strong",
  },

  hi: {
    // Header
    tagline: "किसानों को डेटा-आधारित जानकारी से सशक्त बनाना",
    navLogin: "लॉग इन / पंजीकरण",

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

    // Login page
    loginTitle:         "वापस स्वागत है",
    loginSubtitle:      "अपना कृषिमित्र डैशबोर्ड देखने के लिए साइन इन करें",
    loginPhone:         "मोबाइल नंबर",
    loginPhonePlaceholder: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
    loginPassword:      "पासवर्ड",
    loginPasswordPlaceholder: "अपना पासवर्ड दर्ज करें",
    loginBtn:           "लॉग इन",
    loginForgot:        "पासवर्ड भूल गए?",
    loginNoAccount:     "खाता नहीं है?",
    loginRegister:      "यहाँ पंजीकरण करें",
    loginOr:            "या",
    loginWithOTP:       "OTP से लॉग इन करें",
    loginErrPhone:      "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
    loginErrPassword:   "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
    loginErrGeneral:    "लॉग इन विफल। कृपया पुनः प्रयास करें।",
    loginSuccess:       "लॉग इन सफल! पुनर्निर्देशित हो रहा है…",
    loginLogging:       "लॉग इन हो रहा है…",
    loginGreeting:      "अच्छी खेती यहाँ से शुरू होती है",

    // Register page
    regTitle:              "अपना खाता बनाएं",
    regSubtitle:           "हजारों किसानों के साथ कृषिमित्र से जुड़ें",
    regGreeting:           "कृषिमित्र के साथ स्मार्ट खेती करें",
    regStep1:              "व्यक्तिगत जानकारी",
    regStep2:              "खेत की जानकारी",
    regStep3:              "पासवर्ड सेट करें",
    regFullName:           "पूरा नाम",
    regFullNamePh:         "अपना पूरा नाम दर्ज करें",
    regPhone:              "मोबाइल नंबर",
    regPhonePh:            "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
    regState:              "राज्य",
    regStatePh:            "अपना राज्य चुनें",
    regDistrict:           "जिला / तालुका",
    regDistrictPh:         "अपना जिला या तालुका दर्ज करें",
    regVillage:            "गाँव / क्षेत्र",
    regVillagePh:          "अपना गाँव या क्षेत्र दर्ज करें",
    regLandSize:           "भूमि का आकार",
    regLandSizePh:         "उदा. 2.5",
    regLandUnit:           "इकाई",
    regAcres:              "एकड़",
    regHectares:           "हेक्टेयर",
    regCropType:           "मुख्य फसल प्रकार",
    regCropTypePh:         "फसल प्रकार चुनें",
    regCropGrain:          "अनाज / धान्य",
    regCropVeg:            "सब्जियाँ",
    regCropFruit:          "फल",
    regCropCash:           "नकद फसलें",
    regCropOther:          "अन्य",
    regPassword:           "पासवर्ड",
    regPasswordPh:         "पासवर्ड बनाएं (कम से कम 6 अक्षर)",
    regConfirmPassword:    "पासवर्ड की पुष्टि करें",
    regConfirmPasswordPh:  "पासवर्ड दोबारा दर्ज करें",
    regTerms:              "मैं नियम एवं शर्तों से सहमत हूँ",
    regNext:               "आगे",
    regBack:               "वापस",
    regSubmit:             "खाता बनाएं",
    regSubmitting:         "खाता बनाया जा रहा है…",
    regHaveAccount:        "पहले से खाता है?",
    regLogin:              "यहाँ लॉग इन करें",
    regSuccess:            "खाता बन गया! कृषिमित्र में आपका स्वागत है!",
    regErrName:            "कृपया अपना पूरा नाम दर्ज करें।",
    regErrPhone:           "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
    regErrState:           "कृपया अपना राज्य चुनें।",
    regErrDistrict:        "कृपया अपना जिला दर्ज करें।",
    regErrLand:            "कृपया सही भूमि आकार दर्ज करें।",
    regErrPassword:        "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
    regErrConfirm:         "पासवर्ड मेल नहीं खाते।",
    regErrTerms:           "जारी रखने के लिए आपको शर्तों से सहमत होना होगा।",
    regErrGeneral:         "पंजीकरण विफल। कृपया पुनः प्रयास करें।",
    regStrWeak:            "कमज़ोर",
    regStrFair:            "ठीक",
    regStrGood:            "अच्छा",
    regStrStrong:          "मज़बूत",
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