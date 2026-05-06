import { generateRoadmap } from './backend/groq_ai_service.js';
(async () => {
    try {
        console.log("Starting...");
        const res = await generateRoadmap('गेहूं', 5, 'acres', 'hi');
        console.log("Success:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Failed:", e);
    }
})();
