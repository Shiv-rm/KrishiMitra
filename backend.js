import express from 'express'
import cors from 'cors'
import { fromArrayBuffer } from 'geotiff';


const app = express()
const port = 3000

app.use(express.json())
app.use(cors())
app.use(express.static('static'))


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
async function getph(latitude, longitude) {
  getSoilPhWCS(latitude, longitude, "0-5cm")
  .then(ph => console.log(`Soil pH: ${ph}`))
  .catch(err => console.error("Error:", err));
}


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


app.post('/post', (req, res) => {
  const data = req.body;
  console.log("Latitude : " + data.Latitude + " Longitude : " + data.Longitude);
  const dgetph=debounce(getph,300);
  dgetph(data.Latitude,data.Longitude)
  res.json({
    Processed: "The data has successfully been received !"
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
