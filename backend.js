import express from "express"
import cors from "cors"
import { fromArrayBuffer } from "geotiff"
import fs from "fs"
import csv from "csv-parser"
import { spawn } from "child_process"

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())
app.use(express.static('static'))

async function loadNutrientData() {
  return new Promise((resolve) => {
    const data = {};
    fs.createReadStream('./Nutrient.csv')
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

// Reverse geocode lat/lon -> state using Open-Meteo geocoding or nominatim
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

// Temporary test - bypass geocoding entirely
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
async function getph(latitude, longitude) {
  getSoilPhWCS(latitude, longitude, "0-5cm")
    .then(ph => console.log(`Soil pH: ${ph}`))
    .catch(err => console.error("Error:", err));
}


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


async function predictCrop(data) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('./venv/bin/python3', ['predict.py']);
    let result = "";
    let error = "";

    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error("Python Error Details:", error);
        reject(error.trim() || `Python process exited with code ${code}`);
      } else {
        // If code is 0, we take stdout as the result
        resolve(result.trim());
      }
    });
  });
}

app.post('/post', async (req, res) => {
  const { Latitude, Longitude } = req.body;
  console.log(`Latitude: ${Latitude}, Longitude: ${Longitude}`);

  try {
    // 1. Get NPK values
    const npk = await getNPK(Latitude, Longitude);
    console.log("NPK Data:", npk);

    // 2. Get pH value
    const ph = await getSoilPhWCS(Latitude, Longitude);
    console.log(`Soil pH: ${ph}`);

    // 3. Get Climate Data (Temperature, Humidity, Rainfall)
    const climate = await getClimateAverages(Latitude, Longitude);
    console.log("Climate Data:", climate);

    // 4. Predict Crop
    const predictionData = {
      N: npk.N,
      P: npk.P,
      K: npk.K,
      temperature: climate.temperature,
      humidity: climate.humidity,
      ph: ph,
      rainfall: climate.rainfall
    };

    const recommendedCrop = await predictCrop(predictionData);
    console.log("Recommended Crop:", recommendedCrop);

    // Return all data to the frontend
    res.json({
      Processed: "Success",
      npk: npk,
      ph: ph,
      climate: climate,
      recommendation: recommendedCrop
    });

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to gather data" });
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
