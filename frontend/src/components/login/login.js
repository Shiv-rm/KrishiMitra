// ── KrishiMitra – Login Page Controller ──────────────────────────────────────
import { t, setLang, getLang, applyTranslations, onLangChange } from '../../i18n/i18n.js';

// ── DOM refs ───────────────────────────────────────────────────────────────────
const btnEn        = document.getElementById('btn-en');
const btnHi        = document.getElementById('btn-hi');
const form         = document.getElementById('login-form');
const phoneInput   = document.getElementById('phone');
const passwordInput= document.getElementById('password');
const loginBtn     = document.getElementById('login-btn');
const togglePw     = document.getElementById('toggle-pw');
const loginError   = document.getElementById('login-error');
const phoneErr     = document.getElementById('phone-error');
const passwordErr  = document.getElementById('password-error');
const card         = document.querySelector('.login-card');
const otpBtn       = document.getElementById('otp-btn');
const forgotLink   = document.getElementById('forgot-link');
const registerLink = document.getElementById('register-link');

// ── Language toggle ────────────────────────────────────────────────────────────
function syncLangButtons(lang) {
  btnEn.classList.toggle('active', lang === 'en');
  btnHi.classList.toggle('active', lang === 'hi');
}

btnEn.addEventListener('click', () => setLang('en'));
btnHi.addEventListener('click', () => setLang('hi'));

// Also update placeholder attributes (data-i18n doesn't handle placeholders by default)
onLangChange(lang => {
  syncLangButtons(lang);
  // Re-validate visible errors in the new language
  if (phoneInput.classList.contains('invalid'))    phoneErr.textContent     = t('loginErrPhone');
  if (passwordInput.classList.contains('invalid')) passwordErr.textContent  = t('loginErrPassword');
});

// Init
applyTranslations();
syncLangButtons(getLang());

// ── Show / hide password ───────────────────────────────────────────────────────
togglePw.addEventListener('click', () => {
  const isText = passwordInput.type === 'text';
  passwordInput.type = isText ? 'password' : 'text';
  togglePw.classList.toggle('visible', !isText);
});

// ── Validation helpers ─────────────────────────────────────────────────────────
function isValidPhone(v) { return /^\d{10}$/.test(v.trim()); }
function isValidPassword(v) { return v.length >= 6; }

function setFieldError(input, errEl, msg) {
  input.classList.add('invalid');
  errEl.textContent = msg;
}

function clearFieldError(input, errEl) {
  input.classList.remove('invalid');
  errEl.textContent = '';
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function hideError() {
  loginError.classList.add('hidden');
}

// Live validation on blur
phoneInput.addEventListener('blur', () => {
  if (phoneInput.value && !isValidPhone(phoneInput.value)) {
    setFieldError(phoneInput, phoneErr, t('loginErrPhone'));
  } else {
    clearFieldError(phoneInput, phoneErr);
  }
});

phoneInput.addEventListener('input', () => {
  // Allow only digits
  phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
  if (isValidPhone(phoneInput.value)) clearFieldError(phoneInput, phoneErr);
});

passwordInput.addEventListener('blur', () => {
  if (passwordInput.value && !isValidPassword(passwordInput.value)) {
    setFieldError(passwordInput, passwordErr, t('loginErrPassword'));
  } else {
    clearFieldError(passwordInput, passwordErr);
  }
});

passwordInput.addEventListener('input', () => {
  if (isValidPassword(passwordInput.value)) clearFieldError(passwordInput, passwordErr);
});

// ── Form submit ────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const phone    = phoneInput.value.trim();
  const password = passwordInput.value;
  let valid = true;

  if (!isValidPhone(phone)) {
    setFieldError(phoneInput, phoneErr, t('loginErrPhone'));
    valid = false;
  } else {
    clearFieldError(phoneInput, phoneErr);
  }

  if (!isValidPassword(password)) {
    setFieldError(passwordInput, passwordErr, t('loginErrPassword'));
    valid = false;
  } else {
    clearFieldError(passwordInput, passwordErr);
  }

  if (!valid) return;

  // ── Async login to Backend ──────────────────────────────────────────────────
  loginBtn.disabled = true;
  const loginBtnSpan = loginBtn.querySelector('[data-i18n]') || loginBtn;
  const originalText = loginBtnSpan.textContent;
  loginBtnSpan.textContent = t('loginLogging');

  try {
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || t('loginErrGeneral'));
    }

    // ── On success ────────────────────────────────────────────────────────────
    localStorage.setItem('km_token', data.token);
    localStorage.setItem('km_user', JSON.stringify(data.user));

    card.classList.add('success-state');

    // Show success message below the button
    let successEl = document.getElementById('login-success-msg');
    if (!successEl) {
      successEl = document.createElement('p');
      successEl.id = 'login-success-msg';
      successEl.className = 'success-msg';
      loginBtn.insertAdjacentElement('afterend', successEl);
    }
    successEl.textContent = t('loginSuccess');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '../../../index.html';
    }, 1000);

  } catch (err) {
    console.error('Login error:', err);
    showError(err.message || t('loginErrGeneral'));
    loginBtn.disabled = false;
    loginBtnSpan.textContent = originalText;
  }
});

// ── OTP stub ───────────────────────────────────────────────────────────────────
otpBtn.addEventListener('click', () => {
  const phone = phoneInput.value.trim();
  if (!isValidPhone(phone)) {
    setFieldError(phoneInput, phoneErr, t('loginErrPhone'));
    phoneInput.focus();
    return;
  }
  // TODO: integrate OTP API
  alert(`OTP sent to ${phone} (demo stub)`);
});

// ── Link listeners ────────────────────────────────────────────────────
forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  alert('Forgot-password flow coming soon!');
});

registerLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = '../register/register.html';
});
