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

getClimateAverages(26.7606, 82.7243)
  .then(d => console.log(d))
  .catch(err => console.error(err));