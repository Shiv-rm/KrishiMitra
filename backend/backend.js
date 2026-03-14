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

// Note: db.js is CommonJS, so we import it using standard import (Node 14+)
import db from './db.js';

import { getGeminiResponse, generateRoadmap, analyzePestImage } from './ai_service.js';

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

  // ✅ use named import directly, no dynamic import
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

  const monthKeys = ["JAN","FEB","MAR","APR","MAY","JUN",
                     "JUL","AUG","SEP","OCT","NOV","DEC"];
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];

  const monthKey = monthKeys[month];
  const days     = daysInMonth[month];

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
  const params = data.properties.parameter; // ✅ correct path

  return {
    temperature: Math.round(params.T2M[monthKey] * 100) / 100,
    humidity:    Math.round(params.RH2M[monthKey] * 100) / 100,
    // ✅ multiply mm/day by days in month to get mm/month
    rainfall:    Math.round(params.PRECTOTCORR[monthKey] * days * 100) / 100
  };
}




app.post('/post', async (req, res) => {
  const data = req.body;
  const lat = parseFloat(data.Latitude);
  const lon = parseFloat(data.Longitude);

  console.log(`Latitude: ${lat}, Longitude: ${lon}`);

  try {
    // Fetch all required data in parallel
    const [npk, climate, ph] = await Promise.all([
      getNPK(lat, lon),
      getClimateAverages(lat, lon),
      getSoilPhWCS(lat, lon).catch(err => {
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
    const pythonPath = path.join(__dirname, '..', '.venv', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'predict.py');
    const args = `${result.N} ${result.P} ${result.K} ${result.temperature} ${result.humidity} ${result.ph} ${result.rainfall}`;

    try {
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
app.get('/api/market-trends', (req, res) => {
  const { crop } = req.query;
  const targetCrop = crop || 'wheat';
  
  // Return some synthetic/mock market data
  res.json({
    crop: targetCrop,
    currentPricePerQuintal: Math.floor(Math.random() * 2000) + 1500,
    demand: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
    trend: ['Upward', 'Stable', 'Downward'][Math.floor(Math.random() * 3)],
    source: "KrishiMitra Simulated Market API"
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const aiResponse = await getGeminiResponse(message, image);
    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ reply: "Sorry, I am facing technical difficulties." });
  }
});

// Roadmap Generator API
app.get('/api/roadmap', async (req, res) => {
  try {
    const { crop, landSize, landUnit } = req.query;
    if (!crop || !landSize) {
      return res.status(400).json({ error: "Crop and landSize are required" });
    }
    
    const roadmapData = await generateRoadmap(crop, parseFloat(landSize), landUnit || 'acres');
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
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [fullName, phone, state, district, village, landSize, landUnit, cropType, passwordHash];
        
        db.run(sql, params, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: "Phone number already registered." });
                }
                return res.status(500).json({ error: "Database error during registration." });
            }
            // Clean up OTP after successful registration
            delete otps[phone];

            const token = jwt.sign({ id: this.lastID, phone }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ 
                message: "User registered successfully", 
                token, 
                user: { id: this.lastID, name: fullName, phone } 
            });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error during registration." });
    }
});

app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: "Phone and password required." });
    }

    const sql = `SELECT * FROM users WHERE phone = ?`;
    db.get(sql, [phone], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error." });
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
    });
});

app.post('/api/analyze-disease', async (req, res) => {
    // Note: Request body size limit in Express defaults to 100kb, 
    // but json() might have been configured. We'll handle errors gracefully.
    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ error: "No imageBase64 data provided." });
    }

    try {
        const analysisData = await analyzePestImage(imageBase64);
        res.json(analysisData);
    } catch (error) {
        console.error("Error in /api/analyze-disease:", error);
        res.status(500).json({ error: "Failed to analyze the image." });
    }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

