import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Create Groq instance
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Sends a message and optional base64 image to Groq and returns the reply.
 */
export async function getGroqResponse(message, base64Image = null, lang = 'en') {
  if (!process.env.GROQ_API_KEY) {
    return "Error: GROQ_API_KEY is not configured on the server.";
  }

  try {
    const messages = [];
    
    // Determine the model based on whether an image is present
    const model = base64Image ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    const systemInstruction = lang === 'hi'
      ? "आप कृषिमित्र AI हैं, एक विशेषज्ञ कृषि सहायक। प्रश्नों का उत्तर स्पष्ट रूप से दें। यदि कोई पौधे की छवि दिखाई जाती है, तो किसी भी फसल रोग का पता लगाएं और संक्षिप्त, व्यावहारिक उपचार प्रदान करें। प्रतिक्रियाओं को सहायक और पढ़ने में आसान रखें। आपकी पूरी प्रतिक्रिया हिंदी भाषा में होनी चाहिए।"
      : "You are KrishiMitra AI, an expert agricultural assistant. Answer questions clearly. If shown an image of a plant, detect any crop diseases and provide concise, practical remedies. Keep responses helpful and easy to read. Your entire response MUST be in English.";

    messages.push({
      role: "system",
      content: systemInstruction
    });

    if (base64Image) {
      // Decode the data URL into mimeType and base64 string
      const match = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
      const base64Data = match ? match[2] : base64Image;
      const mimeType = match ? match[1] : 'image/jpeg';

      messages.push({
        role: "user",
        content: [
          { type: 'text', text: message || (lang === 'hi' ? "आप इस छवि में क्या देखते हैं? यदि दिखाई दे तो किसी भी फसल रोग या समस्या का आकलन करें।" : "What do you see in this image? Assess any crop diseases or issues if visible.") },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: message
      });
    }

    const response = await groq.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error);
    return lang === 'hi' 
      ? "मुझे अभी अपनी AI सेवा से जुड़ने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें।"
      : "I'm having trouble connecting to my AI service right now. Please try again later.";
  }
}


/**
 * Generates a Resource Management Roadmap for a specific crop and field size.
 * Returns a JSON object containing the timeline and resource requirements.
 */
export async function generateRoadmap(crop, landSize, landUnit = 'acres', lang = 'en') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const langInstruction = lang === 'hi'
      ? 'CRITICAL: ALL text values in the JSON including descriptions, phases, timelines, item names, and quantities MUST be in Hindi language.'
      : 'All text values in the JSON MUST be in English language.';

    const prompt = `
You are an expert agricultural scientist. A farmer wants to grow "${crop}" on a field of ${landSize} ${landUnit}.
Create a detailed Resource Management Roadmap subdivided into a growing timeline and a resource requirements list.

${langInstruction}

IMPORTANT QUANTITY RULES:
- Express ALL fertilizer and seed quantities in terms of JUTE SACKS (1 jute sack = 50 kg). Example: "3 jute sacks (150 kg)".
- For liquid pesticides, express in liters.
- Calculate exact quantities for the given field size of ${landSize} ${landUnit}.
- Provide a "total_summary" array listing the grand total of ALL resources needed for the entire crop season.

You MUST respond strictly with valid JSON. Do not use markdown blocks. Return ONLY the JSON object.
Format:
{
  "timeline": [
    { "phase": "Pre-sowing", "time": "Week 1", "action": "Detailed action description." },
    { "phase": "Sowing", "time": "Week 2", "action": "Action description." }
  ],
  "total_summary": [
    { "item": "NPK Fertilizer", "total_quantity": "5 jute sacks (250 kg)" },
    { "item": "Urea", "total_quantity": "2 jute sacks (100 kg)" },
    { "item": "Seeds", "total_quantity": "1 jute sack (50 kg)" },
    { "item": "Pesticide X", "total_quantity": "4 liters" }
  ],
  "resources": [
    { "phase": "Pre-sowing", "item": "NPK Fertilizer", "quantity": "2 jute sacks (100 kg)", "note": "Apply before tilling." },
    { "phase": "Sowing", "item": "Seeds", "quantity": "1 jute sack (50 kg)", "note": "Use certified seeds." },
    { "phase": "Growth", "item": "Urea", "quantity": "2 jute sacks (100 kg)", "note": "Top dressing at 30 days." }
  ]
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Groq Roadmap API Error:", error);
    throw new Error("Failed to generate agricultural roadmap.");
  }
}

/**
 * Predicts expected pest and disease threats for a crop with prevention strategies.
 */
export async function getPestPrediction(crop, lang = 'en') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const langInstruction = lang === 'hi'
      ? 'CRITICAL: ALL text values in the JSON including pest names, descriptions, and strategies MUST be in Hindi language.'
      : 'All text values in the JSON MUST be in English language.';

    const prompt = `
You are an expert agronomist. A farmer is planning to grow "${crop}".
Predict the most common pest and disease threats they are likely to encounter and provide actionable prevention strategies.

${langInstruction}

You MUST respond strictly with valid JSON. Return ONLY the JSON object.
Format:
{
  "threats": [
    {
      "name": "Aphids",
      "type": "Pest",
      "when": "Early growth stage (Weeks 2-6)",
      "description": "Small sap-sucking insects that cluster on new shoots.",
      "prevention": ["Spray neem oil every 2 weeks.", "Introduce ladybugs as natural predators."],
      "severity": "Medium"
    },
    {
      "name": "Powdery Mildew",
      "type": "Disease",
      "when": "Humid periods",
      "description": "Fungal infection causing white powdery coating on leaves.",
      "prevention": ["Ensure good air circulation.", "Apply sulfur-based fungicide."],
      "severity": "High"
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Groq Pest Prediction Error:', error);
    throw new Error('Failed to generate pest prediction.');
  }
}

/**
 * Analyzes an image of a plant/leaf for diseases/pests using Groq Vision.
 */
export async function analyzePestImage(base64Image, lang = 'en', type = 'generic') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const langInstruction = lang === 'hi'
      ? 'CRITICAL: ALL text values in the JSON (disease, analysis, treatments array, prevention array) MUST be in Hindi language.'
      : 'All text values in the JSON MUST be in English language.';

    const typeContext = type === 'pest' 
      ? 'Focus specifically on identifying pests, insects, or physical damage caused by bugs.' 
      : type === 'disease' 
      ? 'Focus specifically on identifying plant diseases, fungal infections, viruses, or bacterial spots.' 
      : 'Identify any diseases, pests, or nutrient deficiencies visible.';

    const prompt = `
You are an expert plant pathologist and agrarian scientist. Analyze this image of a plant/leaf/pest.
${typeContext}

${langInstruction}

You MUST respond strictly with valid JSON. Return only the JSON object.
Format the JSON exactly like this:
{
  "disease": "Name of the disease or pest",
  "analysis": "A brief explanation of what is visibly wrong with the plant.",
  "treatments": [
    "Chemical treatment option 1",
    "Organic/Biological treatment option 2"
  ],
  "prevention": [
    "Preventive measure 1",
    "Preventive measure 2"
  ]
}
If no disease is found, state that the plant appears healthy in the analysis, but maintain the JSON structure.
`;

    const match = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
    const base64Data = match ? match[2] : base64Image;
    const mimeType = match ? match[1] : 'image/jpeg';

    const response = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Groq Pest Analysis Error:", error);
    throw new Error("Failed to analyze image with AI.");
  }
}

/**
 * Generates a crop rotation plan based on the current crop.
 */
export async function generateCropRotationPlan(currentCrop, lang = 'en', pastCrops = null) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const langInstruction = lang === 'hi'
      ? 'CRITICAL: ALL text values in the JSON (season, crop_name, reason) MUST be in Hindi language.'
      : 'All text values in the JSON MUST be in English language.';

    const pastCropContext = pastCrops ? `The farmer has previously grown: ${pastCrops}. Please ensure the rotation makes sense contextually.` : '';

    const prompt = `
You are an expert agronomist. A farmer has just harvested or is planning to harvest "${currentCrop}".
${pastCropContext}
Provide a 3-season crop rotation plan to restore soil fertility, prevent pests, and maximize yield.

${langInstruction}

You MUST respond strictly with valid JSON. Return ONLY the JSON object.
Format:
{
  "rotation_plan": [
    {
      "season": "Season 1 (Next)",
      "crop_name": "Name of crop",
      "reason": "Why this crop is best for rotation (e.g., fixes nitrogen, breaks pest cycle)"
    },
    {
      "season": "Season 2",
      "crop_name": "Name of crop",
      "reason": "Reason for this crop"
    },
    {
      "season": "Season 3",
      "crop_name": "Name of crop",
      "reason": "Reason for this crop"
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Groq Crop Rotation Generation Error:", error.message || error);
    // Return empty array instead of failing entirely
    return { rotation_plan: [] };
  }
}

/**
 * Analyzes loan eligibility and suggests government schemes based on farmer's profile
 */
export async function analyzeLoanEligibility(profile, lang = 'en') {
  if (!process.env.GROQ_API_KEY) {
    return { error: "GROQ_API_KEY is not configured", assessment: "", schemes: [] };
  }

  const systemPrompt = `You are a financial advisor specializing in agricultural loans and subsidies in India.
The user's profile is:
- Land Size: ${profile.land_size} ${profile.land_unit}
- State: ${profile.state || 'India'}
- Current Crop: ${profile.crop_type || 'Unknown'}
- Requested Loan Type: ${profile.loan_type || 'General Agricultural Loan'}
- Amount: ₹${profile.amount || 'Unknown'}

Analyze their eligibility and provide:
1. "assessment": A supportive assessment of their loan eligibility (HTML format, short paragraphs).
2. "schemes": An array of objects for 2-3 specific Indian government schemes they qualify for, each with "name" and "description".

Ensure your response is valid JSON. Use language: ${lang === 'hi' ? 'Hindi' : 'English'}, but always keep JSON keys in English.

Format strictly as:
{
  "assessment": "HTML string here",
  "schemes": [
    { "name": "Scheme 1", "description": "Desc 1" }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const reply = completion.choices[0]?.message?.content;
    return JSON.parse(reply);
  } catch (error) {
    console.error("Groq Loan Analysis Error:", error.message || error);
    return { error: "Failed to fetch loan analysis.", assessment: "", schemes: [] };
  }
}

/**
 * Simulates Soil Classification using Groq Vision model.
 */
export async function analyzeSoil(imageBase64, lang = 'en') {
  if (!process.env.GROQ_API_KEY) {
    return { error: "GROQ_API_KEY is not configured", soil_type: "Unknown", analysis: "N/A" };
  }

  const systemPrompt = `You are an expert an agricultural soil science. 
Examine the provided image of soil and classify the soil type (e.g., Alluvial, Black, Red, Laterite, Desert, etc.).
Provide:
1. "soil_type": The best guess of the soil type.
2. "analysis": A brief HTML-formatted analysis of this soil's typical characteristics and what crops are best suited for it.

Use language: ${lang === 'hi' ? 'Hindi' : 'English'}, but always keep JSON keys in English.

Format strictly as JSON:
{
  "soil_type": "Soil Type",
  "analysis": "HTML string..."
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      model: 'llama-3.2-11b-vision-preview',
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    const reply = completion.choices[0]?.message?.content;
    return JSON.parse(reply);
  } catch (error) {
    console.error("Groq Soil Analysis Error:", error.message || error);
    return { error: "Failed to analyze soil image.", soil_type: "Unknown", analysis: "N/A" };
  }
}

/**
 * Gets expert advice (analysis, treatments, prevention) for a specific disease name found by the model.
 * Returns advice in both English and Hindi to support dynamic UI switching.
 */
export async function getDiseaseAdvice(diseaseName) {
    if (!process.env.GROQ_API_KEY) {
        return {
            en: { analysis: "AI service not available.", treatments: [], prevention: [] },
            hi: { analysis: "AI सेवा उपलब्ध नहीं है।", treatments: [], prevention: [] }
        };
    }

    try {
        const prompt = `
You are an expert plant pathologist and agricultural consultant. A diagnosis has been confirmed: "${diseaseName}".

Provide a highly specific and professional analysis of this issue. 
Your response must include:
1. "analysis": A clear, concise explanation of the disease/pest, its symptoms, and its impact on the crop.
2. "treatments": A list of specific, actionable remedies. Include both chemical (if necessary, specify the active ingredient like 'Imidacloprid') and organic/biological options (like 'Neem oil' or 'Trichoderma').
3. "prevention": Specific cultural practices or preventive measures to avoid recurrence (e.g., crop rotation, specific spacing, resistant varieties).

You MUST provide the response in BOTH English and Hindi.

You MUST respond strictly with valid JSON. Return ONLY the JSON object.
Format exactly as:
{
  "en": {
    "analysis": "Specific English analysis...",
    "treatments": ["Actionable Treatment 1", "Actionable Treatment 2"],
    "prevention": ["Preventive Measure 1", "Preventive Measure 2"]
  },
  "hi": {
    "analysis": "सटीक हिंदी विश्लेषण...",
    "treatments": ["उपचार 1", "उपचार 2"],
    "prevention": ["निवारक उपाय 1", "निवारक उपाय 2"]
  }
}
`;


        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("Groq Disease Advice Error:", error);
        return {
            en: { analysis: "Failed to fetch AI advice.", treatments: [], prevention: [] },
            hi: { analysis: "AI सलाह प्राप्त करने में विफल।", treatments: [], prevention: [] }
        };
    }
}

/**
 * Transcribes an audio file to text using Groq's whisper model.
 */
export async function transcribeAudio(filePath, lang = 'hi') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      language: lang,
      response_format: "text",
    });
    return transcription;
  } catch (error) {
    console.error("Groq Audio Transcription Error:", error);
    throw new Error("Failed to transcribe audio.");
  }
}
