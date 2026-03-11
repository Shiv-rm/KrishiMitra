import './style.css';

const statusDisplay = document.getElementById("status-message");
const resultsContainer = document.getElementById("results-container");
const locateBtn = document.getElementById("get-location-btn");

function updateStatus(msg) {
    statusDisplay.innerHTML = msg;
}

function getLocation() {
    if (navigator.geolocation) {
        updateStatus("Requesting location access...");
        locateBtn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        updateStatus("Geolocation is not supported by this browser.");
    }
}

async function success(position) {
    updateStatus("Analysing coordinates...");
    const latitude = String(position.coords.latitude);
    const longitude = String(position.coords.longitude);
    
    await sendToBackend(latitude, longitude);
}

async function sendToBackend(latitude, longitude) {
    const url = "/post"; 

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                Latitude: latitude,
                Longitude: longitude,
             })
        });
        
        const result = await response.json();
        
        if (result.error) {
            updateStatus(`<span style="color: #c62828;">Error: ${result.error}</span>`);
            locateBtn.disabled = false;
            return;
        }

        displayResults(result);
        updateStatus("Success! Data retrieved.");
        locateBtn.disabled = false;
    }
    catch (err) {
        console.error("Fetch error:", err.message);
        updateStatus(`<span style="color: #c62828;">Connection error: Server may be offline</span>`);
        locateBtn.disabled = false;
    }
}

function displayResults(data) {
    const cropName = data.recommendation
        ? data.recommendation.charAt(0).toUpperCase() + data.recommendation.slice(1)
        : null;

    const recommendationHTML = cropName ? `
        <div class="recommendation-banner">
            <span class="recommendation-label">Recommended Crop</span>
            <span class="recommendation-crop">${cropName}</span>
            <span class="recommendation-sub">Best match for your soil &amp; climate</span>
        </div>
    ` : '';

    resultsContainer.innerHTML = `
        ${recommendationHTML}
        <div class="results-grid">
            <div class="result-item">
                <span class="result-label">Nitrogen</span>
                <span class="result-value">${data.N}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Phosphorus</span>
                <span class="result-value">${data.P}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Potassium</span>
                <span class="result-value">${data.K}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Soil pH</span>
                <span class="result-value">${data.ph}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Temperature</span>
                <span class="result-value">${data.temperature}°C</span>
            </div>
            <div class="result-item">
                <span class="result-label">Humidity</span>
                <span class="result-value">${data.humidity}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Rainfall</span>
                <span class="result-value">${data.rainfall} <span style="font-size: 0.7rem;">mm/mo</span></span>
            </div>
        </div>
        <div style="text-align: right;">
            <span class="source-tag">Source: ${data.location_source.replace('state_estimate:', '')}</span>
        </div>
    `;
    resultsContainer.classList.remove("hidden");
}

function error(err) {
    locateBtn.disabled = false;
    switch (err.code) {
        case err.PERMISSION_DENIED:
            updateStatus("Permission denied. Enable GPS.");
            break;
        case err.POSITION_UNAVAILABLE:
            updateStatus("Location unavailable.");
            break;
        case err.TIMEOUT:
            updateStatus("Request timed out.");
            break;
        default:
            updateStatus("An unknown error occurred.");
    }
}

locateBtn.addEventListener('click', getLocation);
