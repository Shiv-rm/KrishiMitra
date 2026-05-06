import gTTS from 'gtts';
import path from 'path';

const text = "**आपकी फसल योजना: गेहूं**\n\n*बीज बोने से पहले (सप्ताह 1)*: भूमि की तैयारी और आवश्यक उर्वरकों का छिड़काव।\n\n*बीज बोना (सप्ताह 2)*: प्रमाणित बीजों का चयन और बोने की प्रक्रिया।\n\n*विकास (सप्ताह 3-6)*: नियमित रूप से पानी देना और उर्वरकों का छिड़काव।\n\n";

console.log("Starting TTS...");
const gtts = new gTTS(text, 'hi');
gtts.save('test.mp3', err => {
    if (err) console.error("TTS Error:", err);
    else console.log("TTS Success");
});
