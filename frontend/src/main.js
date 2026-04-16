import './styles/global.css';
import { t, setLang, getLang, applyTranslations, onLangChange } from './i18n/i18n.js';

// ── Auth Gate: redirect to login if not authenticated ──────────────────────────
const kmToken = localStorage.getItem('km_token');
if (!kmToken) {
    window.location.href = './login.html';
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusDisplay = document.getElementById("status-message");
const resultsContainer = document.getElementById("results-container");
const locateBtn = document.getElementById("get-location-btn");
const btnEn = document.getElementById("btn-en");
const btnHi = document.getElementById("btn-hi");
const marketCard = document.getElementById("market-card");
const marketContainer = document.getElementById("market-container");

// Roadmap sub-tab DOM refs
const roadmapTimelineCard = document.getElementById("roadmap-timeline-card");
const roadmapResourcesCard = document.getElementById("roadmap-resources-card");

// Pest DOM refs
const pestPredictionContent = document.getElementById("pest-prediction-content");
const pestInput = document.getElementById("pest-image-upload-dashboard");
const pestBtn = document.getElementById("analyze-pest-btn");
const pestStatus = document.getElementById("pest-status-message");
const pestResults = document.getElementById("pest-results-container");

async function loadHistory() {
    const kmToken = localStorage.getItem('km_token');
    if (!kmToken) return;
    try {
        const res = await fetch('/api/crop-history', { headers: { 'Authorization': `Bearer ${kmToken}` } });
        if (res.ok) {
            const history = await res.json();
            userProfile = userProfile || {};
            userProfile.history = history;
            const list = document.getElementById('history-list');
            if (list) {
                if (history.length === 0) list.innerHTML = '<li><p style="color:#777; font-size:0.9rem;">No history added yet.</p></li>';
                else list.innerHTML = history.map(h => `<li style="padding:8px 0; border-bottom:1px solid #e0e0e0; display:flex; justify-content:space-between;"><strong>${h.crop_name}</strong> <span style="font-size:0.85rem; color:#666;">${h.season_year || ''}</span></li>`).join('');
            }
        }
    } catch(e) { console.error('Failed to load crop history', e); }
}

const addHistoryBtn = document.getElementById("add-history-btn");
if (addHistoryBtn) {
    addHistoryBtn.addEventListener("click", async () => {
        const crop_name = document.getElementById("history-crop-input").value.trim();
        const season_year = document.getElementById("history-season-input").value.trim();
        if (!crop_name) return;
        const kmToken = localStorage.getItem('km_token');
        if (!kmToken) return alert("Log in to save history.");
        addHistoryBtn.disabled = true;
        try {
            const res = await fetch("/api/crop-history", {
                method: "POST",
                headers: { "Authorization": `Bearer ${kmToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ crop_name, season_year })
            });
            if (res.ok) {
                document.getElementById("history-crop-input").value = "";
                document.getElementById("history-season-input").value = "";
                await loadHistory();
            } else alert("Failed to add crop history.");
        } catch(e) { console.error(e); }
        addHistoryBtn.disabled = false;
    });
}
// Crop Disease Prediction DOM refs
const diseasePredictionCard = document.getElementById("disease-prediction-card");
const diseaseResultsContainer = document.getElementById("disease-results-container");
const diseaseStatus = document.getElementById("disease-status-message");
const diseaseBtn = document.getElementById("analyze-disease-btn");
const diseaseInput = document.getElementById("disease-image-upload-dashboard");

// ── State ─────────────────────────────────────────────────────────────────────
let lastResult = null;
let userProfile = { land_size: 1, land_unit: 'acres' }; // default fallback

// ── Fetch user profile from backend for accurate land size ────────────────────
async function loadUserProfile() {
    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${kmToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            userProfile = {
                land_size: data.land_size || 1,
                land_unit: data.land_unit || 'acres'
            };
            await loadHistory();
            console.log('User profile loaded:', userProfile);
        }
    } catch (e) {
        console.warn('Could not fetch user profile, using defaults.');
    }
}

// ── Tab Navigation Logic ───────────────────────────────────────────────────────
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(content => content.classList.add('hidden'));
        const targetId = tab.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.remove('hidden');
    });
});

// ── Roadmap Sub-tab Navigation ─────────────────────────────────────────────────
function wireSubTabs(parentId) {
    const parent = document.getElementById(parentId);
    if (!parent) return;
    const tabs = parent.querySelectorAll('.sub-tab');
    const contents = parent.querySelectorAll('.sub-tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.classList.add('hidden'));
            const targetId = tab.getAttribute('data-subtarget');
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');
        });
    });
}

wireSubTabs('tab-roadmap');
wireSubTabs('tab-pest');

// ── Language toggle setup ─────────────────────────────────────────────────────
function syncLangButtons(lang) {
    btnEn.classList.toggle("active", lang === "en");
    btnHi.classList.toggle("active", lang === "hi");
}

btnEn.addEventListener("click", () => setLang("en"));
btnHi.addEventListener("click", () => setLang("hi"));

onLangChange(lang => {
    syncLangButtons(lang);
    if (lastResult && !resultsContainer.classList.contains("hidden")) {
        displayResults(lastResult);
    }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateStatus(msg) { statusDisplay.innerHTML = msg; }

function getWelcomeMessage(userName) {
    return `${t("welcomePrefix")} ${userName}`;
}

// ── Auth display ──────────────────────────────────────────────────────────────
// Run immediately (not just in DOMContentLoaded) so the button updates
// before applyTranslations() can overwrite it.
function updateNavForUser() {
    const userStr = localStorage.getItem('km_user');
    const navLoginBtn = document.getElementById('nav-login');
    if (!navLoginBtn) return;
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const firstName = (user.name || '').split(' ')[0] || 'User';
            // Remove data-i18n so applyTranslations() won't overwrite this
            navLoginBtn.removeAttribute('data-i18n');
            navLoginBtn.textContent = `${getWelcomeMessage(firstName)} (Logout)`;
            navLoginBtn.href = '#';
            navLoginBtn.classList.add('logged-in');
            navLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('km_token');
                localStorage.removeItem('km_user');
                window.location.href = './login.html';
            });
        } catch (e) { console.error("Failed to parse user session", e); }
    }
}

// ── Auth & data load on DOMContentLoaded ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Load actual user profile for land size from DB
    await loadUserProfile();
    // Auto-load cached analysis if available
    await loadCachedAnalysis();
});

// Boot: apply stored language immediately
updateNavForUser(); // must run before applyTranslations so it can strip data-i18n first
applyTranslations();
syncLangButtons(getLang());

// ── Geolocation ───────────────────────────────────────────────────────────────
function getLocation() {
    if (navigator.geolocation) {
        updateStatus(t("requestingLoc"));
        locateBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {
            enableHighAccuracy: true, timeout: 5000, maximumAge: 0
        });
    } else {
        updateStatus(t("permDenied"));
    }
}

async function geoSuccess(position) {
    updateStatus(t("analysingCoords"));
    const latitude = String(position.coords.latitude);
    const longitude = String(position.coords.longitude);
    await sendToBackend(latitude, longitude);
}

async function sendToBackend(latitude, longitude) {
    try {
        console.log("Sending request to backend...");
        const response = await fetch("/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Latitude: latitude, Longitude: longitude })
        });
        const jobInit = await response.json();
        // const result = await response.json();

        console.log("result", result);

        if (jobInit.error) {
            updateStatus(`<span style="color:#c62828;">${t("errorPrefix")} ${jobInit.error}</span>`);
            locateBtn.disabled = false;
            return;
        }

        const jobId = jobInit.jobId;
        updateStatus("Job queued. Analyzing soil and climate...");

        let result;
        while (true) {
            await new Promise(r => setTimeout(r, 2000));
            const jobRes = await fetch(`/api/job/${jobId}`);
            if (!jobRes.ok) continue;
            
            const jobData = await jobRes.json();
            if (jobData.status === 'completed') {
                result = jobData.result;
                break;
            } else if (jobData.status === 'failed') {
                updateStatus(`<span style="color:#c62828;">${t("errorPrefix")} ${jobData.error || 'Failed'}</span>`);
                locateBtn.disabled = false;
                return;
            }
        }

        updateStatus("Gathering market, roadmap and pest data...");

        if (result.top_recommendation) {
            const lang = localStorage.getItem("km_lang") || "en";
            const historyStr = (userProfile && userProfile.history) ? userProfile.history.map(h => h.crop_name).join(", ") : "";
            const [marketRes, roadmapRes, pestRes, weatherRes, rotationRes] = await Promise.allSettled([
                fetch('/api/market-trends', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(result)
                }).then(r => r.json()),
                fetchRoadmap(result.top_recommendation, lang),
                fetchPestPrediction(result.top_recommendation, lang),
                fetch(`/api/weather?lat=${latitude}&lon=${longitude}&crop=${result.top_recommendation}&lang=${lang}`).then(r => r.json()),
                fetch(`/api/crop-rotation?crop=${result.top_recommendation}&lang=${lang}&history=${encodeURIComponent(historyStr)}`).then(r => r.json())
            ]);

            if (marketRes.status === 'fulfilled') result.market = marketRes.value;
            if (roadmapRes.status === 'fulfilled' && roadmapRes.value) {
                result.timeline = roadmapRes.value.timeline || null;
                result.total_summary = roadmapRes.value.total_summary || null;
                result.resources = roadmapRes.value.resources || null;
            }
            if (pestRes.status === 'fulfilled' && pestRes.value) {
                result.pest_threats = pestRes.value.threats || null;
            }
            if (weatherRes.status === 'fulfilled') result.weather = weatherRes.value;
            if (rotationRes.status === 'fulfilled' && rotationRes.value) result.rotation = rotationRes.value.rotation_plan || null;
        }

        lastResult = result;
        displayResults(result);
        // Save the full result to DB, replacing any previous analysis for this user
        saveAnalysis(result);
        updateStatus(t("success"));
        locateBtn.disabled = false;
    } catch (err) {
        console.error("Fetch error:", err.message);
        updateStatus(`<span style="color:#c62828;">${t("connError")}</span>`);
        locateBtn.disabled = false;
    }
}

// ── Save analysis to DB ───────────────────────────────────────────────────────
async function saveAnalysis(result) {
    try {
        await fetch('/api/save-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${kmToken}`
            },
            body: JSON.stringify({ analysis: result })
        });
        console.log('Analysis saved to DB.');
    } catch (e) { console.warn('Could not save analysis:', e); }
}

// ── Load cached analysis from DB on startup ───────────────────────────────────
async function loadCachedAnalysis() {
    try {
        const res = await fetch('/api/my-analysis', {
            headers: { 'Authorization': `Bearer ${kmToken}` }
        });
        const data = await res.json();
        if (data.analysis) {
            lastResult = data.analysis;
            displayResults(data.analysis);
            const when = new Date(data.analysed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            updateStatus(`Showing last analysis from ${when}. Click "Analyze My Location" to refresh.`);
        }
    } catch (e) { console.warn('Could not load cached analysis:', e); }
}

// ── Roadmap Fetch ─────────────────────────────────────────────────────────────
async function fetchRoadmap(crop, lang) {
    const { land_size, land_unit } = userProfile;
    try {
        const res = await fetch(`/api/roadmap?crop=${encodeURIComponent(crop)}&landSize=${land_size}&landUnit=${land_unit}&lang=${lang}`);
        if (!res.ok) throw new Error("Roadmap fetch failed");
        return await res.json();
    } catch (e) { console.error("Roadmap Error:", e); return null; }
}

// ── Pest Prediction Fetch ─────────────────────────────────────────────────────
async function fetchPestPrediction(crop, lang) {
    try {
        const res = await fetch(`/api/pest-prediction?crop=${encodeURIComponent(crop)}&lang=${lang}`);
        if (!res.ok) throw new Error("Pest prediction failed");
        return await res.json();
    } catch (e) { console.error("Pest prediction error:", e); return null; }
}

// ── Results display ───────────────────────────────────────────────────────────
function displayResults(data) {
    const cropName = data.top_recommendation
        ? data.top_recommendation.charAt(0).toUpperCase() + data.top_recommendation.slice(1)
        : null;

    let recommendationHTML = '';
    if (data.recommendations && data.recommendations.length > 0) {
        recommendationHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: var(--text-main); margin-bottom: 12px; font-weight: 600;">${t('dashTopCrops')}</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${data.recommendations.map((rec, idx) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: ${idx === 0 ? 'rgba(76, 175, 80, 0.1)' : '#fafafa'}; padding: 15px 20px; border-radius: 10px; border: 1px solid ${idx === 0 ? '#4caf50' : '#eee'};">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <span style="font-size: 1.3rem; font-weight: 700; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'}; text-transform: capitalize;">${rec.crop}</span>
                                <span style="font-size: 0.85rem; color: ${idx === 0 ? '#2e7d32' : 'var(--text-muted)'}; font-weight: 600;">
                                    ${idx === 0 ? t("bestMatch") : t("dashPotentialAlt")}
                                </span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                <div style="display: flex; align-items: baseline; gap: 2px;">
                                    <span style="font-size: 1.5rem; font-weight: 800; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'};">${rec.confidence}</span>
                                    <span style="font-size: 1rem; font-weight: 600; color: ${idx === 0 ? '#2e7d32' : 'var(--text-main)'};">%</span>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${t('dashConfidence')}</span>
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
                <span class="result-label">${t('dashYieldForecast')}</span>
                <span class="result-value" style="font-size:1.1rem">${data.top_yield_forecast || 'N/A'}</span>
            </div>
            <div class="result-item" style="background: #fff3e0; border-color: #ff9800;">
                <span class="result-label">${t('dashProfitMargin')}</span>
                <span class="result-value">${data.top_profit_margin || 'N/A'}</span>
            </div>
            <div class="result-item" style="background: #e8f5e9; border-color: #4caf50;">
                <span class="result-label">${t('dashSustainScore')}</span>
                <span class="result-value">${data.top_sustainability_score || 'N/A'}</span>
            </div>
        </div>
    `;

    // Market Card
    if (data.market) {
        marketContainer.innerHTML = `
            <div style="display: flex; gap: 20px; font-size: 0.95rem; color: var(--text-muted);">
                <div><strong>${t('dashPrice') || 'Price Format'}</strong> ₹${data.market.currentPricePerQuintal}/q</div>
                <div><strong>${t('dashDemand') || 'Demand'}</strong> <span style="color: ${data.market.demand === 'High' ? '#2e7d32' : 'inherit'}; font-weight:600;">${data.market.demand}</span></div>
                <div><strong>${t('dashTrend') || 'Market Trend'}</strong> <span style="font-weight:600;">${data.market.trend}</span></div>
            </div>
            <div style="font-size: 0.8rem; color: #aaa; margin-top: 5px;">${data.market.source}</div>
        `;
        marketCard.classList.remove("hidden");
    } else {
        marketCard.classList.add("hidden");
    }

    // Weather Card
    const weatherCard = document.getElementById("weather-card");
    const weatherContainer = document.getElementById("weather-container");
    if (data.weather && !data.weather.error) {
        let dailyForecasts = '';
        if (data.weather.daily && data.weather.daily.time) {
            dailyForecasts = data.weather.daily.time.slice(0,3).map((date, idx) => {
                const maxT = data.weather.daily.temperature_2m_max[idx];
                const minT = data.weather.daily.temperature_2m_min[idx];
                const rain = data.weather.daily.precipitation_sum[idx];
                return `<div style="text-align:center; padding:10px; background:#fff; border-radius:8px; flex: 1;">
                    <div style="font-weight:600; font-size:0.85rem;">${new Date(date).toLocaleDateString(undefined, {weekday:'short'})}</div>
                    <div style="font-size:1.1rem; margin:5px 0;">${maxT}°/ ${minT}°</div>
                    <div style="font-size:0.8rem; color:#1976d2;">🌧️ ${rain}mm</div>
                </div>`;
            }).join('');
        }

        weatherContainer.innerHTML = `
            <div style="display: flex; gap: 20px; font-size: 0.95rem; color: var(--text-main); margin-bottom: 12px; align-items:center;">
                <div style="font-size: 2rem;">🌤️</div>
                <div>
                    <div><strong>Current:</strong> ${data.weather.current?.temperature}°C</div>
                    <div style="color: #0288d1; font-weight:600; margin-top:4px;">&#9888; Alert: ${data.weather.alert}</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content:space-between; background:rgba(2,136,209,0.1); padding:10px; border-radius:8px;">
                ${dailyForecasts}
            </div>
        `;
        weatherCard.classList.remove("hidden");
    } else if (weatherCard) {
        weatherCard.classList.add("hidden");
    }

    // ── Roadmap: Timeline sub-tab ────────────────────────────────────────────
    if (data.timeline && data.timeline.length > 0) {
        roadmapTimelineCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 8px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapTitle">${t('roadmapTitle')}</h2>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 18px;">${cropName ? `${cropName}` : ''}</p>
            <h3 style="color: var(--primary-color); font-size: 1rem; margin-bottom: 12px;" data-i18n="roadmapSubTimeline">${t('roadmapSubTimeline')}</h3>
            <div class="roadmap-timeline">
                ${data.timeline.map(step => `
                    <div class="roadmap-step">
                        <div class="roadmap-step-dot"></div>
                        <div class="roadmap-step-content">
                            <div class="roadmap-step-header">
                                <strong>${step.phase}</strong>
                                <span class="roadmap-step-time">${step.time}</span>
                            </div>
                            <p class="roadmap-step-action">${step.action}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        roadmapTimelineCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 15px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapTitle">${t('roadmapTitle')}</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem;" data-i18n="roadmapEmpty">${t('roadmapEmpty')}</p>
        `;
    }

    // ── Roadmap: Resources sub-tab ──────────────────────────────────────────
    if (data.resources && data.resources.length > 0) {
        const totalSummaryHTML = data.total_summary && data.total_summary.length > 0 ? `
            <div class="resources-summary-box">
                <h3 data-i18n="roadmapTotalResources">${t('roadmapTotalResources')}</h3>
                <table class="resources-table">
                    <thead>
                        <tr><th>Item</th><th>Total Quantity</th></tr>
                    </thead>
                    <tbody>
                        ${data.total_summary.map(r => `
                            <tr>
                                <td>${r.item}</td>
                                <td><strong>${r.total_quantity}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '';

        roadmapResourcesCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 8px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapResourcesTitle">${t('roadmapResourcesTitle')}</h2>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 18px;">${userProfile.land_size} ${userProfile.land_unit}</p>
            ${totalSummaryHTML}
            <h3 style="color: var(--primary-color); font-size: 1rem; margin: 20px 0 12px;" data-i18n="roadmapSubResources">${t('roadmapSubResources')} ${t('dashByPhase')}</h3>
            <div class="roadmap-timeline">
                ${data.resources.map(res => `
                    <div class="roadmap-step">
                        <div class="roadmap-step-dot"></div>
                        <div class="roadmap-step-content">
                            <div class="roadmap-step-header">
                                <strong>${res.item}</strong>
                                <span class="roadmap-step-time">${res.phase}</span>
                            </div>
                            <p class="roadmap-step-resources"><strong>${res.quantity}</strong></p>
                            ${res.note ? `<p class="roadmap-step-action" style="margin-top:4px; font-size:0.85rem;">${res.note}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        roadmapResourcesCard.innerHTML = `
            <h2 style="color: var(--text-main); margin-bottom: 15px; font-weight: 600; font-size: 1.2rem;" data-i18n="roadmapResourcesTitle">${t('roadmapResourcesTitle')}</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem;" data-i18n="roadmapEmpty">${t('roadmapEmpty')}</p>
        `;
    }

    // ── Roadmap: Crop Rotation sub-tab ─────────────────────────────────────────
    const roadmapRotationCard = document.getElementById("roadmap-rotation-card");
    if (roadmapRotationCard) {
        if (data.rotation && data.rotation.length > 0) {
            roadmapRotationCard.innerHTML = `
                <h2 style="color: var(--text-main); margin-bottom: 8px; font-weight: 600; font-size: 1.2rem;">Crop Rotation Planner</h2>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 18px;">Post-harvest rotation for: <strong>${cropName || ''}</strong></p>
                <div class="roadmap-timeline">
                    ${data.rotation.map((step, idx) => `
                        <div class="roadmap-step">
                            <div class="roadmap-step-dot" style="background:#2e7d32;"></div>
                            <div class="roadmap-step-content">
                                <div class="roadmap-step-header">
                                    <strong style="color:#2e7d32; font-size:1.1rem; text-transform:capitalize;">${step.crop_name}</strong>
                                    <span class="roadmap-step-time">${step.season}</span>
                                </div>
                                <p class="roadmap-step-action" style="margin-top:8px;">${step.reason}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            const hasCrop = !!cropName;
            roadmapRotationCard.innerHTML = `
                <h2 style="color: var(--text-main); margin-bottom: 15px; font-weight: 600; font-size: 1.2rem;">Crop Rotation Planner</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem;">
                    ${hasCrop ? 'Please click "Analyze My Location" again to generate your new crop rotation plan.' : t('roadmapEmpty')}
                </p>
            `;
        }
    }

    // ── Pest Protection: Predicted threats ─────────────────────────────────
    if (data.pest_threats && data.pest_threats.length > 0) {
        const severityColor = { High: '#c62828', Medium: '#e65100', Low: '#2e7d32' };
        pestPredictionContent.innerHTML = data.pest_threats.map(threat => `
            <div class="pest-threat-card">
                <div class="pest-threat-header">
                    <div>
                        <span class="pest-threat-name">${threat.name}</span>
                        <span class="pest-threat-type">${threat.type}</span>
                    </div>
                    <span class="pest-severity-badge" style="background: ${severityColor[threat.severity] || '#555'};">${threat.severity}</span>
                </div>
                <p class="pest-threat-when">${threat.when}</p>
                <p class="pest-threat-desc">${threat.description}</p>
                <div class="pest-threat-prevention">
                    <strong>${t('dashPrevention')}</strong>
                    <ul>${threat.prevention.map(p => `<li>${p}</li>`).join('')}</ul>
                </div>
            </div>
        `).join('');
    }

    // ── Main results panel ─────────────────────────────────────────────────
    resultsContainer.innerHTML = `
        ${recommendationHTML}
        ${forecastsHTML}
        <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px;">
            <strong style="color: #2e7d32;">Fertilizer Recommendation:</strong>
            <p style="margin-top: 5px; color: var(--text-main); font-size: 0.95rem;">${data.fertilizer_recommendation || "Maintain current nutrient balance."}</p>
        </div>
        <h4 style="color: var(--text-muted); margin-top: 25px; margin-bottom: 12px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">${t('dashFieldParams')}</h4>
        <div class="results-grid">
            <div class="result-item"><span class="result-label">${t("nitrogen")}</span><span class="result-value">${data.N}</span></div>
            <div class="result-item"><span class="result-label">${t("phosphorus")}</span><span class="result-value">${data.P}</span></div>
            <div class="result-item"><span class="result-label">${t("potassium")}</span><span class="result-value">${data.K}</span></div>
            <div class="result-item"><span class="result-label">${t("soilPH")}</span><span class="result-value">${data.ph}</span></div>
            <div class="result-item"><span class="result-label">${t("temperature")}</span><span class="result-value">${data.temperature}°C</span></div>
            <div class="result-item"><span class="result-label">${t("humidity")}</span><span class="result-value">${data.humidity}%</span></div>
            <div class="result-item"><span class="result-label">${t("rainfall")}</span><span class="result-value">${data.rainfall} <span style="font-size:0.7rem;">mm/mo</span></span></div>
        </div>
        <div style="text-align:right;">
            <span class="source-tag">Source: ${data.location_source ? data.location_source.replace('state_estimate:', '') : 'Unknown'}</span>
        </div>
    `;
    resultsContainer.classList.remove("hidden");

    // Apply translations to newly injected elements
    applyTranslations();
}

// ── Geolocation error handler ─────────────────────────────────────────────────
function geoError(err) {
    locateBtn.disabled = false;
    switch (err.code) {
        case err.PERMISSION_DENIED: updateStatus(t("permDenied")); break;
        case err.POSITION_UNAVAILABLE: updateStatus(t("posUnavail")); break;
        case err.TIMEOUT: updateStatus(t("timeout")); break;
        default: updateStatus(t("unknownErr"));
    }
}

locateBtn.addEventListener('click', getLocation);

// ── Pest Image Upload Dropzone ─────────────────────────────────────────────────
const dropzone = document.getElementById('pest-upload-dropzone');
if (dropzone) {
    dropzone.addEventListener('click', () => pestInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) pestInput.files = e.dataTransfer.files;
        updateDropzonePreview();
    });
    pestInput.addEventListener('change', updatePestDropzonePreview);
}

function updatePestDropzonePreview() {
    const file = pestInput.files[0];
    if (file && dropzone) {
        dropzone.querySelector('p').textContent = `📎 ${file.name}`;
    }
}

// ── Disease Image Upload Dropzone ──────────────────────────────────────────────
const diseaseDropzone = document.getElementById('disease-upload-dropzone');
if (diseaseDropzone) {
    diseaseDropzone.addEventListener('click', () => diseaseInput.click());
    diseaseDropzone.addEventListener('dragover', (e) => { e.preventDefault(); diseaseDropzone.classList.add('drag-over'); });
    diseaseDropzone.addEventListener('dragleave', () => diseaseDropzone.classList.remove('drag-over'));
    diseaseDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        diseaseDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) diseaseInput.files = e.dataTransfer.files;
        updateDiseaseDropzonePreview();
    });
    diseaseInput.addEventListener('change', updateDiseaseDropzonePreview);
}

function updateDiseaseDropzonePreview() {
    const file = diseaseInput.files[0];
    if (file && diseaseDropzone) {
        diseaseDropzone.querySelector('p').textContent = `📎 ${file.name}`;
    }
}

// ── Pest Detection (image analysis) ───────────────────────────────────────────
if (pestBtn) {
    pestBtn.addEventListener("click", async () => {
        const file = pestInput.files[0];
        if (!file) {
            pestStatus.innerHTML = `<span style="color:#c62828;">${t('dashErrSelectImg')}</span>`;
            return;
        }
        pestStatus.innerHTML = t('dashPestAnalyzing');
        pestBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const response = await fetch('/api/analyze-disease', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64String, lang: getLang(), type: 'pest' })
                });
                const data = await response.json();
                if (!response.ok) {
                    pestStatus.innerHTML = `<span style="color:#c62828;">${data.error || t('dashErrPestAnalyze')}</span>`;
                } else {
                    pestStatus.innerHTML = "";
                    pestResults.innerHTML = `
                        <h3 style="color: #c62828; margin-bottom: 10px; font-size: 1.1rem;">${data.disease || data.issue || t('dashPestUnknownIssue')}</h3>
                        <p style="color: var(--text-main); line-height: 1.5; font-size: 0.95rem; margin-bottom: 15px;">${data.analysis || t('dashPestNoAnalysis')}</p>
                        <div style="margin-top: 10px;">
                            <strong style="color: #2e7d32;">${t('dashPestTreatments')}</strong>
                            <ul style="padding-left: 20px; color: var(--text-muted); margin-top: 5px; font-size: 0.9rem;">
                                ${(data.treatments || []).map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong style="color: #1976d2;">${t('dashPestPrevention')}</strong>
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
            pestStatus.innerHTML = `<span style="color:#c62828;">${t('dashErrConnection')}</span>`;
            pestBtn.disabled = false;
        }
    });
}

// ── Farm Ledger (ExpenseFlow) ────────────────────────────────────────────────
const ledgerForm = document.getElementById("ledger-form");
const ledgerList = document.getElementById("ledger-list");
const ledgerIncomeEl = document.getElementById("ledger-income");
const ledgerExpenseEl = document.getElementById("ledger-expense");
const ledgerBalanceEl = document.getElementById("ledger-balance");

async function loadLedger() {
    if (!kmToken) return;
    try {
        const res = await fetch('/api/ledger', { headers: { 'Authorization': `Bearer ${kmToken}` } });
        if (!res.ok) return;
        const entries = await res.json();
        renderLedger(entries);
    } catch (e) {
        console.error("Failed to load ledger:", e);
    }
}

function renderLedger(entries) {
    if (!ledgerList) return;
    ledgerList.innerHTML = '';
    let totalIncome = 0;
    let totalExpense = 0;

    if (entries.length === 0) {
        ledgerList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; padding: 10px;">No transactions found.</p>';
    }

    entries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'income') totalIncome += amount;
        else totalExpense += amount;

        const dateStr = new Date(entry.date).toLocaleDateString();
        const isIncome = entry.type === 'income';
        const color = isIncome ? '#2e7d32' : '#c62828';
        const sign = isIncome ? '+' : '-';

        const item = document.createElement('div');
        item.style = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);';
        item.innerHTML = `
            <div>
                <div style="font-weight: 600; color: var(--text-main);">${entry.category}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${dateStr} ${entry.description ? '- ' + entry.description : ''}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-weight: 700; color: ${color};">${sign}₹${amount.toFixed(2)}</div>
                <button class="delete-ledger-btn" data-id="${entry.id}" style="background: none; border: none; color: #ef5350; cursor: pointer; font-size: 1.1rem; padding: 0 5px;" title="Delete">×</button>
            </div>
        `;
        ledgerList.appendChild(item);
    });

    if (ledgerIncomeEl) ledgerIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
    if (ledgerExpenseEl) ledgerExpenseEl.textContent = `₹${totalExpense.toFixed(2)}`;
    if (ledgerBalanceEl) {
        const net = totalIncome - totalExpense;
        ledgerBalanceEl.textContent = `₹${net.toFixed(2)}`;
        ledgerBalanceEl.style.color = net >= 0 ? '#1b5e20' : '#b71c1c';
    }

    document.querySelectorAll('.delete-ledger-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            await deleteLedgerEntry(id);
        });
    });
}

if (ledgerForm) {
    ledgerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!kmToken) return alert("Please login first.");
        
        const type = document.getElementById("ledger-type").value;
        const category = document.getElementById("ledger-category").value;
        const amount = document.getElementById("ledger-amount").value;
        const desc = document.getElementById("ledger-desc").value;

        try {
            const res = await fetch('/api/ledger', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${kmToken}`
                },
                body: JSON.stringify({ type, category, amount, description: desc })
            });
            if (res.ok) {
                ledgerForm.reset();
                loadLedger();
            }
        } catch (err) {
            console.error("Failed to add ledger entry", err);
        }
    });
}

async function deleteLedgerEntry(id) {
    if (!kmToken) return;
    if (!confirm("Delete this transaction?")) return;
    try {
        const res = await fetch(`/api/ledger/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${kmToken}` }
        });
        if (res.ok) loadLedger();
    } catch (e) {
        console.error("Delete failed", e);
    }
}

// Load ledger data on tab switch
const ledgerTabBtn = document.querySelector('[data-target="tab-ledger"]');
if (ledgerTabBtn) {
    ledgerTabBtn.addEventListener('click', () => {
        if (kmToken) loadLedger();
    });
}

// ── Community Forum (Socket.io) ──────────────────────────────────────────────
const forumForm = document.getElementById("forum-form");
const forumMsgInput = document.getElementById("forum-msg-input");
const forumChatBox = document.getElementById("forum-chat-box");
let socket = null;

function initForum() {
    if (socket) return; // Already initialized

    // In dev mode, we point to localhost:3000, in prod it will be same origin
    socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin, {
        auth: { token: kmToken }
    });

    socket.on('connect', () => {
        socket.emit('joinForum', 'general');
    });

    socket.on('forumMessage', (data) => {
        const msgDiv = document.createElement('div');
        msgDiv.style = 'background: white; padding: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';
        
        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgDiv.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
                <strong style="color: var(--text-main);">${data.author}</strong> • ${time}
            </div>
            <div style="font-size: 0.95rem; line-height: 1.4;">${data.msg}</div>
        `;
        
        forumChatBox.appendChild(msgDiv);
        forumChatBox.scrollTop = forumChatBox.scrollHeight;
    });
}

if (forumForm) {
    forumForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = forumMsgInput.value.trim();
        if (!msg) return;

        if (!socket) initForum();

        // Decode farmer's name from token if available, else Anonymous
        let author = "Anonymous Farmer";
        if (kmToken) {
            try {
                const payload = JSON.parse(atob(kmToken.split('.')[1]));
                author = payload.full_name || author;
            } catch (err) {}
        }

        socket.emit('forumMessage', {
            room: 'general',
            msg: msg,
            author: author
        });

        forumMsgInput.value = '';
    });
}

// Init forum when the tab is clicked to save resources
const forumTabBtn = document.querySelector('[data-target="tab-forum"]');
if (forumTabBtn) {
    forumTabBtn.addEventListener('click', () => {
        initForum();
    });
}

// ── Loan & Scheme Processing AI ──────────────────────────────────────────────
const loanForm = document.getElementById("loan-form");
const loanTypeInput = document.getElementById("loan-type-input");
const loanAmountInput = document.getElementById("loan-amount-input");
const loanResults = document.getElementById("loan-results");
const loanSubmitBtn = document.getElementById("loan-submit-btn");

if (loanForm) {
    loanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!kmToken) {
            alert("Please login first to check your eligibility!");
            return;
        }

        const loanType = loanTypeInput.value.trim();
        const amount = loanAmountInput.value.trim();
        
        loanSubmitBtn.disabled = true;
        loanSubmitBtn.textContent = "Analyzing...";
        loanResults.classList.remove('hidden');
        loanResults.innerHTML = '<p style="color: var(--text-muted);">Fetching your profile and analyzing schemes...</p>';

        try {
            const res = await fetch('/api/loan-analysis', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${kmToken}`
                },
                body: JSON.stringify({ 
                    loan_type: loanType, 
                    amount: amount,
                    lang: getLang() 
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                loanResults.innerHTML = `<p style="color: red;">${data.error || 'Failed to perform loan analysis.'}</p>`;
            } else {
                let schemesHtml = '<ul style="margin-top: 10px; padding-left: 20px;">';
                if (data.schemes && data.schemes.length > 0) {
                    data.schemes.forEach(scheme => {
                        schemesHtml += `<li><strong>${scheme.name}</strong>: ${scheme.description}</li>`;
                    });
                } else {
                    schemesHtml += '<li>No specific schemes found.</li>';
                }
                schemesHtml += '</ul>';

                loanResults.innerHTML = `
                    <div style="font-size: 0.95rem; color: #33691e; margin-bottom: 15px;">
                        ${data.assessment}
                    </div>
                    <div style="border-top: 1px solid #cddc39; padding-top: 15px;">
                        <h4 style="color: #558b2f; margin-bottom: 5px;">Recommended Government Schemes</h4>
                        ${schemesHtml}
                    </div>
                `;
            }
        } catch (err) {
            console.error(err);
            loanResults.innerHTML = '<p style="color: red;">Network error. Please try again.</p>';
        } finally {
            loanSubmitBtn.disabled = false;
            loanSubmitBtn.textContent = "Check Eligibility";
        }
    });
}

// ── Soil Image Classification AI ─────────────────────────────────────────────
const soilInput = document.getElementById("soil-input");
const soilDropzone = document.getElementById("soil-dropzone");
const soilAnalyzeBtn = document.getElementById("soil-analyze-btn");
const soilStatus = document.getElementById("soil-status");
const soilResults = document.getElementById("soil-results");

if (soilInput && soilDropzone) {
    soilInput.addEventListener('change', () => {
        const file = soilInput.files[0];
        if (file) {
            soilDropzone.querySelector('p').textContent = `📎 ${file.name}`;
            soilAnalyzeBtn.disabled = false;
        }
    });

    soilDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        soilDropzone.style.borderColor = "var(--primary-color)";
    });

    soilDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        soilDropzone.style.borderColor = "var(--border-color)";
    });

    soilDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        soilDropzone.style.borderColor = "var(--border-color)";
        if (e.dataTransfer.files.length) {
            soilInput.files = e.dataTransfer.files;
            soilDropzone.querySelector('p').textContent = `📎 ${e.dataTransfer.files[0].name}`;
            soilAnalyzeBtn.disabled = false;
        }
    });
}

if (soilAnalyzeBtn) {
    soilAnalyzeBtn.addEventListener('click', async () => {
        const file = soilInput.files[0];
        if (!file) return;

        soilStatus.innerHTML = "Analyzing soil image...";
        soilAnalyzeBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const res = await fetch('/api/analyze-soil', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64String, lang: getLang() })
                });

                const data = await res.json();
                
                if (!res.ok) {
                    soilStatus.innerHTML = `<span style="color:red;">${data.error || 'Failed to analyze.'}</span>`;
                } else {
                    soilStatus.innerHTML = "";
                    soilResults.classList.remove('hidden');
                    soilResults.innerHTML = `
                        <h3 style="color: #4e342e; margin-bottom: 10px;">Type: ${data.soil_type || 'Unknown'}</h3>
                        <div style="font-size: 0.95rem; color: #5d4037; line-height: 1.5;">${data.analysis}</div>
                    `;
                }
                soilAnalyzeBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            soilStatus.innerHTML = `<span style="color:red;">Network Error</span>`;
            soilAnalyzeBtn.disabled = false;
        }
    });
}

// ── Crop Disease Detection (image analysis) ────────────────────────────────────────
if (diseaseBtn) {
    diseaseBtn.addEventListener("click", async () => {
        const file = diseaseInput.files[0];
        if (!file) {
            diseaseStatus.innerHTML = `<span style="color:#c62828;">${t('dashErrSelectImg')}</span>`;
            return;
        }
        diseaseStatus.innerHTML = t('dashDiseaseAnalyzing');
        diseaseBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const response = await fetch('/api/crop-disease-predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64String, lang: getLang() })
                });
                const data = await response.json();
                if (!response.ok) {
                    diseaseStatus.innerHTML = `<span style="color:#c62828;">${data.error || t('dashErrDiseaseAnalyze')}</span>`;
                } else {
                    diseaseStatus.innerHTML = "";
                    const diseaseName = (data.prediction || "Unknown Issue").replace(/___/g, " - ").replace(/_/g, " ");
                    
                    // Robust confidence check
                    let confidenceDisplay = "N/A";
                    if (data.confidence !== undefined && data.confidence !== null) {
                        const confNum = Number(data.confidence);
                        if (!isNaN(confNum)) {
                            confidenceDisplay = `${confNum.toFixed(1)}%`;
                        }
                    }
                    
                    diseaseResultsContainer.innerHTML = `
                        <div style="background: rgba(198, 40, 40, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(198, 40, 40, 0.2);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                <h3 style="color: #c62828; margin: 0; font-size: 1.25rem; font-weight: 700;">${diseaseName}</h3>
                                <div style="background: #c62828; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                                    ${confidenceDisplay} ${t('dashConfidence')}
                                </div>
                            </div>
                            
                            <p style="color: var(--text-main); line-height: 1.5; font-size: 0.95rem; margin-bottom: 15px;">
                                ${data.analysis || "Our model has identified symptoms consistent with the disease mentioned above. Please view recommendations below."}
                            </p>
                            
                            ${data.treatments ? `
                            <div style="margin-top: 15px;">
                                <strong style="color: #2e7d32;">Recommended Actions</strong>
                                <ul style="padding-left: 20px; color: var(--text-muted); margin-top: 8px; font-size: 0.9rem;">
                                    ${data.treatments.map(t => `<li>${t}</li>`).join('')}
                                </ul>
                            </div>
                            ` : `
                            <div style="background: #fff8e1; padding: 12px; border-radius: 8px; font-size: 0.85rem; color: #856404; margin-top: 10px;">
                                💡 Tip: You can use our AI Chatbot for detailed treatment steps for this specific disease.
                            </div>
                            `}
                        </div>
                    `;
                    diseaseResultsContainer.classList.remove("hidden");
                }
                diseaseBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Disease analysis error:", err);
            diseaseStatus.innerHTML = `<span style="color:#c62828;">${t('dashErrConnection')}</span>`;
            diseaseBtn.disabled = false;
        }
    });
}