import './styles/global.css';
import { t, setLang, getLang, applyTranslations, onLangChange } from './i18n/i18n.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusDisplay    = document.getElementById("status-message");
const resultsContainer = document.getElementById("results-container");
const locateBtn        = document.getElementById("get-location-btn");
const btnEn            = document.getElementById("btn-en");
const btnHi            = document.getElementById("btn-hi");

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

    const recommendationHTML = cropName ? `
        <div class="recommendation-banner">
            <span class="recommendation-label">${t("recommendedCrop")}</span>
            <span class="recommendation-crop">${cropName}</span>
            <span class="recommendation-sub">${t("bestMatch")}</span>
        </div>
    ` : '';

    resultsContainer.innerHTML = `
        ${recommendationHTML}
        <div class="results-grid">
            <div class="result-item">
                <span class="result-label">${t("nitrogen")}</span>
                <span class="result-value">${data.N}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("phosphorus")}</span>
                <span class="result-value">${data.P}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("potassium")}</span>
                <span class="result-value">${data.K}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("soilPH")}</span>
                <span class="result-value">${data.ph}</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("temperature")}</span>
                <span class="result-value">${data.temperature}°C</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("humidity")}</span>
                <span class="result-value">${data.humidity}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">${t("rainfall")}</span>
                <span class="result-value">${data.rainfall} <span style="font-size:0.7rem;">mm/mo</span></span>
            </div>
        </div>
        <div style="text-align:right;">
            <span class="source-tag">Source: ${data.location_source.replace('state_estimate:', '')}</span>
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
