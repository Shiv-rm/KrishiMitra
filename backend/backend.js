import express from 'express'
import cors from 'cors'
import { fromArrayBuffer } from 'geotiff';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import districtRaw from './districtnutrient.json' with { type: 'json' };

// Build district lookup map at startup
const districtNPK = {};

for (const entry of districtRaw.data) {
  const stateName = entry.state?.name?.toUpperCase();
  const districtName = entry.district?.name?.toUpperCase();

  if (!stateName || !districtName) continue;

  const key = `${stateName}|${districtName}`;

  if (!districtNPK[key]) {
    districtNPK[key] = {
      nHigh: 0, nMedium: 0, nLow: 0,
      pHigh: 0, pMedium: 0, pLow: 0,
      kHigh: 0, kMedium: 0, kLow: 0,
      state: stateName,
      district: districtName
    };
  }

  const r = entry.results;
  districtNPK[key].nHigh += r.n.High;
  districtNPK[key].nMedium += r.n.Medium;
  districtNPK[key].nLow += r.n.Low;
  districtNPK[key].pHigh += r.p.High;
  districtNPK[key].pMedium += r.p.Medium;
  districtNPK[key].pLow += r.p.Low;
  districtNPK[key].kHigh += r.k.High;
  districtNPK[key].kMedium += r.k.Medium;
  districtNPK[key].kLow += r.k.Low;
}

console.log(`Loaded ${Object.keys(districtNPK).length} district NPK entries`);

function estimateNutrient(high, medium, low, ranges) {
  const total = high + medium + low;
  if (total === 0) return ranges.medium;
  return Math.round(
    ((high / total) * ranges.high) +
    ((medium / total) * ranges.medium) +
    ((low / total) * ranges.low)
  );
}

function fuzzyMatch(target, candidates) {
  const clean = s => s.toUpperCase().replace(/[^A-Z]/g, '');
  const t = clean(target);
  return candidates.find(c => {
    const k = clean(c);
    return k === t || k.includes(t) || t.includes(k);
  });
}

async function getLocationFromCoords(lat, lon) {
  // Try Nominatim first
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'KrishiMitra/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    console.log(data);
    return {
      state: data.address?.state,
      district: data.address?.county || data.address?.state_district
    };
  } catch {
    // Fallback to BigDataCloud
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const data = await res.json();
      return {
        state: data.principalSubdivision,
        district: data.locality
      };
    } catch {
      return { state: null, district: null };
    }
  }
}

async function getNPK(lat, lon) {
  const { state: stateName, district: districtName } = await getLocationFromCoords(lat, lon);

  console.log(`Geocoded → state: "${stateName}", district: "${districtName}"`);

  if (!stateName) {
    return { N: 280, P: 15, K: 150, source: 'national_average' };
  }

  const clean = s => s.toUpperCase().replace(/[^A-Z]/g, '');

  // Find all keys for this state
  const stateKeys = Object.keys(districtNPK).filter(k =>
    clean(k.split('|')[0]).includes(clean(stateName)) ||
    clean(stateName).includes(clean(k.split('|')[0]))
  );

  if (stateKeys.length === 0) {
    console.warn(`State not found in district data: ${stateName}`);
    return { N: 280, P: 15, K: 150, source: 'national_average' };
  }

  // Try district match first
  if (districtName) {
    const districtNames = stateKeys.map(k => k.split('|')[1]);
    const matchedDistrict = fuzzyMatch(districtName, districtNames);

    if (matchedDistrict) {
      // Find the actual key (state name might differ slightly)
      const key = stateKeys.find(k => k.split('|')[1] === matchedDistrict);
      const d = districtNPK[key];
      return {
        N: estimateNutrient(d.nHigh, d.nMedium, d.nLow, { high: 700, medium: 420, low: 140 }),
        P: estimateNutrient(d.pHigh, d.pMedium, d.pLow, { high: 35, medium: 17, low: 5 }),
        K: estimateNutrient(d.kHigh, d.kMedium, d.kLow, { high: 350, medium: 194, low: 54 }),
        source: `district:${matchedDistrict},${stateName}`
      };
    }
    console.warn(`District not found: "${districtName}" in ${stateName}, falling back to state average`);
  }

  // Fallback — aggregate all districts in the state
  const stateTotal = {
    nHigh: 0, nMedium: 0, nLow: 0,
    pHigh: 0, pMedium: 0, pLow: 0,
    kHigh: 0, kMedium: 0, kLow: 0
  };
  for (const k of stateKeys) {
    const d = districtNPK[k];
    stateTotal.nHigh += d.nHigh; stateTotal.nMedium += d.nMedium; stateTotal.nLow += d.nLow;
    stateTotal.pHigh += d.pHigh; stateTotal.pMedium += d.pMedium; stateTotal.pLow += d.pLow;
    stateTotal.kHigh += d.kHigh; stateTotal.kMedium += d.kMedium; stateTotal.kLow += d.kLow;
  }
  return {
    N: estimateNutrient(stateTotal.nHigh, stateTotal.nMedium, stateTotal.nLow, { high: 700, medium: 420, low: 140 }),
    P: estimateNutrient(stateTotal.pHigh, stateTotal.pMedium, stateTotal.pLow, { high: 35, medium: 17, low: 5 }),
    K: estimateNutrient(stateTotal.kHigh, stateTotal.kMedium, stateTotal.kLow, { high: 350, medium: 194, low: 54 }),
    source: `state_fallback:${stateName}`
  };
}


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_krishi_key';

// Use the PostgreSQL pool imported from pdb.js
import { pool as db, initializeDB } from './database/pdb.js';

// import { getGeminiResponse, generateRoadmap, analyzePestImage, getPestPrediction } from './ai_service.js';
import { getGroqResponse, generateRoadmap, analyzePestImage, getPestPrediction, generateCropRotationPlan, analyzeLoanEligibility, analyzeSoil } from './groq_ai_service.js';

const app = express()
const port = process.env.PORT || 3000

// Increased limit for large base64 image uploads
app.use(express.json({ limit: '10mb' }))
// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Local Vite dev
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // For now, allow all during transition or if not specified, 
      // but in production FRONTEND_URL should be set.
      return callback(null, true); 
    }
    return callback(null, true);
  },
  credentials: true
}))

// Request logger - displays all requests in server console
// app.use((req, res, next) => {
//   console.log(`Backend Request: ${req.method} ${req.url}`);
//   next();
// });

app.get('/', (req, res) => res.send('KrishiMitra Backend is running.'));





app.use(cors())
// Static serving handled by Vite in development



function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
async function getSoilPhWCS(lat, lon, depth = "0-5cm") {
  if (!depth.endsWith("cm")) depth += "cm";

  const layerId = `phh2o_${depth}_mean`;
  const delta = 0.02; // increased from 0.005 for more pixels
  const minX = lon - delta, minY = lat - delta;
  const maxX = lon + delta, maxY = lat + delta;

  const wcsUrl =
    `https://maps.isric.org/mapserv?map=/map/phh2o.map` +
    `&SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage` +
    `&COVERAGE=${layerId}&CRS=EPSG:4326` +
    `&BBOX=${minX},${minY},${maxX},${maxY}` +
    `&RESX=0.002&RESY=0.002&FORMAT=GEOTIFF_INT16`;

  const response = await fetch(wcsUrl);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const preview = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 300));
  if (preview.trimStart().startsWith("<"))
    throw new Error(`WCS error: ${preview}`);

  // use named import directly, no dynamic import
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();

  const raw = Array.from(rasters[0]);

  const valid = raw.filter(v => v !== -32768 && v !== 65535);
  if (!valid.length) throw new Error("No valid pixels returned. Check coordinates.");

  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return Math.round((median / 10) * 100) / 100;
}
// Soil pH fetch handled directly in /post route



async function getClimateAverages(lat, lon) {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed

  const monthKeys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const monthKey = monthKeys[month];
  const days = daysInMonth[month];

  const url =
    `https://power.larc.nasa.gov/api/temporal/climatology/point?` +
    `parameters=T2M,RH2M,PRECTOTCORR` +
    `&community=AG` +
    `&longitude=${lon}` +
    `&latitude=${lat}` +
    `&format=JSON`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA POWER error: ${res.status}`);

  const data = await res.json();
  const params = data.properties.parameter; // correct path

  return {
    temperature: Math.round(params.T2M[monthKey] * 100) / 100,
    humidity: Math.round(params.RH2M[monthKey] * 100) / 100,
    // multiply mm/day by days in month to get mm/month
    rainfall: Math.round(params.PRECTOTCORR[monthKey] * days * 100) / 100
  };
}

const activeJobs = new Map();

// ── Job Queue Pattern for /post ───────────────────────────────────────────────
app.post('/post', async (req, res) => {
  const { Latitude, Longitude } = req.body;

  if (!Latitude || !Longitude) {
    return res.status(400).json({ error: "Missing Latitude or Longitude" });
  }

  // Generate a random jobId (we can use simple crypto or Date.now)
  const jobId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  activeJobs.set(jobId, { status: 'processing' });

  // Return jobId immediately
  res.json({ jobId });

  // Process async
  (async () => {
    try {
      const lat = parseFloat(Latitude);
      const lon = parseFloat(Longitude);

      const [npk, climate, ph] = await Promise.all([
        getNPK(lat, lon).catch(err => {
          console.warn("NPK fetch failed, falling back to mock:", err.message);
          return { N: 280, P: 15, K: 150, source: "national_average" };
        }),
        getClimateAverages(lat, lon).catch(err => {
          console.warn("Climate fetch failed, falling back to mock:", err.message);
          return { temperature: 25, humidity: 60, rainfall: 100 };
        }),
        getSoilPhWCS(lat, lon).catch(err => {
          console.warn("Soil pH fetch failed, falling back to 7.0:", err.message);
          return 7.0; // fallback pH
        })
      ]);

      const result = {
        N: npk.N, P: npk.P, K: npk.K,
        temperature: climate.temperature, humidity: climate.humidity, rainfall: climate.rainfall,
        ph: ph, location_source: npk.source
      };

      console.log(`Job ${jobId} Aggregated Data:`, result);
      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(__dirname, 'predict.py');
      const args = `${result.N} ${result.P} ${result.K} ${result.temperature} ${result.humidity} ${result.ph} ${result.rainfall}`;

      const { stdout, stderr } = await execPromise(`"${pythonPath}" "${scriptPath}" ${args}`);

      if (stderr) console.error("Python Error:", stderr);

      let resultData;
      try {
        resultData = JSON.parse(stdout.trim());
      } catch (e) {
        resultData = { recommendation: stdout.trim() };
      }

      const fertRec = npk.N < 200 ? "Apply Nitrogen-rich fertilizers (e.g., Urea)." :
        npk.P < 10 ? "Apply Phosphorus-rich fertilizers (e.g., DAP)." :
          npk.K < 100 ? "Apply Potassium-rich fertilizers (e.g., MOP)." :
            "Soil nutrients are sufficiently balanced. Maintain current practices.";

      const finalOutput = { ...result, ...resultData, fertilizer_recommendation: fertRec };
      activeJobs.set(jobId, { status: 'completed', result: finalOutput });

    } catch (error) {
      console.error(`Job ${jobId} Failed:`, error);
      activeJobs.set(jobId, { status: 'failed', error: error.message || 'Unknown error' });
    }
  })();
});

app.get('/api/job/:jobId', (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json(job);
  // Optionally clean up the job if it's completed or failed to save memory
  if (job.status === 'completed' || job.status === 'failed') {
    // Keep it in memory so UI can poll multiple times safely, or setTimeout to delete
    setTimeout(() => activeJobs.delete(req.params.jobId), 60000);
  }
});


// Realistic Market Trends Implementation
const BASE_PRICES = {
  'rice': 2200, 'wheat': 2125, 'mango': 3500, 'banana': 1800, 'cotton': 6000,
  'apple': 7000, 'maize': 2000, 'grapes': 4000, 'papaya': 2500, 'coconut': 3000
};

app.post('/api/market-trends', (req, res) => {
  const result = req.body;
  console.log("Analysing market trends...");
  const crop = (result.top_recommendation || result.crop || '').toLowerCase();

  const basePrice = BASE_PRICES[crop] || 2500;
  // Fluctuate between -5% and +5% of base price based on a daily seed
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
  }
  const varianceOptions = [-0.05, -0.02, 0, 0.02, 0.05];
  const variance = varianceOptions[Math.abs(hash) % varianceOptions.length];

  const currentPricePerQuintal = Math.floor(basePrice * (1 + variance));
  const trend = variance > 0 ? "Upward" : variance < 0 ? "Downward" : "Stable";
  const demand = variance > 0 ? "High" : variance < 0 ? "Low" : "Medium";

  res.json({
    crop: result.top_recommendation || result.crop,
    currentPricePerQuintal,
    demand,
    trend,
    source: "Aggregated Live Mandi Data (Simulated)"
  });
  console.log("market trends sent to frontend...");
});

// Weather API Endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon, crop, lang } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and Longitude required" });
    }

    // Fetch real-time forecast from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const response = await fetch(url);
    const weatherData = await response.json();

    // Use Groq to generate a crop-specific alert based on the weather
    const systemInstruction = lang === 'hi'
      ? 'आप मौसम और कृषि के विशेषज्ञ हैं। वर्तमान मौसम के आधार पर फसल के लिए केवल एक वाक्य का अलर्ट दें (हिंदी में)।'
      : 'You are a weather and agriculture expert. Give a single-sentence crop alert based on the current weather (in English).';

    let cropAlert = "Weather conditions are stable.";
    if (crop) {
      const condition = `Temp: ${weatherData.current_weather.temperature}°C, Daily Rain: ${weatherData.daily?.precipitation_sum[0] || 0}mm.`;
      const aiResponse = await getGroqResponse(`The current weather is: ${condition}. Please give a concise 1-sentence advisory for farming "${crop}".`, null, lang);
      cropAlert = aiResponse;
    }

    res.json({
      current: weatherData.current_weather,
      daily: weatherData.daily,
      alert: cropAlert
    });

  } catch (error) {
    console.error("Weather API Error:", error);
    res.status(500).json({ error: "Failed to fetch weather data." });
  }
});

// Crop Rotation Planner API
app.get('/api/crop-rotation', async (req, res) => {
  try {
    const { crop, lang, history } = req.query;
    if (!crop) return res.status(400).json({ error: "Crop is required" });
    const rotationPlan = await generateCropRotationPlan(crop, lang || 'en', history || null);
    res.json(rotationPlan);
  } catch (error) {
    console.error("Crop Rotation API error:", error);
    res.status(500).json({ error: "Failed to generate crop rotation plan." });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, lang } = req.body;
    // const aiResponse = await getGeminiResponse(message, image, lang || 'en');
    const aiResponse = await getGroqResponse(message, image, lang || 'en');
    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ reply: "Sorry, I am facing technical difficulties." });
  }
});

// Roadmap Generator API
app.get('/api/roadmap', async (req, res) => {
  try {
    const { crop, landSize, landUnit, lang } = req.query;
    if (!crop || !landSize) {
      return res.status(400).json({ error: "Crop and landSize are required" });
    }

    const roadmapData = await generateRoadmap(crop, parseFloat(landSize), landUnit || 'acres', lang || 'en');
    res.json(roadmapData);
  } catch (error) {
    console.error("Roadmap API error:", error);
    res.status(500).json({ error: "Failed to generate agricultural roadmap." });
  }
});

// ---------------------------------------------------------
// AUTHENTICATION & OTP ROUTES
// ---------------------------------------------------------

// In-memory OTP store (For Production: use Redis or DB with expiry)
const otps = {};

app.post('/api/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Valid 10-digit phone number is required." });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[phone] = otp;

  console.log(`[DEV OTP] For phone ${phone}: ${otp}`);

  // In production, integrate SMS API here (Twilio, AWS SNS, Msg91, etc.)
  res.json({ message: "OTP sent successfully.", otp: otp /* Sent back for testing ease */ });
});

app.post('/api/register', async (req, res) => {
  const {
    fullName,
    phone,
    password,
    otp,
    landSize = 0,
    landUnit = "acres"
  } = req.body;

  if (!fullName || !phone || !password || !otp) {
    return res.status(400).json({ error: "Missing required fields (name, phone, password, otp)." });
  }

  if (otps[phone] !== otp) {
    return res.status(401).json({ error: "Invalid or expired OTP." });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Fallbacks for the simplified form
    const state = "";
    const district = "";
    const village = "";
    const cropType = "";

    const sql = `INSERT INTO users (full_name, phone, state, district, village, land_size, land_unit, crop_type, password_hash) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
    const params = [fullName, phone, state, district, village, landSize, landUnit, cropType, passwordHash];

    try {
      const result = await db.query(sql, params);

      // Clean up OTP after successful registration
      delete otps[phone];

      const userId = result.rows[0].id;
      const token = jwt.sign({ id: userId, phone }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        message: "User registered successfully",
        token,
        user: { id: userId, name: fullName, phone }
      });
    } catch (err) {
      // PostgreSQL unique constraint error code is 23505
      if (err.code === '23505') {
        return res.status(409).json({ error: "Phone number already registered." });
      }
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Database error during registration." });
    }
  } catch (e) {
    res.status(500).json({ error: "Server error during registration." });
  }
});

app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password required." });
  }

  const sql = `SELECT * FROM users WHERE phone = $1`;
  try {
    const result = await db.query(sql, [phone]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: "Invalid phone number or password." });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid phone number or password." });

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name,
        phone: user.phone,
        state: user.state,
        cropType: user.crop_type
      }
    });
  } catch (err) {
    console.error("DB Login Error:", err);
    return res.status(500).json({ error: "Database error." });
  }
});

app.post('/api/analyze-disease', async (req, res) => {
  // Note: Request body size limit in Express defaults to 100kb, 
  // but json() might have been configured. We'll handle errors gracefully.
  const { imageBase64, lang } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "No imageBase64 data provided." });
  }

  try {
    const result = await analyzePestImage(imageBase64, lang);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/analyze-disease:', error);
    res.status(500).json({ error: 'Failed to analyze image.' });
  }
});

// ── Soil Image Classification Endpoint ───────────────────────────────────────
app.post('/api/analyze-soil', async (req, res) => {
  try {
    const { imageBase64, lang = 'en' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    // Use Groq Vision for Soil analysis
    // Requires analyzeSoil function to be imported from groq_ai_service
    const result = await analyzeSoil(imageBase64, lang);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/analyze-soil:', error);
    res.status(500).json({ error: 'Failed to analyze soil image.' });
  }
});

// Pest Prediction API
app.get('/api/pest-prediction', async (req, res) => {
  try {
    const { crop, lang } = req.query;
    if (!crop) return res.status(400).json({ error: 'crop is required' });
    const data = await getPestPrediction(crop, lang || 'en');
    res.json(data);
  } catch (error) {
    console.error('Pest Prediction API error:', error);
    res.status(500).json({ error: 'Failed to generate pest prediction.' });
  }
});

// Get authenticated user profile (for land size)
app.get('/api/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.query(
      'SELECT id, full_name, phone, land_size, land_unit FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth /api/me error:', err);
    res.status(401).json({ error: 'Invalid token.' });
  }
});

// Get Crop History
app.get('/api/crop-history', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const result = await db.query('SELECT crop_name, season_year, planted_at FROM crop_history WHERE user_id = $1 ORDER BY planted_at ASC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// Add Crop History
app.post('/api/crop-history', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const { crop_name, season_year } = req.body;
    if (!crop_name) return res.status(400).json({ error: 'crop_name required' });

    await db.query('INSERT INTO crop_history (user_id, crop_name, season_year) VALUES ($1, $2, $3)', [userId, crop_name, season_year]);
    res.json({ success: true });
  } catch (err) {
    console.error('Save history error:', err);
    res.status(500).json({ error: 'Failed to save history.' });
  }
});

// ── Ledger / ExpenseFlow API ──────────────────────────────────────────────────

// Get Ledger Entries
app.get('/api/ledger', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const result = await db.query('SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY date DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch ledger error:', err);
    res.status(500).json({ error: 'Failed to fetch ledger.' });
  }
});

// Add Ledger Entry
app.post('/api/ledger', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const { type, amount, category, description } = req.body;
    if (!type || !amount || !category) {
      return res.status(400).json({ error: 'Type, amount, and category are required.' });
    }

    const result = await db.query(
      'INSERT INTO ledger_entries (user_id, type, amount, category, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, type, amount, category, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Save ledger error:', err);
    res.status(500).json({ error: 'Failed to save ledger entry.' });
  }
});

// Delete Ledger Entry
app.delete('/api/ledger/:id', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    // Ensure the entry belongs to the user
    await db.query('DELETE FROM ledger_entries WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete ledger error:', err);
    res.status(500).json({ error: 'Failed to delete ledger entry.' });
  }
});

// ── Loan & Scheme Processing AI ───────────────────────────────────────────────

app.post('/api/loan-analysis', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    // Fetch basic user details from the DB
    const userResult = await db.query('SELECT full_name, state, crop_type, land_size, land_unit FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userResult.rows[0];
    const { loan_type, amount, lang } = req.body;

    const profile = {
      state: user.state,
      crop_type: user.crop_type,
      land_size: user.land_size,
      land_unit: user.land_unit,
      loan_type,
      amount
    };

    const analysis = await analyzeLoanEligibility(profile, lang || 'en');
    res.json(analysis);
  } catch (err) {
    console.error('Loan analysis error:', err);
    res.status(500).json({ error: 'Failed to perform loan analysis.' });
  }
});

// ── Helper: extract user id from Bearer token ─────────────────────────────────
function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    return decoded.id;
  } catch { return null; }
}

// Save (Upsert) Crop Analysis Result for logged-in user
app.post('/api/save-analysis', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const { analysis } = req.body;
    if (!analysis) return res.status(400).json({ error: 'analysis payload required.' });

    // Upsert: insert if not exists, update if already exists (one row per user)
    await db.query(`
      INSERT INTO crop_analysis_cache (user_id, analysis_data, analysed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET analysis_data = EXCLUDED.analysis_data, analysed_at = NOW()
    `, [userId, JSON.stringify(analysis)]);

    res.json({ success: true });
  } catch (err) {
    console.error('Save analysis error:', err);
    res.status(500).json({ error: 'Failed to save analysis.' });
  }
});

// Load cached Crop Analysis for logged-in user
app.get('/api/my-analysis', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const result = await db.query(
      'SELECT analysis_data, analysed_at FROM crop_analysis_cache WHERE user_id = $1',
      [userId]
    );
    if (!result.rows[0]) return res.json({ analysis: null });
    res.json({ analysis: result.rows[0].analysis_data, analysed_at: result.rows[0].analysed_at });
  } catch (err) {
    console.error('Load analysis error:', err);
    res.status(500).json({ error: 'Failed to load analysis.' });
  }
});

async function startServer() {
  try {
    // 1. Initialize Database
    await initializeDB();

    // 2. Load other data
    // nutrientData is already loaded at the top level, but let's make sure things are sequential

    // 3. Start Listening
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: { origin: "*" }
    });

    // Simple Socket.io Chat logic for Community Forum
    io.on('connection', (socket) => {
      // User can pass token in auth object
      const token = socket.handshake.auth.token;
      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (e) {
          console.error("Socket auth failed");
        }
      }

      socket.on('joinForum', (room) => {
        socket.join(room || 'general');
      });

      socket.on('forumMessage', async (data) => {
        // data: { room: 'general', msg: 'hello', author: 'FarmMaster' }
        io.to(data.room || 'general').emit('forumMessage', {
          msg: data.msg,
          author: data.author || 'Anonymous',
          timestamp: new Date().toISOString()
        });
      });
    });

    const server = httpServer.listen(port, () => {
      console.log(`KrishiMitra server is live at http://localhost:${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${port} is already in use.`);
        console.error(`Try running: kill -9 $(lsof -t -i:${port})`);
        process.exit(1);
      } else {
        console.error("Server Error:", err);
      }
    });

  } catch (err) {
    console.error("CRITICAL: Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

