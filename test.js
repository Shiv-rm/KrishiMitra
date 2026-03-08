async function getHistoricalRainfall(lat, lon, days = 30) {
  // Calculate date range
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const fmt = d => d.toISOString().split("T")[0]; // YYYY-MM-DD

  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,rain_sum` +
    `&start_date=${fmt(start)}&end_date=${fmt(end)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  const data = await res.json();

  const daily = data.daily.time.map((date, i) => ({
    date,
    rainfall_mm: data.daily.rain_sum[i]
  }));

  // Cumulative sum — useful for crop stress models
  const totalRainfall = daily.reduce((sum, d) => sum + (d.rainfall_mm || 0), 0);
  const avgDaily = Math.round((totalRainfall / days) * 100) / 100;

  return {
    daily,
    totalRainfall_mm: Math.round(totalRainfall * 100) / 100,
    avgDailyRainfall_mm: avgDaily,
    period_days: days
  };
}