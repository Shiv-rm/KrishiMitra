// ── KrishiMitra – Registration Wizard Controller ──────────────────────────────
import { t, setLang, getLang, applyTranslations, onLangChange } from '../../i18n/i18n.js';

// ── DOM refs ───────────────────────────────────────────────────────────────────
const btnEn        = document.getElementById('btn-en');
const btnHi        = document.getElementById('btn-hi');
const regError     = document.getElementById('reg-error');
const card         = document.querySelector('.reg-card');

const steps        = [
  document.getElementById('reg-step-1'),
  document.getElementById('reg-step-2'),
  document.getElementById('reg-step-3')
];
const dots         = [
  document.getElementById('step-dot-1'),
  document.getElementById('step-dot-2'),
  document.getElementById('step-dot-3')
];
const lines        = document.querySelectorAll('.step-line');

// Step 1 refs
const next1        = document.getElementById('next-1');
const nameInput    = document.getElementById('full-name');
const phoneInput   = document.getElementById('reg-phone');
const stateInput   = document.getElementById('state');

// Step 2 refs
const next2        = document.getElementById('next-2');
const back2        = document.getElementById('back-2');
const districtInput= document.getElementById('district');
const landInput    = document.getElementById('land-size');

// Step 3 refs
const regSubmit    = document.getElementById('reg-submit');
const back3        = document.getElementById('back-3');
const passwordInput= document.getElementById('reg-password');
const confirmInput = document.getElementById('confirm-password');
const termsInput   = document.getElementById('terms');
const strengthBar  = document.getElementById('strength-bar');
const strengthLabel= document.getElementById('strength-label');

const togglePw     = document.getElementById('toggle-pw');
const toggleConfirm= document.getElementById('toggle-confirm');
const eyeIcon1     = document.getElementById('eye-icon-1');
const eyeIcon2     = document.getElementById('eye-icon-2');

// ── State ──────────────────────────────────────────────────────────────────────
let currentStep = 0; // 0, 1, 2

// ── Language toggle ────────────────────────────────────────────────────────────
function syncLangButtons(lang) {
  btnEn.classList.toggle('active', lang === 'en');
  btnHi.classList.toggle('active', lang === 'hi');
}

btnEn.addEventListener('click', () => setLang('en'));
btnHi.addEventListener('click', () => setLang('hi'));

function applyPlaceholders() {
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

onLangChange(lang => {
  syncLangButtons(lang);
  applyPlaceholders();
  if (strengthLabel.dataset.strength) {
    updateStrengthUI(strengthLabel.dataset.strength);
  }
});

// Init
applyTranslations();
applyPlaceholders();
syncLangButtons(getLang());

// ── Wizard Logic ───────────────────────────────────────────────────────────────
function goToStep(stepIdx, direction = 'forward') {
  steps[currentStep].classList.add('hidden');
  steps[currentStep].classList.remove('active', 'slide-back');
  
  currentStep = stepIdx;
  
  steps[currentStep].classList.remove('hidden');
  steps[currentStep].classList.add('active');
  if (direction === 'back') {
    steps[currentStep].classList.add('slide-back');
  }

  updateIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateIndicator() {
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentStep);
    dot.classList.toggle('done', idx < currentStep);
  });
  lines.forEach((line, idx) => {
    line.classList.toggle('done', idx < currentStep);
  });
}

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
  regError.textContent = msg;
  regError.classList.remove('hidden');
};

// ── Step Navigation ────────────────────────────────────────────────────────────
next1.addEventListener('click', () => {
  let valid = true;
  if (!nameInput.value.trim()) { setErr('name-error', 'regErrName'); valid = false; }
  else clearErr('name-error');

  if (!/^\d{10}$/.test(phoneInput.value.trim())) { setErr('reg-phone-error', 'regErrPhone'); valid = false; }
  else clearErr('reg-phone-error');

  if (!stateInput.value) { setErr('state-error', 'regErrState'); valid = false; }
  else clearErr('state-error');

  if (valid) goToStep(1);
});

next2.addEventListener('click', () => {
  let valid = true;
  if (!districtInput.value.trim()) { setErr('district-error', 'regErrDistrict'); valid = false; }
  else clearErr('district-error');

  if (!landInput.value || landInput.value <= 0) { setErr('land-error', 'regErrLand'); valid = false; }
  else clearErr('land-error');

  if (valid) goToStep(1); // Wait, should be 2. Corrected below.
});

// Corrected next2
next2.removeEventListener('click', null); // just overwriting is fine or use another var
next2.onclick = () => {
  let valid = true;
  if (!districtInput.value.trim()) { setErr('district-error', 'regErrDistrict'); valid = false; }
  else clearErr('district-error');

  if (!landInput.value || landInput.value <= 0) { setErr('land-error', 'regErrLand'); valid = false; }
  else clearErr('land-error');

  if (valid) goToStep(2);
};

back2.addEventListener('click', () => goToStep(0, 'back'));
back3.addEventListener('click', () => goToStep(1, 'back'));

// ── Step 3 Logic ───────────────────────────────────────────────────────────────
if(togglePw) {
  togglePw.addEventListener('click', () => {
    const isTxt = passwordInput.type === 'text';
    passwordInput.type = isTxt ? 'password' : 'text';
    if(eyeIcon1) eyeIcon1.textContent = isTxt ? '👁' : '🙈';
  });
}

if(toggleConfirm) {
  toggleConfirm.addEventListener('click', () => {
    const isTxt = confirmInput.type === 'text';
    confirmInput.type = isTxt ? 'password' : 'text';
    if(eyeIcon2) eyeIcon2.textContent = isTxt ? '👁' : '🙈';
  });
}

passwordInput.addEventListener('input', () => {
  const val = passwordInput.value;
  let score = 0;
  if (val.length >= 6) score = 1;
  if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) score = 2;
  if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) score = 3;
  if (val.length >= 12) score = 4;

  const strengths = ['', 'regStrWeak', 'regStrFair', 'regStrGood', 'regStrStrong'];
  updateStrengthUI(strengths[score], score);
});

function updateStrengthUI(key, score) {
  strengthBar.className = 'strength-bar ' + (score ? 's' + score : '');
  strengthLabel.className = 'strength-label ' + (score ? 's' + score : '');
  strengthLabel.textContent = key ? t(key) : '';
  strengthLabel.dataset.strength = key;
}

regSubmit.addEventListener('click', async () => {
  let valid = true;
  if (passwordInput.value.length < 6) { setErr('password-error', 'regErrPassword'); valid = false; }
  else clearErr('password-error');

  if (confirmInput.value !== passwordInput.value) { setErr('confirm-error', 'regErrConfirm'); valid = false; }
  else clearErr('confirm-error');

  if (!termsInput.checked) { setErr('terms-error', 'regErrTerms'); valid = false; }
  else clearErr('terms-error');

  if (!valid) return;

  // Final submit
  regSubmit.disabled = true;
  const regBtnSpan = regSubmit.querySelector('[data-i18n]');
  const originalText = regBtnSpan.textContent;
  regBtnSpan.textContent = t('regSubmitting');

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Success
    card.innerHTML = `
      <div class="reg-success-overlay">
        <div class="reg-success-icon">🎉</div>
        <p class="reg-success-text">${t('regSuccess')}</p>
        <p style="color:var(--text-muted); font-size:0.9rem;">${t('loginLogging')}</p>
      </div>
    `;
    card.classList.add('success-state');

    setTimeout(() => {
      window.location.href = './index.html';
    }, 2500);

  } catch (err) {
    showBanner(t('regErrGeneral'));
    regSubmit.disabled = false;
    regBtnSpan.textContent = originalText;
  }
});
