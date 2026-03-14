import { t } from './i18n/i18n.js';

// Chat Interface Logic
const fab = document.getElementById('ai-chat-fab');
const chatModal = document.getElementById('chat-modal');
const closeBtn = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('chat-messages');

// Voice & Image Elements
const voiceBtn = document.getElementById('voice-btn');
const attachBtn = document.getElementById('attach-btn');
const imageUpload = document.getElementById('image-upload');

// Toggle Chat
fab.addEventListener('click', () => {
    chatModal.classList.toggle('hidden');
    if (!chatModal.classList.contains('hidden')) {
        chatInput.focus();
    }
});

closeBtn.addEventListener('click', () => {
    chatModal.classList.add('hidden');
});

// Add Message to DOM
function addMessage(text, isUser = false, imageUrl = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'chat-image';
        msgDiv.appendChild(img);
    }

    if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        msgDiv.appendChild(p);
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message Flow
async function sendMessage(text = '', base64Image = null) {
    if (!text && !base64Image) return;

    if (text) {
        // Visual
        addMessage(text, true, base64Image ? base64Image : null);
        chatInput.value = '';
    } else if (base64Image) {
        addMessage(t('chatUploading'), true, base64Image);
    }
    
    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    addMessage(t('chatLoading'), false);
    messagesContainer.lastElementChild.id = loadingId;

    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text, image: base64Image })
        });
        
        const data = await response.json();
        
        // Remove loading
        document.getElementById(loadingId).remove();
        
        if (data.reply) {
            addMessage(data.reply, false);
            // Optionally, we can use speech synthesis to read it out completely
            // if triggered by voice.
        } else {
            addMessage(t('chatErrorProc'), false);
        }

    } catch (error) {
        console.error("Chat error:", error);
        document.getElementById(loadingId).remove();
        addMessage(t('chatErrorConn'), false);
    }
}

// Event Listeners
sendBtn.addEventListener('click', () => sendMessage(chatInput.value.trim()));

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(chatInput.value.trim());
});

// Image Upload
attachBtn.addEventListener('click', () => imageUpload.click());

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Got base64
            sendMessage('', reader.result);
        };
        reader.readAsDataURL(file);
    }
});

// Web Speech API for voice
let recognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    // Set dynamically based on selected language
    // e.g. recognition.lang = 'hi-IN';
    recognition.lang = document.documentElement.lang === 'hi' ? 'hi-IN' : 'en-US'; 
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceBtn.classList.add('recording');
        chatInput.placeholder = t('chatListening');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        // Optionally auto-send
        sendMessage(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        voiceBtn.classList.remove('recording');
        chatInput.placeholder = t('chatAskPh');
    };

    recognition.onend = () => {
        voiceBtn.classList.remove('recording');
        chatInput.placeholder = t('chatAskPh');
    };
}

voiceBtn.addEventListener('click', () => {
    if (recognition) {
        // Update language just in case it changed
        recognition.lang = document.documentElement.lang === 'hi' ? 'hi-IN' : 'en-US';
        recognition.start();
    } else {
        alert(t('chatVoiceNotSupp'));
    }
});
