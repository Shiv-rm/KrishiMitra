import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import gTTS from 'gtts';
import { fileURLToPath } from 'url';
import { 
    getGroqResponse, 
    transcribeAudio, 
    analyzePestImage,
    generateRoadmap,
    generateCropRotationPlan,
    analyzeLoanEligibility
} from './groq_ai_service.js';
import { pool } from './database/pdb.js';
import axios from 'axios';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'your_bot_token_here') {
    console.error("TELEGRAM_BOT_TOKEN is not correctly set in .env file.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('KrishiMitra Telegram Bot is running...');

async function updateDatabaseSchema() {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;');
        console.log("Database schema updated for Telegram Bot Auth.");
    } catch (e) {
        console.error("Error updating DB schema:", e);
    }
}
updateDatabaseSchema();

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// --- State Management ---
const userStates = {};
const userLanguage = {}; // 'hi' or 'en'

const STATES = {
    IDLE: 'IDLE',
    AWAITING_WEATHER_LOCATION: 'AWAITING_WEATHER_LOCATION',
    AWAITING_MARKET_CROP: 'AWAITING_MARKET_CROP',
    AWAITING_ROADMAP_CROP: 'AWAITING_ROADMAP_CROP',
    AWAITING_ROTATION_CROP: 'AWAITING_ROTATION_CROP',
    AWAITING_LOAN_DETAILS: 'AWAITING_LOAN_DETAILS',
    AWAITING_CHAT: 'AWAITING_CHAT'
};

// --- Menus ---
const langMenu = {
    reply_markup: {
        keyboard: [[{ text: "🇮🇳 हिंदी (Hindi)" }, { text: "🇬🇧 English" }]],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

const menus = {
    'hi': {
        unauth: { reply_markup: { keyboard: [[{ text: "📲 लॉगिन करें", request_contact: true }], [{ text: "🌐 भाषा बदलें" }]], resize_keyboard: true, one_time_keyboard: true } },
        auth: { reply_markup: { keyboard: [
            [{ text: "📊 मेरी प्रोफाइल" }, { text: "🌦️ मौसम और सलाह" }],
            [{ text: "📈 मंडी के भाव" }, { text: "🩺 फसल रोग पहचान" }],
            [{ text: "🗺️ फसल योजना" }, { text: "🌱 फसल चक्र" }],
            [{ text: "💰 लोन जानकारी" }, { text: "🎤 कृषिमित्र से बात करें" }],
            [{ text: "🌐 भाषा बदलें" }]
        ], resize_keyboard: true, one_time_keyboard: false } }
    },
    'en': {
        unauth: { reply_markup: { keyboard: [[{ text: "📲 Login", request_contact: true }], [{ text: "🌐 Change Language" }]], resize_keyboard: true, one_time_keyboard: true } },
        auth: { reply_markup: { keyboard: [
            [{ text: "📊 My Profile" }, { text: "🌦️ Weather & Advisory" }],
            [{ text: "📈 Market Trends" }, { text: "🩺 Crop Disease" }],
            [{ text: "🗺️ Crop Plan" }, { text: "🌱 Crop Cycle" }],
            [{ text: "💰 Loan Info" }, { text: "🎤 Ask KrishiMitra" }],
            [{ text: "🌐 Change Language" }]
        ], resize_keyboard: true, one_time_keyboard: false } }
    }
};

const strings = {
    'hi': {
        welcome: "नमस्ते! कृपया अपनी भाषा चुनें।",
        login_prompt: "सुविधाओं का उपयोग करने के लिए कृपया अपना फोन नंबर साझा करके लॉगिन करें।",
        welcome_back: name => `नमस्ते ${name}! मैं कृषिमित्र हूँ। नीचे दिए गए मेनू से अपनी जरूरत का विकल्प चुनें।`,
        login_req: "कृपया पहले लॉगिन करें।",
        login_success: name => `लॉगिन सफल रहा! स्वागत है ${name}।`,
        login_fail: "आपका नंबर हमारे डेटाबेस में नहीं मिला। कृपया पहले कृषिमित्र वेबसाइट पर रजिस्टर करें।",
        profile: "प्रोफाइल",
        name: "नाम",
        land: "जमीन",
        current_crop: "वर्तमान फसल",
        rec_crop: "अनुशंसित फसल",
        not_avail: "उपलब्ध नहीं",
        plan_prep: "आपके लिए विशेष योजना तैयार की जा रही है...",
        crop_plan: "आपकी फसल योजना",
        error_plan: "योजना तैयार करने में समस्या आई।",
        plan_ready: "आपकी फसल योजना तैयार है, कृपया स्क्रीन पर पढ़ें।",
        error_profile: "प्रोफाइल लाने में समस्या हुई।",
        ask_loc: "कृपया अपने शहर या गांव का नाम बोलें या लिखें।",
        ask_market: "कृपया उस फसल का नाम बोलें या लिखें जिसके भाव आप जानना चाहते हैं।",
        ask_disease: "कृपया अपनी बीमार फसल या पत्ते की एक साफ फोटो खींचकर भेजें।",
        ask_roadmap: "कृपया उस फसल का नाम बोलें या लिखें जिसकी योजना आप जानना चाहते हैं।",
        ask_rotation: "आपने अभी कौन सी फसल काटी है? कृपया नाम बोलें या लिखें।",
        ask_loan: "कृपया अपनी जमीन का आकार (जैसे 2 एकड़) और फसल का नाम एक साथ बोलें या लिखें।",
        ask_chat: "आप मुझसे कोई भी कृषि से जुड़ा सवाल पूछ सकते हैं। बोलें या लिखें।",
        weather_search: "मौसम की जानकारी खोजी जा रही है...",
        weather_title: "मौसम",
        temp: "तापमान",
        rain: "बारिश की संभावना",
        adv: "कृषिमित्र की सलाह",
        not_found: "मुझे यह स्थान नहीं मिला। कृपया फिर से कोशिश करें।",
        weather_err: "मौसम की जानकारी लाने में समस्या हुई।",
        mandi: "मंडी भाव",
        est_price: "अनुमानित मूल्य",
        trend: "ट्रेंड",
        up: "बढ़ रहा है (Upward)",
        down: "घट रहा है (Downward)",
        live_data: "यह एक अनुमानित लाइव डेटा है",
        roadmap_prep: "आपकी फसल की योजना तैयार की जा रही है...",
        rotation_prep: "फसल चक्र का विश्लेषण किया जा रहा है...",
        rotation_sug: "फसल चक्र सुझाव",
        reason: "कारण",
        loan_prep: "लोन योजनाओं की जांच की जा रही है...",
        loan_analysis: "लोन विश्लेषण",
        schemes: "योजनाएं",
        tech_err: "कुछ तकनीकी समस्या आई। कृपया फिर से प्रयास करें।",
        disease: "रोग/समस्या",
        analysis: "विश्लेषण",
        treatment: "उपचार",
        prevention: "बचाव",
        disease_err: "छवि का विश्लेषण करने में समस्या आई।",
        voice_err: "मुझे आपकी आवाज़ समझ नहीं आई।",
        voice_proc_err: "आवाज़ प्रोसेस करने में कुछ समस्या आई।"
    },
    'en': {
        welcome: "Hello! Please select your language.",
        login_prompt: "Please share your phone number to login and access features.",
        welcome_back: name => `Hello ${name}! I am KrishiMitra. Choose an option from the menu below.`,
        login_req: "Please login first.",
        login_success: name => `Login successful! Welcome ${name}.`,
        login_fail: "Your number was not found in our database. Please register on the KrishiMitra website first.",
        profile: "Profile",
        name: "Name",
        land: "Land",
        current_crop: "Current Crop",
        rec_crop: "Recommended Crop",
        not_avail: "Not Available",
        plan_prep: "A special plan is being prepared for you...",
        crop_plan: "Your Crop Plan",
        error_plan: "There was a problem preparing the plan.",
        plan_ready: "Your crop plan is ready, please read it on the screen.",
        error_profile: "Problem fetching profile.",
        ask_loc: "Please say or type the name of your city or village.",
        ask_market: "Please say or type the name of the crop for market prices.",
        ask_disease: "Please send a clear photo of your diseased crop or leaf.",
        ask_roadmap: "Please say or type the name of the crop for the roadmap.",
        ask_rotation: "What crop did you just harvest? Please say or type the name.",
        ask_loan: "Please say or type your land size (e.g., 2 acres) and crop name together.",
        ask_chat: "You can ask me any agriculture-related question. Say or type it.",
        weather_search: "Searching for weather info...",
        weather_title: "Weather",
        temp: "Temperature",
        rain: "Rain Probability",
        adv: "KrishiMitra Advisory",
        not_found: "I couldn't find this location. Please try again.",
        weather_err: "Problem fetching weather info.",
        mandi: "Market Price",
        est_price: "Estimated Price",
        trend: "Trend",
        up: "Upward",
        down: "Downward",
        live_data: "This is estimated live data",
        roadmap_prep: "Your crop roadmap is being prepared...",
        rotation_prep: "Analyzing crop rotation...",
        rotation_sug: "Crop Rotation Suggestions",
        reason: "Reason",
        loan_prep: "Checking loan schemes...",
        loan_analysis: "Loan Analysis",
        schemes: "Schemes",
        tech_err: "A technical error occurred. Please try again.",
        disease: "Disease/Issue",
        analysis: "Analysis",
        treatment: "Treatment",
        prevention: "Prevention",
        disease_err: "Problem analyzing the image.",
        voice_err: "I couldn't understand your voice.",
        voice_proc_err: "Problem processing the voice note."
    }
};

// --- Helper Functions ---
function textToSpeech(text, lang = 'hi') {
    return new Promise((resolve, reject) => {
        const gtts = new gTTS(text, lang);
        const fileName = `response_${Date.now()}.mp3`;
        const filePath = path.join(tempDir, fileName);
        gtts.save(filePath, err => err ? reject(err) : resolve(filePath));
    });
}

async function sendVoiceAndText(chatId, text, lang = 'hi', replyMarkup = null) {
    const options = replyMarkup ? { parse_mode: 'Markdown', ...replyMarkup } : { parse_mode: 'Markdown' };
    await bot.sendMessage(chatId, text, options);
    try {
        bot.sendChatAction(chatId, 'record_voice');
        const audioPath = await textToSpeech(text, lang);
        await bot.sendVoice(chatId, audioPath);
        fs.unlinkSync(audioPath);
    } catch (e) {
        console.error("TTS Error:", e);
    }
}

async function getUserProfile(chatId) {
    try {
        const res = await pool.query('SELECT * FROM users WHERE telegram_chat_id = $1', [chatId]);
        return res.rows.length > 0 ? res.rows[0] : null;
    } catch(e) {
        return null;
    }
}

async function sendMainMenu(chatId, lang) {
    const user = await getUserProfile(chatId);
    if (user) {
        await sendVoiceAndText(chatId, strings[lang].welcome_back(user.full_name), lang, menus[lang].auth);
    } else {
        await sendVoiceAndText(chatId, strings[lang].login_prompt, lang, menus[lang].unauth);
    }
}

async function getUserDefaultCrop(user, lang) {
    if (user && user.crop_type) return user.crop_type;
    if (user) {
        try {
            const queryRes = await pool.query('SELECT analysis_data FROM crop_analysis_cache WHERE user_id = $1 ORDER BY analysed_at DESC LIMIT 1', [user.id]);
            if (queryRes.rows.length > 0 && queryRes.rows[0].analysis_data && queryRes.rows[0].analysis_data.top_recommendation) {
                return queryRes.rows[0].analysis_data.top_recommendation;
            }
        } catch(e) {}
    }
    return lang === 'hi' ? 'गेहूं' : 'wheat';
}

async function getUserDefaultLocation(user, lang) {
    if (user) {
        if (user.village) return user.village;
        if (user.district) return user.district;
        if (user.state) return user.state;
        try {
            const queryRes = await pool.query('SELECT analysis_data FROM crop_analysis_cache WHERE user_id = $1 ORDER BY analysed_at DESC LIMIT 1', [user.id]);
            if (queryRes.rows.length > 0 && queryRes.rows[0].analysis_data && queryRes.rows[0].analysis_data.location_source) {
                const locSource = queryRes.rows[0].analysis_data.location_source;
                if (locSource.includes(':')) {
                    const parts = locSource.split(':');
                    if (parts.length > 1) {
                        return parts[1].split(',')[0];
                    }
                }
            }
        } catch(e) {}
    }
    return lang === 'hi' ? 'नई दिल्ली' : 'New Delhi';
}

// --- Handlers ---

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = STATES.IDLE;
    // Always ask for language on start
    await bot.sendMessage(chatId, "Please select your language / कृपया अपनी भाषा चुनें", langMenu);
});

bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const lang = userLanguage[chatId] || 'hi';
    let phone = msg.contact.phone_number;
    
    if (phone.startsWith('+91')) phone = phone.slice(3);
    else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
    
    bot.sendChatAction(chatId, 'typing');
    try {
        const res = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        if (res.rows.length > 0) {
            await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE phone = $2', [chatId, phone]);
            await sendVoiceAndText(chatId, strings[lang].login_success(res.rows[0].full_name), lang, menus[lang].auth);
        } else {
            await sendVoiceAndText(chatId, strings[lang].login_fail, lang, menus[lang].unauth);
        }
    } catch (e) {
        console.error("Login Error:", e);
        sendVoiceAndText(chatId, strings[lang].tech_err, lang, menus[lang].unauth);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text || msg.text.startsWith('/') || msg.contact) return;

    const text = msg.text;
    
    // Language Selection
    if (text === "🇮🇳 हिंदी (Hindi)") {
        userLanguage[chatId] = 'hi';
        return await sendMainMenu(chatId, 'hi');
    }
    if (text === "🇬🇧 English") {
        userLanguage[chatId] = 'en';
        return await sendMainMenu(chatId, 'en');
    }
    if (text === "🌐 भाषा बदलें" || text === "🌐 Change Language") {
        return await bot.sendMessage(chatId, "Please select your language / कृपया अपनी भाषा चुनें", langMenu);
    }

    const lang = userLanguage[chatId] || 'hi';
    const s = strings[lang];
    const authM = menus[lang].auth;

    if (text === "📊 मेरी प्रोफाइल" || text === "📊 My Profile") {
        userStates[chatId] = STATES.IDLE;
        bot.sendChatAction(chatId, 'typing');
        
        try {
            const user = await getUserProfile(chatId);
            if (!user) return sendVoiceAndText(chatId, s.login_req, lang, menus[lang].unauth);
            
            const land = `${user.land_size || 1} ${user.land_unit || 'acres'}`;
            const crop = user.crop_type || 'गेहूं'; 

            let recommendedCrop = s.not_avail;
            const queryRes = await pool.query('SELECT analysis_data FROM crop_analysis_cache WHERE user_id = $1 ORDER BY analysed_at DESC LIMIT 1', [user.id]);
            if (queryRes.rows.length > 0 && queryRes.rows[0].analysis_data && queryRes.rows[0].analysis_data.top_recommendation) {
                recommendedCrop = queryRes.rows[0].analysis_data.top_recommendation;
            }
            
            bot.sendMessage(chatId, `**${s.profile}**\n${s.name}: ${user.full_name}\n${s.land}: ${land}\n${s.rec_crop}: ${recommendedCrop}\n\n${s.plan_prep}`, {parse_mode: 'Markdown'});
            
            const planCrop = (recommendedCrop !== s.not_avail) ? recommendedCrop : crop;

            const roadmap = await generateRoadmap(planCrop, user.land_size || 1, user.land_unit || 'acres', lang); 
            let msgText = `**${s.crop_plan}: ${planCrop}**\n\n`;
            if (roadmap.timeline) {
                roadmap.timeline.slice(0, 3).forEach(t => {
                    const cleanAction = t.action.replace(/[*_`]/g, '');
                    msgText += `• ${t.phase} (${t.time}): ${cleanAction}\n\n`;
                });
            } else {
                msgText += s.error_plan;
            }
            
            await bot.sendMessage(chatId, msgText, {parse_mode: 'Markdown', ...authM});
            try {
                bot.sendChatAction(chatId, 'record_voice');
                const audioPath = await textToSpeech(s.plan_ready, lang);
                await bot.sendVoice(chatId, audioPath);
                fs.unlinkSync(audioPath);
            } catch(e) {}
        } catch (e) {
            console.error("Profile Error:", e);
            sendVoiceAndText(chatId, s.error_profile, lang, authM);
        }
        return;
    }

    if (text === "🌦️ मौसम और सलाह" || text === "🌦️ Weather & Advisory") {
        const user = await getUserProfile(chatId);
        const location = await getUserDefaultLocation(user, lang);
        userStates[chatId] = STATES.AWAITING_WEATHER_LOCATION;
        return await processStateInput(chatId, location);
    }
    if (text === "📈 मंडी के भाव" || text === "📈 Market Trends") {
        const user = await getUserProfile(chatId);
        const crop = await getUserDefaultCrop(user, lang);
        userStates[chatId] = STATES.AWAITING_MARKET_CROP;
        return await processStateInput(chatId, crop);
    }
    if (text === "🩺 फसल रोग पहचान" || text === "🩺 Crop Disease") {
        userStates[chatId] = STATES.IDLE;
        return sendVoiceAndText(chatId, s.ask_disease, lang, authM);
    }
    if (text === "🗺️ फसल योजना" || text === "🗺️ Crop Plan") {
        const user = await getUserProfile(chatId);
        const crop = await getUserDefaultCrop(user, lang);
        userStates[chatId] = STATES.AWAITING_ROADMAP_CROP;
        return await processStateInput(chatId, crop);
    }
    if (text === "🌱 फसल चक्र" || text === "🌱 Crop Cycle") {
        const user = await getUserProfile(chatId);
        const crop = await getUserDefaultCrop(user, lang);
        userStates[chatId] = STATES.AWAITING_ROTATION_CROP;
        return await processStateInput(chatId, crop);
    }
    if (text === "💰 लोन जानकारी" || text === "💰 Loan Info") {
        userStates[chatId] = STATES.AWAITING_LOAN_DETAILS;
        return sendVoiceAndText(chatId, s.ask_loan, lang, authM);
    }
    if (text === "🎤 कृषिमित्र से बात करें" || text === "🎤 Ask KrishiMitra") {
        userStates[chatId] = STATES.AWAITING_CHAT;
        return sendVoiceAndText(chatId, s.ask_chat, lang, authM);
    }

    if (userStates[chatId] && userStates[chatId] !== STATES.IDLE) {
        await processStateInput(chatId, text);
    }
});

// Location handler (if mobile user uses attachment)
bot.on('location', async (msg) => {
    const chatId = msg.chat.id;
    const lang = userLanguage[chatId] || 'hi';
    const s = strings[lang];
    const authM = menus[lang].auth;
    const lat = msg.location.latitude;
    const lon = msg.location.longitude;
    userStates[chatId] = STATES.IDLE;

    bot.sendChatAction(chatId, 'typing');
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const response = await axios.get(url);
        const data = response.data;
        const temp = data.current_weather.temperature;
        const rain = data.daily?.precipitation_sum[0] || 0;
        
        const condition = `Temperature: ${temp}°C, Daily Rain: ${rain}mm.`;
        const alert = await getGroqResponse(`The current weather is: ${condition}. Please give a concise 1-sentence advisory for farming.`, null, lang);
        
        const msgText = `**${s.weather_title}**\n${s.temp}: ${temp}°C\n${s.rain}: ${rain}mm\n\n**${s.adv}**:\n${alert}`;
        sendVoiceAndText(chatId, msgText, lang, authM);
    } catch (e) {
        sendVoiceAndText(chatId, s.weather_err, lang, authM);
    }
});

bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const lang = userLanguage[chatId] || 'hi';
    const s = strings[lang];
    const authM = menus[lang].auth;
    bot.sendChatAction(chatId, 'record_voice');

    try {
        const fileId = msg.voice.file_id;
        const fileLink = await bot.getFileLink(fileId);
        const oggPath = path.join(tempDir, `voice_${Date.now()}.ogg`);
        
        const response = await axios({ method: 'GET', url: fileLink, responseType: 'stream' });
        const writer = fs.createWriteStream(oggPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const transcription = await transcribeAudio(oggPath, lang);
        fs.unlinkSync(oggPath);
        
        if (!transcription) return sendVoiceAndText(chatId, s.voice_err, lang, authM);

        await processStateInput(chatId, transcription);

    } catch (error) {
        console.error("Voice processing error:", error);
        sendVoiceAndText(chatId, s.voice_proc_err, lang, authM);
    }
});

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const lang = userLanguage[chatId] || 'hi';
    const s = strings[lang];
    const authM = menus[lang].auth;
    bot.sendChatAction(chatId, 'typing');
    userStates[chatId] = STATES.IDLE; 

    try {
        const photo = msg.photo[msg.photo.length - 1];
        const fileLink = await bot.getFileLink(photo.file_id);
        const response = await axios({ method: 'GET', url: fileLink, responseType: 'arraybuffer' });
        const base64Image = `data:image/jpeg;base64,${Buffer.from(response.data, 'binary').toString('base64')}`;
        
        bot.sendMessage(chatId, "...", authM); // Add a small delay indicator

        const analysis = await analyzePestImage(base64Image, lang);
        let responseText = `**${s.disease}**: ${analysis.disease}\n\n**${s.analysis}**: ${analysis.analysis}\n\n`;
        if (analysis.treatments?.length) responseText += `**${s.treatment}**:\n` + analysis.treatments.map(t => `- ${t}`).join("\n") + "\n\n";
        if (analysis.prevention?.length) responseText += `**${s.prevention}**:\n` + analysis.prevention.map(p => `- ${p}`).join("\n");

        sendVoiceAndText(chatId, responseText, lang, authM);
    } catch (error) {
        console.error("Photo error:", error);
        sendVoiceAndText(chatId, s.disease_err, lang, authM);
    }
});

// --- State Processor ---
async function processStateInput(chatId, input) {
    const lang = userLanguage[chatId] || 'hi';
    const s = strings[lang];
    const authM = menus[lang].auth;
    const state = userStates[chatId] || STATES.IDLE;
    bot.sendChatAction(chatId, 'typing');

    try {
        if (state === STATES.AWAITING_WEATHER_LOCATION) {
            bot.sendMessage(chatId, s.weather_search);
            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1`, { headers: { 'User-Agent': 'KrishiMitraBot/1.0' } });
                if (geoRes.data && geoRes.data.length > 0) {
                    const lat = geoRes.data[0].lat;
                    const lon = geoRes.data[0].lon;
                    
                    // Save village/location for next time
                    await pool.query('UPDATE users SET village = $1 WHERE telegram_chat_id = $2', [input, chatId]);

                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
                    const response = await axios.get(url);
                    const data = response.data;
                    const temp = data.current_weather.temperature;
                    const rain = data.daily?.precipitation_sum[0] || 0;
                    
                    const condition = `Temperature: ${temp}°C, Daily Rain: ${rain}mm in ${input}.`;
                    const alert = await getGroqResponse(`The current weather is: ${condition}. Please give a concise 1-sentence advisory for farming.`, null, lang);
                    
                    const msgText = `**${s.weather_title}: ${geoRes.data[0].display_name.split(',')[0]}**\n${s.temp}: ${temp}°C\n${s.rain}: ${rain}mm\n\n**${s.adv}**:\n${alert}`;
                    await sendVoiceAndText(chatId, msgText, lang, authM);
                } else {
                    await sendVoiceAndText(chatId, s.not_found, lang, authM);
                }
            } catch (e) {
                console.error("Weather Error:", e);
                await sendVoiceAndText(chatId, s.weather_err, lang, authM);
            }
            userStates[chatId] = STATES.IDLE;
        }
        else if (state === STATES.AWAITING_MARKET_CROP) {
            const BASE_PRICES = {
                'गेहूं': 2125, 'चावल': 2200, 'धान': 2200, 'कपास': 6000,
                'मक्का': 2000, 'गन्ना': 300, 'आलू': 1200, 'टमाटर': 1500,
                'wheat': 2125, 'rice': 2200, 'cotton': 6000, 'corn': 2000
            };
            const cropMatch = Object.keys(BASE_PRICES).find(k => input.toLowerCase().includes(k)) || 'अन्य';
            const price = BASE_PRICES[cropMatch] || 2500;
            const fluctuation = Math.floor(Math.random() * 200) - 100;
            const finalPrice = price + fluctuation;
            const trend = fluctuation > 0 ? s.up : s.down;
            
            const msgText = `**${s.mandi}: ${input}**\n\n${s.est_price}: ₹${finalPrice} / Quintal\n${s.trend}: ${trend}\n(${s.live_data})`;
            await sendVoiceAndText(chatId, msgText, lang, authM);
            
            // Save crop for next time
            await pool.query('UPDATE users SET crop_type = $1 WHERE telegram_chat_id = $2', [input, chatId]);
            
            userStates[chatId] = STATES.IDLE;
        } 
        else if (state === STATES.AWAITING_ROADMAP_CROP) {
            bot.sendMessage(chatId, s.roadmap_prep);
            const user = await getUserProfile(chatId);
            const landSize = user ? (user.land_size || 1) : 1;
            const landUnit = user ? (user.land_unit || 'acres') : 'acres';
            
            const roadmap = await generateRoadmap(input, landSize, landUnit, lang); 
            let msgText = `**${s.crop_plan}: ${input}**\n\n`;
            if (roadmap.timeline) {
                roadmap.timeline.slice(0, 3).forEach(t => {
                    const cleanAction = t.action.replace(/[*_`]/g, '');
                    msgText += `• ${t.phase} (${t.time}): ${cleanAction}\n\n`;
                });
            } else {
                msgText += s.error_plan;
            }
            
            await bot.sendMessage(chatId, msgText, {parse_mode: 'Markdown', ...authM});
            try {
                bot.sendChatAction(chatId, 'record_voice');
                const audioPath = await textToSpeech(s.plan_ready, lang);
                await bot.sendVoice(chatId, audioPath);
                fs.unlinkSync(audioPath);
            } catch(e) {}
            
            // Save crop for next time
            await pool.query('UPDATE users SET crop_type = $1 WHERE telegram_chat_id = $2', [input, chatId]);
            
            userStates[chatId] = STATES.IDLE;
        }
        else if (state === STATES.AWAITING_ROTATION_CROP) {
            bot.sendMessage(chatId, s.rotation_prep);
            const rotation = await generateCropRotationPlan(input, lang);
            let msgText = `**${s.rotation_sug}**\n\n`;
            if (rotation.rotation_plan) {
                rotation.rotation_plan.forEach(r => {
                    msgText += `*${r.season}*: ${r.crop_name}\n${s.reason}: ${r.reason}\n\n`;
                });
            } else {
                msgText += s.tech_err;
            }
            await sendVoiceAndText(chatId, msgText, lang, authM);
            
            // Save crop for next time
            await pool.query('UPDATE users SET crop_type = $1 WHERE telegram_chat_id = $2', [input, chatId]);
            
            userStates[chatId] = STATES.IDLE;
        }
        else if (state === STATES.AWAITING_LOAN_DETAILS) {
            bot.sendMessage(chatId, s.loan_prep);
            const profile = { land_size: 1, land_unit: 'acres', crop_type: input, state: 'India', loan_type: 'General', amount: 'Unknown' };
            const analysis = await analyzeLoanEligibility(profile, lang);
            
            let msgText = `**${s.loan_analysis}**\n\n${(analysis.assessment || "").replace(/<[^>]*>?/gm, '')}\n\n**${s.schemes}**:\n`;
            if (analysis.schemes) {
                analysis.schemes.forEach(s => {
                    msgText += `- ${s.name}: ${s.description}\n`;
                });
            }
            await sendVoiceAndText(chatId, msgText, lang, authM);
            userStates[chatId] = STATES.IDLE;
        }
        else if (state === STATES.AWAITING_CHAT || state === STATES.IDLE) {
            const responseText = await getGroqResponse(input, null, lang);
            await sendVoiceAndText(chatId, responseText, lang, authM);
            if (state !== STATES.AWAITING_CHAT) userStates[chatId] = STATES.IDLE;
        }
    } catch (e) {
        console.error("State Processing Error:", e);
        sendVoiceAndText(chatId, s.tech_err, lang, authM);
        userStates[chatId] = STATES.IDLE;
    }
}

bot.on("polling_error", console.log);
