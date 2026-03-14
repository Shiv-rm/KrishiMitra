const http = require('http');

function makeRequest(path, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting backend tests...");

  // Test 1: Market trends
  console.log("\n1. Testing /api/market-trends?crop=tomato...");
  const marketRes = await makeRequest('/api/market-trends?crop=tomato');
  console.log(`Status: ${marketRes.status}`);
  console.log(`Body: ${marketRes.body}`);

  // Test 2: Post endpoint for prediction
  console.log("\n2. Testing /post endpoint...");
  const postData = JSON.stringify({ Latitude: 18.5204, Longitude: 73.8567 }); // Pune
  const postRes = await makeRequest('/post', 'POST', postData);
  console.log(`Status: ${postRes.status}`);
  console.log(`Body: ${postRes.body}`);

  console.log("\nTests Complete.");
}

runTests();
