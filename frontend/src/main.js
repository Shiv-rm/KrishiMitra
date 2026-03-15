import './styles/global.css';
import { t, setLang, getLang, applyTranslations, onLangChange } from './i18n/i18n.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusDisplay    = document.getElementById("status-message");
const resultsContainer = document.getElementById("results-container");
const locateBtn        = document.getElementById("get-location-btn");
const btnEn            = document.getElementById("btn-en");
const btnHi            = document.getElementById("btn-hi");

// New DOM refs Phase 4 and 5
const marketCard       = document.getElementById("market-card");
const marketContainer  = document.getElementById("market-container");
const roadmapCard      = document.getElementById("roadmap-card");

const pestInput        = document.getElementById("pest-image-upload-dashboard");
const pestBtn          = document.getElementById("analyze-pest-btn");
const pestStatus       = document.getElementById("pest-status-message");
const pestResults      = document.getElementById("pest-results-container");

// ── Tab Navigation Logic (Phase 5) ────────────────────────────────────────────
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // 1. Remove active class from all tabs
        navTabs.forEach(t => t.classList.remove('active'));
        // 2. Add active class to clicked tab
        tab.classList.add('active');
        
        // 3. Hide all sections
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // 4. Show target section
        const targetId = tab.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    });
});

// ── State ─────────────────────────────────────────────────────────────────────
let lastResult = null;   // Cache latest API result for re-render on lang switch

// ── Language toggle setup ─────────────────────────────────────────────────────
function syncLangButtons(lang) {
    btnEn.classList.toggle("active", lang === "en");
    btnHi.classList.toggle("active", lang === "hi");
}

btnEn.addEventListener("click", () => setLang("en"));
btnHi.addEventListener("click", () => setLang("hi"));

onLangChange(lang => {
    syncLangButtons(lang);
    // Re-render results panel labels if results are already shown
    if (lastResult && !resultsContainer.classList.contains("hidden")) {
        displayResults(lastResult);
    }
});

// Formats a welcome message fallback
function getWelcomeMessage(userName) {
    return t("welcomePrefix") ? `${t("welcomePrefix")} ${userName}` : `Welcome, ${userName}`;
}

// ── Check Auth Status on Load ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('km_user');
    const navLoginBtn = document.getElementById('nav-login');
    
    if (userStr && navLoginBtn) {
        try {
            const user = JSON.parse(userStr);
            const firstName = user.name.split(' ')[0];
            
            navLoginBtn.textContent = `${getWelcomeMessage(firstName)} (Logout)`;
            navLoginBtn.href = '#';
            navLoginBtn.classList.add('logged-in');
            
            navLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('km_token');
                localStorage.removeItem('km_user');
                window.location.reload();
            });
        } catch (e) {
            console.error("Failed to parse user session", e);
        }
    }
});

// Boot: apply stored language immediately
applyTranslations();
syncLangButtons(getLang());

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateStatus(msg) {
    statusDisplay.innerHTML = msg;
}

// ── Geolocation ───────────────────────────────────────────────────────────────
function getLocation() {
    if (navigator.geolocation) {
        updateStatus(t("requestingLoc"));
        locateBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        updateStatus(t("permDenied"));
    }
}

async function geoSuccess(position) {
    updateStatus(t("analysingCoords"));
    const latitude  = String(position.coords.latitude);
    const longitude = String(position.coords.longitude);
    await sendToBackend(latitude, longitude);
}

// ── Roadmap Helpers ───────────────────────────────────────────────────────────
async function fetchRoadmap(crop) {
    let landSize = 1; // fallback
    let landUnit = 'acres';
    try {
        const userStr = localStorage.getItem('km_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.landSize) landSize = user.landSize;
            if (user.landUnit) landUnit = user.landUnit;
        }
    } catch(e) {}

    try {
        const res = await fetch(`/api/roadmap?crop=${encodeURIComponent(crop)}&landSize=${landSize}&landUnit=${landUnit}`);
        if (!res.ok) throw new Error("Roadmap fetch failed");
        return await res.json();
    } catch (e) {
        console.error("Roadmap Error:", e);
        return null;
    }
}

async function sendToBackend(latitude, longitude) {
    const url = "/post";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Latitude: latitude, Longitude: longitude })
        });

        const result = await response.json();

        if (result.error) {
            updateStatus(`<span style="color:#c62828;">${t("errorPrefix")} ${result.error}</span>`);
            locateBtn.disabled = false;
            return;
        }

        updateStatus("Gathering market and resource roadmap data...");

        // Fetch market trends & resource roadmap for the recommended crop in parallel
        if (result.recommendation) {
            const [marketRes, roadmapData] = await Promise.allSettled([
                fetch(`/api/market-trends?crop=${result.recommendation}`).then(res => res.json()),
                fetchRoadmap(result.recommendation)
            ]);
            
            if (marketRes.status === 'fulfilled') {
                result.market = marketRes.value;
            }
            if (roadmapData.status === 'fulfilled') {
                result.roadmap = roadmapData.value?.roadmap || null;
            }
        }

        lastResult = result;
        displayResults(result);
        updateStatus(t("success"));
        locateBtn.disabled = false;
    } catch (err) {
        console.error("Fetch error:", err.message);
        updateStatus(`<span style="color:#c62828;">${t("connError")}</span>`);
        locateBtn.disabled = false;
    }
}

// ── Results display ───────────────────────────────────────────────────────────
function displayResults(data) {
    const cropName = data.recommendation
        ? data.recommendation.charAt(0).toUpperCase() + data.recommendation.slice(1)
        : null;

    let recommendationHTML = '';
    if (data.recommendations && data.recommendations.length > 0) {
        recommendationHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: var(--text-main); margin-bottom: 12px; font-weight: 600;">Top Crop Candidates</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${data.recommendations.map((rec, idx) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: ${idx === 0 ? 'rgba(76, 175, 80, 0.1)' : '#fafafa'}; padding: 15px 20px; border-radius: 10px; border: 1px solid ${idx === 0 ? '#4caf50' : '#eee'};">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <span style="font-size: 1.3rem; font-weight: 700; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'}; text-transform: capitalize;">${rec.crop}</span>
                                <span style="font-size: 0.85rem; color: ${idx === 0 ? '#2e7d32' : 'var(--text-muted)'}; font-weight: 600;">
                                    ${idx === 0 ? t("bestMatch") || 'Best Match' : 'Potential Alternative'}
                                </span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                <div style="display: flex; align-items: baseline; gap: 2px;">
                                    <span style="font-size: 1.5rem; font-weight: 800; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'};">${rec.confidence}</span>
                                    <span style="font-size: 1rem; font-weight: 600; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'};">%</span>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Confidence</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (cropName) {
        recommendationHTML = `
        <div class="recommendation-banner">
            <span class="recommendation-label">${t("recommendedCrop")}</span>
            <span class="recommendation-crop">${cropName}</span>
            <span class="recommendation-sub">${t("bestMatch")}</span>
        </div>
        `;
    }

    const forecastsHTML = `
        <div class="results-grid" style="margin-top: 15px;">
            <div class="result-item" style="background: #e3f2fd; border-color: #2196f3;">
                <span class="result-label">Yield Forecast</span>
                <span class="result-value" style="font-size:1.1rem">${data.yield_forecast || 'N/A'}</span>
            </div>
            <div class="result-item" style="background: #fff3e0; border-color: #ff9800;">
                <span class="result-label">Est. Profit Margin</span>
                <span class="result-value">${data.profit_margin || 'N/A'}</span>
            </div>
            <div class="result-item" style="background: #e8f5e9; border-color: #4caf50;">
                <span class="result-label">Sustainability Score</span>
                <span class="result-value">${data.sustainability_score || 'N/A'}</span>
            </div>
        </div>
    `;

    if (data.market) {
        marketContainer.innerHTML = `
            <div style="display: flex; gap: 20px; font-size: 0.95rem; color: var(--text-muted);">
                <div><strong>Price:</strong> ₹${data.market.currentPricePerQuintal}/q</div>
                <div><strong>Demand:</strong> <span style="color: ${data.market.demand === 'High' ? '#2e7d32' : 'inherit'}; font-weight:600;">${data.market.demand}</span></div>
                <div><strong>Trend:</strong> <span style="font-weight:600;">${data.market.trend}</span></div>
            </div>
        `;
        marketCard.classList.remove("hidden");
    } else {
        marketCard.classList.add("hidden");
    }

    if (data.roadmap) {
        roadmapCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 15px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapTitle">${t('roadmapTitle')}</h2>
            <div class="roadmap-timeline">
                ${data.roadmap.map((step, index) => `
                    <div class="roadmap-step">
                        <div class="roadmap-step-dot"></div>
                        <div class="roadmap-step-content">
                            <div class="roadmap-step-header">
                                <strong>${step.phase}</strong>
                                <span class="roadmap-step-time">${step.timeline}</span>
                            </div>
                            <p class="roadmap-step-action">${step.action}</p>
                            <p class="roadmap-step-resources">💧 <strong>Resources:</strong> ${step.resources}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        roadmapCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 15px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapTitle">${t('roadmapTitle')}</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem;" data-i18n="roadmapEmpty">${t('roadmapEmpty')}</p>
        `;
    }

    resultsContainer.innerHTML = `
        ${recommendationHTML}
        ${forecastsHTML}
        <h4 style="color: var(--text-muted); margin-top: 25px; margin-bottom: 12px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Field Parameters</h4>
        <div class="results-grid">
            <div class="result-item">
                <span class="result-label">${t("nitrogen") || 'Nitrogen'}</span>
                <span class="result-value">${data.N}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("phosphorus") || 'Phosphorus'}</span>
                <span class="result-value">${data.P}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("potassium") || 'Potassium'}</span>
                <span class="result-value">${data.K}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("soilPH") || 'Soil pH'}</span>
                <span class="result-value">${data.ph}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("temperature") || 'Temperature'}</span>
                <span class="result-value">${data.temperature}°C</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("humidity") || 'Humidity'}</span>
                <span class="result-value">${data.humidity}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("rainfall") || 'Rainfall'}</span>
                <span class="result-value">${data.rainfall} <span style="font-size:0.7rem;">mm/mo</span></span>
            </div>
        </div>
        <div style="text-align:right;">
            <span class="source-tag">Source: ${data.location_source ? data.location_source.replace('state_estimate:', '') : 'Unknown'}</span>
        </div>
    `;

    resultsContainer.classList.remove("hidden");
}

// ── Geolocation error handler ─────────────────────────────────────────────────
function geoError(err) {
    locateBtn.disabled = false;
    switch (err.code) {
        case err.PERMISSION_DENIED:
            updateStatus(t("permDenied")); break;
        case err.POSITION_UNAVAILABLE:
            updateStatus(t("posUnavail")); break;
        case err.TIMEOUT:
            updateStatus(t("timeout")); break;
        default:
            updateStatus(t("unknownErr"));
    }
}

locateBtn.addEventListener('click', getLocation);

// ── Pest Detection Logic ───────────────────────────────────────────────────────
if (pestBtn) {
    pestBtn.addEventListener("click", async () => {
        const file = pestInput.files[0];
        if (!file) {
            pestStatus.innerHTML = `<span style="color:#c62828;">Please select an image first.</span>`;
            return;
        }

        pestStatus.innerHTML = "Analyzing image with AI...";
        pestBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                
                const response = await fetch('/api/analyze-disease', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64String })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    pestStatus.innerHTML = `<span style="color:#c62828;">${data.error || 'Failed to analyze image.'}</span>`;
                } else {
                    pestStatus.innerHTML = "";
                    pestResults.innerHTML = `
                        <h3 style="color: #c62828; margin-bottom: 10px; font-size: 1.1rem;">${data.disease || 'Unknown Issue'}</h3>
                        <p style="color: var(--text-main); line-height: 1.5; font-size: 0.95rem; margin-bottom: 15px;">${data.analysis || 'No detailed analysis provided.'}</p>
                        <div style="margin-top: 10px;">
                            <strong style="color: #2e7d32;">Recommended Treatments:</strong>
                            <ul style="padding-left: 20px; color: var(--text-muted); margin-top: 5px; font-size: 0.9rem;">
                                ${(data.treatments || []).map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong style="color: #1976d2;">Preventive Measures:</strong>
                            <ul style="padding-left: 20px; color: var(--text-muted); margin-top: 5px; font-size: 0.9rem;">
                                ${(data.prevention || []).map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                    pestResults.classList.remove("hidden");
                }
                pestBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Pest analysis error:", err);
            pestStatus.innerHTML = `<span style="color:#c62828;">Connection error.</span>`;
            pestBtn.disabled = false;
        }
    });
}
