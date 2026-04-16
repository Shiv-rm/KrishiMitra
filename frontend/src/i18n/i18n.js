// ── KrishiMitra Multilingual Module ──────────────────────────────────────────
// Simple, zero-dependency i18n: English ↔ Hindi
// Usage:  import { t, setLang, getLang, onLangChange } from './i18n.js';

const translations = {
  en: {
    welcomePrefix: "Welcome,",
    // Tabs
    tabAnalysis: "Crop Analysis",
    tabRoadmaps: "Roadmaps",
    tabPest: "Pest Protection",
    tabDisease: "Disease Prediction",
    tabPestDetect: "Pest Detection",
    tabDiseaseDetect: "Disease Detection",
    // Header
    tagline: "Empowering farmers with data-driven insights",
    navLogin: "Login / Register",

    // New Cards
    marketTitle: "Market Insights",
    roadmapTitle: "Resource Management Roadmap",
    roadmapEmpty: "Please complete a Crop Analysis first to generate your personalized resource roadmap.",
    roadmapTimelineTitle: "Timeline / Sowing & Growing",
    roadmapResourcesTitle: "Required Resources",
    roadmapSubTimeline: "Timeline",
    roadmapSubResources: "Resources",
    roadmapSubRotation: "Crop Rotation",
    roadmapRotationTitle: "Crop Rotation Planner",
    roadmapTotalResources: "Total Resources Required (Full Season)",
    weatherTitle: "Weather Advisory",
    pestExpectedTitle: "Expected Pest Threats",
    pestExpectedDesc: "AI-predicted based on your recommended crop",
    pestUploadHint: "Click to select or drag & drop a photo",
    pestTitle: "Pest Protection & Detection",
    pestDesc: "Upload a photo of the pest or damage for diagnosis.",
    pestBtn: "Analyze Pest",

    diseasePredictionTitle: "Crop Disease Prediction",
    diseasePredictionDesc: "Upload a photo of the infected leaf for AI diagnosis.",
    diseaseBtn: "Analyze Leaf",
    diseaseUploadHint: "Click to select or drag & drop a leaf photo",

    // Card
    cardTitle: "Field Analysis",
    cardDesc: "Get real-time soil and climate data for your specific location.",

    // Button / status
    analyzeBtn: "Analyze My Location",
    requestingLoc: "Requesting location access…",
    analysingCoords: "Analysing coordinates…",
    success: "Success! Data retrieved.",
    errorPrefix: "Error:",
    connError: "Connection error: Server may be offline",

    // Geolocation errors
    permDenied: "Permission denied. Enable GPS.",
    posUnavail: "Location unavailable.",
    timeout: "Request timed out.",
    unknownErr: "An unknown error occurred.",

    // Results panel
    recommendedCrop: "Recommended Crop",
    bestMatch: "Best match for your soil & climate",
    nitrogen: "Nitrogen",
    phosphorus: "Phosphorus",
    potassium: "Potassium",
    soilPH: "Soil pH",
    temperature: "Temperature",
    humidity: "Humidity",
    rainfall: "Rainfall",

    // Footer
    footer: "© 2026 KrishiMitra. Advanced Agricultural Intelligence.",

    // Login page
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to access your KrishiMitra dashboard",
    loginPhone: "Mobile Number",
    loginPhonePlaceholder: "Enter your 10-digit mobile number",
    loginPassword: "Password",
    loginPasswordPlaceholder: "Enter your password",
    loginBtn: "Login",
    loginForgot: "Forgot Password?",
    loginNoAccount: "Don't have an account?",
    loginRegister: "Register here",
    loginOr: "or",
    loginWithOTP: "Login with OTP",
    loginErrPhone: "Please enter a valid 10-digit mobile number.",
    loginErrPassword: "Password must be at least 6 characters.",
    loginErrGeneral: "Login failed. Please try again.",
    loginSuccess: "Login successful! Redirecting…",
    loginLogging: "Logging in…",
    loginGreeting: "Good farming starts here",

    // Register page
    regTitle: "Create Your Account",
    regSubtitle: "Join thousands of farmers using KrishiMitra",
    regGreeting: "Grow smarter with KrishiMitra",
    regStep1: "Personal Info",
    regStep2: "Farm Details",
    regStep3: "Set Password",
    regFullName: "Full Name",
    regFullNamePh: "Enter your full name",
    regPhone: "Mobile Number",
    regPhonePh: "Enter your 10-digit mobile number",
    regState: "State",
    regStatePh: "Select your state",
    regDistrict: "District / Taluka",
    regDistrictPh: "Enter your district or taluka",
    regVillage: "Village / Area",
    regVillagePh: "Enter your village or area",
    regLandSize: "Land Size",
    regLandSizePh: "e.g. 2.5",
    regLandUnit: "Unit",
    regAcres: "Acres",
    regHectares: "Hectares",
    regCropType: "Primary Crop Type",
    regCropTypePh: "Select crop type",
    regCropGrain: "Grain / Cereal",
    regCropVeg: "Vegetables",
    regCropFruit: "Fruits",
    regCropCash: "Cash Crops",
    regCropOther: "Other",
    regPassword: "Password",
    regPasswordPh: "Create a password (min. 6 characters)",
    regConfirmPassword: "Confirm Password",
    regConfirmPasswordPh: "Re-enter your password",
    regTerms: "I agree to the Terms & Conditions",
    regNext: "Next",
    regBack: "Back",
    regSubmit: "Create Account",
    regSubmitting: "Creating account…",
    regHaveAccount: "Already have an account?",
    regLogin: "Login here",
    regSuccess: "Account created! Welcome to KrishiMitra!",
    regErrName: "Please enter your full name.",
    regErrPhone: "Please enter a valid 10-digit mobile number.",
    regErrState: "Please select your state.",
    regErrDistrict: "Please enter your district.",
    regErrLand: "Please enter a valid land size.",
    regErrPassword: "Password must be at least 6 characters.",
    regErrConfirm: "Passwords do not match.",
    regErrTerms: "You must agree to the terms to continue.",
    regErrGeneral: "Registration failed. Please try again.",
    regStrWeak: "Weak",
    regStrFair: "Fair",
    regStrGood: "Good",
    regStrStrong: "Strong",
    regOtpLabel: "Enter OTP",
    regOtpPh: "Enter the 6-digit OTP",
    regOtpDevNote: "In development, the OTP will be shown in an alert.",
    regErrOtp: "Please enter the OTP.",
    regSendingOtp: "Sending OTP...",
    regVerifyBtn: "Verify & Register",
    regErrOtpSend: "Could not send OTP.",
    regErrOtpInvalid: "Invalid or expired OTP.",

    // Dashboard UI
    dashTopCrops: "Top Crop Candidates",
    dashPotentialAlt: "Potential Alternative",
    dashConfidence: "Confidence",
    dashYieldForecast: "Yield Forecast",
    dashProfitMargin: "Est. Profit Margin",
    dashSustainScore: "Sustainability Score",
    dashPrice: "Price:",
    dashDemand: "Demand:",
    dashTrend: "Trend:",
    dashByPhase: "by Phase",
    dashPrevention: "Prevention:",
    dashFieldParams: "Field Parameters",
    dashErrSelectImg: "Please select an image first.",
    dashPestAnalyzing: "Analyzing pest image...",
    dashDiseaseAnalyzing: "Analyzing leaf image...",
    dashErrPestAnalyze: "Failed to recognize pest.",
    dashErrDiseaseAnalyze: "Failed to diagnose disease.",
    dashPestUnknownIssue: "Unknown Issue",
    dashPestNoAnalysis: "No detailed analysis provided.",
    dashPestTreatments: "Recommended Treatments:",
    dashPestPrevention: "Preventive Measures:",
    dashErrConnection: "Connection error.",

    // Chat UI
    chatGreeting: "Hello! Ask me about crops, diseases, or weather.",
    chatAskPh: "Ask AI...",
    chatListening: "Listening...",
    chatUploading: "Uploaded Image",
    chatLoading: "...",
    chatErrorProc: "Sorry, I couldn't process that.",
    chatErrorConn: "Connection error. Please try again.",
    chatVoiceNotSupp: "Voice input is not supported in this browser."
  },

  hi: {
    welcomePrefix: "स्वागत है,",
    // Tabs
    tabAnalysis: "फसल विश्लेषण",
    tabRoadmaps: "रोडमैप",
    tabPest: "कीट सुरक्षा",
    tabDisease: "रोग पहचान",
    tabPestDetect: "कीट पहचान",
    tabDiseaseDetect: "रोग पहचान",
    // Header
    tagline: "किसानों को डेटा-आधारित जानकारी से सशक्त बनाना",
    navLogin: "लॉग इन / पंजीकरण",

    // New Cards
    marketTitle: "बाजार अंतर्दृष्टि",
    roadmapTitle: "संसाधन प्रबंधन रोडमैप",
    roadmapEmpty: "अपना व्यक्तिगत संसाधन रोडमैप उत्पन्न करने के लिए कृपया पहले फसल विश्लेषण पूरा करें।",
    roadmapTimelineTitle: "समयरेखा (बुवाई और विकास)",
    roadmapResourcesTitle: "आवश्यक संसाधन",
    roadmapSubTimeline: "समयरेखा",
    roadmapSubResources: "संसाधन",
    roadmapSubRotation: "फसल चक्र",
    roadmapRotationTitle: "फसल चक्र योजनाकार",
    roadmapTotalResources: "कुल आवश्यक संसाधन (पूरा मौसम)",
    weatherTitle: "मौसम सलाह",
    pestExpectedTitle: "अपेक्षित कीट खतरे",
    pestExpectedDesc: "आपकी अनुशंसित फसल के आधार पर AI-अनुमानित",
    pestUploadHint: "तस्वीर चुनने के लिए क्लिक करें या खींचें",
    pestTitle: "कीट सुरक्षा एवं पहचान",
    pestDesc: "निदान के लिए कीट या क्षति की एक तस्वीर अपलोड करें।",
    pestBtn: "कीट का विश्लेषण करें",

    diseasePredictionTitle: "फसल रोग पहचान",
    diseasePredictionDesc: "AI निदान के लिए संक्रमित पत्ती की तस्वीर अपलोड करें।",
    diseaseBtn: "पत्ती का विश्लेषण करें",
    diseaseUploadHint: "पत्ती की तस्वीर चुनने के लिए क्लिक करें या खींचें",

    // Card
    cardTitle: "क्षेत्र विश्लेषण",
    cardDesc: "अपने स्थान के लिए वास्तविक समय की मिट्टी और जलवायु डेटा प्राप्त करें।",

    // Button / status
    analyzeBtn: "मेरे स्थान का विश्लेषण करें",
    requestingLoc: "स्थान की अनुमति माँगी जा रही है…",
    analysingCoords: "निर्देशांक का विश्लेषण हो रहा है…",
    success: "सफल! डेटा प्राप्त हुआ।",
    errorPrefix: "त्रुटि:",
    connError: "कनेक्शन त्रुटि: सर्वर ऑफ़लाइन हो सकता है",

    // Geolocation errors
    permDenied: "अनुमति अस्वीकृत। GPS सक्षम करें।",
    posUnavail: "स्थान उपलब्ध नहीं है।",
    timeout: "अनुरोध का समय समाप्त।",
    unknownErr: "एक अज्ञात त्रुटि हुई।",

    // Results panel
    recommendedCrop: "अनुशंसित फसल",
    bestMatch: "आपकी मिट्टी और जलवायु के लिए सर्वोत्तम",
    nitrogen: "नाइट्रोजन",
    phosphorus: "फास्फोरस",
    potassium: "पोटेशियम",
    soilPH: "मिट्टी का pH",
    temperature: "तापमान",
    humidity: "आर्द्रता",
    rainfall: "वर्षा",

    // Footer
    footer: "© 2026 कृषिमित्र। उन्नत कृषि बुद्धिमत्ता।",

    // Login page
    loginTitle: "वापस स्वागत है",
    loginSubtitle: "अपना कृषिमित्र डैशबोर्ड देखने के लिए साइन इन करें",
    loginPhone: "मोबाइल नंबर",
    loginPhonePlaceholder: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
    loginPassword: "पासवर्ड",
    loginPasswordPlaceholder: "अपना पासवर्ड दर्ज करें",
    loginBtn: "लॉग इन",
    loginForgot: "पासवर्ड भूल गए?",
    loginNoAccount: "खाता नहीं है?",
    loginRegister: "यहाँ पंजीकरण करें",
    loginOr: "या",
    loginWithOTP: "OTP से लॉग इन करें",
    loginErrPhone: "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
    loginErrPassword: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
    loginErrGeneral: "लॉग इन विफल। कृपया पुनः प्रयास करें।",
    loginSuccess: "लॉग इन सफल! पुनर्निर्देशित हो रहा है…",
    loginLogging: "लॉग इन हो रहा है…",
    loginGreeting: "अच्छी खेती यहाँ से शुरू होती है",

    // Register page
    regTitle: "अपना खाता बनाएं",
    regSubtitle: "हजारों किसानों के साथ कृषिमित्र से जुड़ें",
    regGreeting: "कृषिमित्र के साथ स्मार्ट खेती करें",
    regStep1: "व्यक्तिगत जानकारी",
    regStep2: "खेत की जानकारी",
    regStep3: "पासवर्ड सेट करें",
    regFullName: "पूरा नाम",
    regFullNamePh: "अपना पूरा नाम दर्ज करें",
    regPhone: "मोबाइल नंबर",
    regPhonePh: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
    regState: "राज्य",
    regStatePh: "अपना राज्य चुनें",
    regDistrict: "जिला / तालुका",
    regDistrictPh: "अपना जिला या तालुका दर्ज करें",
    regVillage: "गाँव / क्षेत्र",
    regVillagePh: "अपना गाँव या क्षेत्र दर्ज करें",
    regLandSize: "भूमि का आकार",
    regLandSizePh: "उदा. 2.5",
    regLandUnit: "इकाई",
    regAcres: "एकड़",
    regHectares: "हेक्टेयर",
    regCropType: "मुख्य फसल प्रकार",
    regCropTypePh: "फसल प्रकार चुनें",
    regCropGrain: "अनाज / धान्य",
    regCropVeg: "सब्जियाँ",
    regCropFruit: "फल",
    regCropCash: "नकद फसलें",
    regCropOther: "अन्य",
    regPassword: "पासवर्ड",
    regPasswordPh: "पासवर्ड बनाएं (कम से कम 6 अक्षर)",
    regConfirmPassword: "पासवर्ड की पुष्टि करें",
    regConfirmPasswordPh: "पासवर्ड दोबारा दर्ज करें",
    regTerms: "मैं नियम एवं शर्तों से सहमत हूँ",
    regNext: "आगे",
    regBack: "वापस",
    regSubmit: "खाता बनाएं",
    regSubmitting: "खाता बनाया जा रहा है…",
    regHaveAccount: "पहले से खाता है?",
    regLogin: "यहाँ लॉग इन करें",
    regSuccess: "खाता बन गया! कृषिमित्र में आपका स्वागत है!",
    regErrName: "कृपया अपना पूरा नाम दर्ज करें।",
    regErrPhone: "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
    regErrState: "कृपया अपना राज्य चुनें।",
    regErrDistrict: "कृपया अपना जिला दर्ज करें।",
    regErrLand: "कृपया सही भूमि आकार दर्ज करें।",
    regErrPassword: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
    regErrConfirm: "पासवर्ड मेल नहीं खाते।",
    regErrTerms: "जारी रखने के लिए आपको शर्तों से सहमत होना होगा।",
    regErrGeneral: "पंजीकरण विफल। कृपया पुनः प्रयास करें।",
    regStrWeak: "कमज़ोर",
    regStrFair: "ठीक",
    regStrGood: "अच्छा",
    regStrStrong: "मज़बूत",
    regOtpLabel: "OTP दर्ज करें",
    regOtpPh: "6-अंकों का OTP दर्ज करें",
    regOtpDevNote: "विकास के दौरान, OTP एक अलर्ट में दिखाया जाएगा।",
    regErrOtp: "कृपया OTP दर्ज करें।",
    regSendingOtp: "OTP भेजा जा रहा है...",
    regVerifyBtn: "सत्यापित करें और पंजीकरण करें",
    regErrOtpSend: "OTP नहीं भेजा जा सका।",
    regErrOtpInvalid: "अमान्य या समाप्त OTP।",

    // Dashboard UI
    dashTopCrops: "शीर्ष फसल उम्मीदवार",
    dashPotentialAlt: "संभावित विकल्प",
    dashConfidence: "आत्मविश्वास",
    dashYieldForecast: "उपज का पूर्वानुमान",
    dashProfitMargin: "अनुमानित लाभ मार्जिन",
    dashSustainScore: "स्थिरता स्कोर",
    dashPrice: "कीमत:",
    dashDemand: "मांग:",
    dashTrend: "रुझान:",
    dashByPhase: "चरण के अनुसार",
    dashPrevention: "रोकथाम:",
    dashFieldParams: "क्षेत्र के पैरामीटर",
    dashErrSelectImg: "कृपया पहले एक छवि चुनें।",
    dashPestAnalyzing: "कीट की छवि का विश्लेषण हो रहा है...",
    dashDiseaseAnalyzing: "पत्ती की छवि का विश्लेषण हो रहा है...",
    dashErrPestAnalyze: "कीट की पहचान करने में विफल।",
    dashErrDiseaseAnalyze: "रोग का निदान करने में विफल।",
    dashPestUnknownIssue: "अज्ञात समस्या",
    dashPestNoAnalysis: "कोई विस्तृत विश्लेषण प्रदान नहीं किया गया।",
    dashPestTreatments: "अनुशंसित उपचार:",
    dashPestPrevention: "निवारक उपाय:",
    dashErrConnection: "कनेक्शन त्रुटि।",

    // Chat UI
    chatGreeting: "नमस्ते! मुझसे फसलों, बीमारियों या मौसम के बारे में पूछें।",
    chatAskPh: "AI से पूछें...",
    chatListening: "सुन रहा हूँ...",
    chatUploading: "छवि अपलोड की गई",
    chatLoading: "...",
    chatErrorProc: "क्षमा करें, मैं इसे प्रसंस्कृत नहीं कर सका।",
    chatErrorConn: "कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।",
    chatVoiceNotSupp: "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है।"
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

  // Translate placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });

  // Translate titles (tooltips)
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    el.setAttribute("title", t(key));
  });
  // Update the html lang attribute for accessibility
  document.documentElement.lang = currentLang;
}