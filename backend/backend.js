import express from 'express'
import cors from 'cors'
import { fromArrayBuffer } from 'geotiff';
import fs from 'fs';
import csv from 'csv-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_krishi_key';

// Use the PostgreSQL pool imported from pdb.js
import { pool as db, initializeDB } from './database/pdb.js';

// import { getGeminiResponse, generateRoadmap, analyzePestImage, getPestPrediction } from './ai_service.js';
import { getGroqResponse, generateRoadmap, analyzePestImage, getPestPrediction } from './groq_ai_service.js';

const app = express()
const port = 3000

// Increased limit for large base64 image uploads
app.use(express.json({ limit: '10mb' }))
app.use(cors())
// Static serving handled by Vite in development

async function loadNutrientData() {
  return new Promise((resolve) => {
    const data = {};
    fs.createReadStream(path.join(__dirname, 'Nutrient.csv'))
      .pipe(csv())
      .on('data', (row) => {
        const state = row.State.trim().toUpperCase();
        data[state] = {
          N: estimateNutrient(+row.n_High, +row.n_Medium, +row.n_Low,
            { high: 700, medium: 420, low: 140 }),
          P: estimateNutrient(+row.p_High, +row.p_Medium, +row.p_Low,
            { high: 35, medium: 17, low: 5 }),
          K: estimateNutrient(+row.k_High, +row.k_Medium, +row.k_Low,
            { high: 350, medium: 194, low: 54 })
        };
      })
      .on('end', () => resolve(data));
  });
}

function estimateNutrient(highPct, mediumPct, lowPct, ranges) {
  const total = highPct + mediumPct + lowPct;
  if (total === 0) return ranges.medium; // fallback
  return Math.round(
    ((highPct / total) * ranges.high +
      (mediumPct / total) * ranges.medium +
      (lowPct / total) * ranges.low)
  );
}

// Reverse geocode lat/lon → state using Open-Meteo geocoding or nominatim
async function getStateFromCoords(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'KrishiMitra/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return data.address?.state?.toUpperCase() ?? null;
  } catch {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await res.json();
    return data.principalSubdivision?.toUpperCase() ?? null;
  }
}
// Main function
const nutrientData = await loadNutrientData();

// Temporary test — bypass geocoding entirely
async function getNPK(lat, lon) {
  const state = await getStateFromCoords(lat, lon);
  if (!state || !nutrientData[state]) {
    return { N: 280, P: 15, K: 150, source: "national_average" };
  }
  return { ...nutrientData[state], source: `state_estimate:${state}` };
}

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

function getRandomLocationInIndia() {
  const lat = Math.random() * (37.5 - 6.5) + 6.5;
  const lon = Math.random() * (97.5 - 68) + 68;

  return {
    latitude: lat,
    longitude: lon
  };
}


app.post('/post', async (req, res) => {
  const data = req.body;
  const lat = parseFloat(data.Latitude);
  const lon = parseFloat(data.Longitude);

  const randomres = getRandomLocationInIndia();

  console.log(`\nLatitude: ${randomres.latitude}, Longitude: ${randomres.longitude}`);
  getStateFromCoords(randomres.latitude, randomres.longitude)
    .then(state => console.log(state));

  try {
    // Fetch all required data in parallel
    const [npk, climate, ph] = await Promise.all([
      getNPK(randomres.latitude, randomres.longitude),
      getClimateAverages(randomres.latitude, randomres.longitude),
      getSoilPhWCS(randomres.latitude, randomres.longitude).catch(err => {
        console.warn("Soil pH fetch failed, falling back to 7.0:", err.message);
        return 7.0; // fallback pH
      })
    ]);

    const result = {
      N: npk.N,
      P: npk.P,
      K: npk.K,
      temperature: climate.temperature,
      humidity: climate.humidity,
      rainfall: climate.rainfall,
      ph: ph,
      location_source: npk.source
    };

    console.log("Aggregated Data:", result);

    // Call Python script for crop prediction
    // Feature order matches training: N, P, K, temperature, humidity, ph, rainfall
    const pythonPath = path.join(__dirname, '..', 'venv', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'predict.py');
    const args = `${result.N} ${result.P} ${result.K} ${result.temperature} ${result.humidity} ${result.ph} ${result.rainfall}`;

    try {
      // takes stdout from print of predict.py as output
      const { stdout, stderr } = await execPromise(`"${pythonPath}" "${scriptPath}" ${args}`);

      if (stderr) {
        console.error("Python Error:", stderr);
      }

      // Parse JSON from Python
      let resultData;
      try {
        resultData = JSON.parse(stdout.trim());
        console.log("Model Recommendation (JSON):", resultData);
      } catch (e) {
        console.error("Failed to parse Python output as JSON:", stdout);
        resultData = { recommendation: stdout.trim() };
      }

      res.json({
        ...result,
        ...resultData
      });
    } catch (predictError) {
      console.error("Prediction failed:", predictError);
      res.json({
        ...result,
        recommendation: "Error in prediction model",
        error: predictError.message
      });
    }

  } catch (error) {
    console.error("Error in /post processing:", error);
    res.status(500).json({ error: "Failed to gather all parameters." });
  }
})


// Mock Market Trends API
app.post('/api/market-trends', (req, res) => {
  // const result = req.query.result; - if result passed as query paramenter

  const result = req.body;
  console.log("Analysing market trends...");

  // Return some synthetic/mock market data
  res.json({
    crop: result.top_recommendation,
    currentPricePerQuintal: Math.floor(Math.random() * 2000) + 1500,
    demand: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
    trend: ['Upward', 'Stable', 'Downward'][Math.floor(Math.random() * 3)],
    source: "KrishiMitra Simulated Market API"
  });
  console.log("market trends sent to frontend...");
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
    const analysisData = await analyzePestImage(imageBase64, lang || 'en');
    res.json(analysisData);
  } catch (error) {
    console.error("Error in /api/analyze-disease:", error);
    res.status(500).json({ error: "Failed to analyze the image." });
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
    const server = app.listen(port, () => {
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

