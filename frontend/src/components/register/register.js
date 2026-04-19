// ── KrishiMitra – Registration Controller (Simplified) ─────────────────────────
import { t, setLang, getLang, applyTranslations, onLangChange } from '../../i18n/i18n.js';

// ── DOM refs ───────────────────────────────────────────────────────────────────
const btnEn        = document.getElementById('btn-en');
const btnHi        = document.getElementById('btn-hi');
const card         = document.querySelector('.reg-card');

// Form inputs
const nameInput    = document.getElementById('full-name');
const phoneInput   = document.getElementById('reg-phone');
const landInput    = document.getElementById('land-size');
const landUnitInput= document.getElementById('land-unit');
const passwordInput= document.getElementById('reg-password');
const confirmInput = document.getElementById('confirm-password');
const termsInput   = document.getElementById('terms');
const otpInput     = document.getElementById('reg-otp');
const grpOtp       = document.getElementById('grp-otp');

const regSubmit    = document.getElementById('reg-submit');
const togglePw     = document.getElementById('toggle-pw');
const toggleConfirm= document.getElementById('toggle-confirm');

let otpSent = false;

// ── Language toggle ────────────────────────────────────────────────────────────
function syncLangButtons(lang) {
  btnEn.classList.toggle('active', lang === 'en');
  btnHi.classList.toggle('active', lang === 'hi');
}

btnEn.addEventListener('click', () => setLang('en'));
btnHi.addEventListener('click', () => setLang('hi'));

onLangChange(lang => {
  syncLangButtons(lang);
});

// Init
applyTranslations();
syncLangButtons(getLang());

// ── Validation Helpers ─────────────────────────────────────────────────────────
const setErr = (id, msgKey) => {
  const el = document.getElementById(id);
  const input = el.closest('.form-group')?.querySelector('input, select');
  if (input) input.classList.add('invalid');
  el.textContent = t(msgKey);
};

const clearErr = (id) => {
  const el = document.getElementById(id);
  const input = el.closest('.form-group')?.querySelector('input, select');
  if (input) input.classList.remove('invalid');
  el.textContent = '';
};

const showBanner = (msg) => {
  const errBanner = document.getElementById('reg-error');
  if (errBanner) {
      errBanner.textContent = msg;
      errBanner.classList.remove('hidden');
  } else {
      console.error("reg-error element missing, showing alert instead:");
      alert(msg);
  }
};

// ── Interactions ───────────────────────────────────────────────────────────────
if (togglePw) {
  togglePw.addEventListener('click', () => {
    const isTxt = passwordInput.type === 'text';
    passwordInput.type = isTxt ? 'password' : 'text';
    togglePw.classList.toggle('visible', !isTxt);
  });
}

if (toggleConfirm) {
  toggleConfirm.addEventListener('click', () => {
    const isTxt = confirmInput.type === 'text';
    confirmInput.type = isTxt ? 'password' : 'text';
    toggleConfirm.classList.toggle('visible', !isTxt);
  });
}

regSubmit.addEventListener('click', async () => {
  let valid = true;
  
  // Validation
  if (!nameInput.value.trim()) { setErr('name-error', 'regErrName'); valid = false; }
  else clearErr('name-error');

  if (!/^\d{10}$/.test(phoneInput.value.trim())) { setErr('reg-phone-error', 'regErrPhone'); valid = false; }
  else clearErr('reg-phone-error');

  if (!landInput.value || landInput.value <= 0) { setErr('land-error', 'regErrLand'); valid = false; }
  else clearErr('land-error');

  if (passwordInput.value.length < 6) { setErr('password-error', 'regErrPassword'); valid = false; }
  else clearErr('password-error');

  if (confirmInput.value !== passwordInput.value) { setErr('confirm-error', 'regErrConfirm'); valid = false; }
  else clearErr('confirm-error');

  if (!termsInput.checked) { setErr('terms-error', 'regErrTerms'); valid = false; }
  else clearErr('terms-error');

  if (otpSent && !otpInput.value.trim()) { setErr('otp-error', 'regErrOtp'); valid = false; }
  else clearErr('otp-error');

  if (!valid) return;

  const regBtnSpan = regSubmit.querySelector('[data-i18n]') || regSubmit;
  const originalText = regBtnSpan.textContent;

  // Step 1: Send OTP
  if (!otpSent) {
    regSubmit.disabled = true;
    regBtnSpan.textContent = t('regSendingOtp');

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput.value.trim() })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || t('regErrOtpSend'));
      
      otpSent = true;
      grpOtp.classList.remove('hidden');
      regBtnSpan.textContent = t('regVerifyBtn');
      regSubmit.disabled = false;
      
      // Dev mode: Show OTP in an alert
      alert(`[DEV] Your OTP is: ${data.otp}`);
    } catch (err) {
      showBanner(err.message || t('regErrOtpSend'));
      regSubmit.disabled = false;
      regBtnSpan.textContent = originalText;
    }
    return;
  }

  // Step 2: Final submit
  regSubmit.disabled = true;
  regBtnSpan.textContent = t('regSubmitting') || 'Creating account...';

  try {
    const payload = {
        fullName: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        landSize: parseFloat(landInput.value) || 0,
        landUnit: landUnitInput.value,
        password: passwordInput.value,
        otp: otpInput.value.trim()
    };

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
        throw new Error(data.error || "Registration failed");
    }

    // Success - Store token
    localStorage.setItem('km_token', data.token);
    localStorage.setItem('km_user', JSON.stringify(data.user));

    card.innerHTML = `
      <div class="reg-success-overlay">
        <div class="reg-success-icon">🎉</div>
        <p class="reg-success-text">${t('regSuccess') || 'Success!'}</p>
        <p style="color:var(--text-muted); font-size:0.9rem;">${t('loginLogging') || 'Logging in...'}</p>
      </div>
    `;
    card.classList.add('success-state');

    setTimeout(() => {
      window.location.href = '../../../index.html';
    }, 2500);

  } catch (err) {
    showBanner(err.message || t('regErrGeneral'));
    regSubmit.disabled = false;
    regBtnSpan.textContent = t('regVerifyBtn');
  }
});
