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

async function runAuthTests() {
  console.log("Starting Auth tests...\n");

  const phone = "9998887776";
  const password = "securePassword123";

  // Test 1: Register
  console.log(`1. Testing /api/register with phone ${phone}...`);
  const registerData = JSON.stringify({
      fullName: "Test Farmer",
      phone: phone,
      state: "MAHARASHTRA",
      district: "PUNE",
      village: "Test Village",
      landSize: 2.5,
      landUnit: "Acres",
      cropType: "Wheat",
      password: password
  });

  const regRes = await makeRequest('/api/register', 'POST', registerData);
  console.log(`Status: ${regRes.status}`);
  console.log(`Body: ${regRes.body}`);

  // Test 2: Duplicate Register (should fail 409)
  console.log(`\n2. Testing Duplicate /api/register...`);
  const dupRes = await makeRequest('/api/register', 'POST', registerData);
  console.log(`Status: ${dupRes.status} (Expected 409)`);

  // Test 3: Login
  console.log(`\n3. Testing /api/login with valid credentials...`);
  const loginData = JSON.stringify({ phone, password });
  const loginRes = await makeRequest('/api/login', 'POST', loginData);
  console.log(`Status: ${loginRes.status} (Expected 200)`);
  console.log(`Body Token Present: ${loginRes.body.includes('token')}`);
  
  // Test 4: Bad Login
  console.log(`\n4. Testing /api/login with bad password...`);
  const badLoginData = JSON.stringify({ phone, password: "wrongpassword" });
  const badLoginRes = await makeRequest('/api/login', 'POST', badLoginData);
  console.log(`Status: ${badLoginRes.status} (Expected 401)`);

  console.log("\nAuth Tests Complete.");
}

runAuthTests();
