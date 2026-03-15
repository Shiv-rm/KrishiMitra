import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

// Create Groq instance
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Sends a message and optional base64 image to Groq and returns the reply.
 */
export async function getGroqResponse(message, base64Image = null) {
  if (!process.env.GROQ_API_KEY) {
    return "Error: GROQ_API_KEY is not configured on the server.";
  }

  try {
    const messages = [];
    
    // Determine the model based on whether an image is present
    const model = base64Image ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    if (base64Image) {
      // Decode the data URL into mimeType and base64 string
      const match = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
      const base64Data = match ? match[2] : base64Image;
      const mimeType = match ? match[1] : 'image/jpeg';

      messages.push({
        role: "user",
        content: [
          { type: 'text', text: message || "What do you see in this image? Assess any crop diseases or issues if visible." },
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
    return "I'm having trouble connecting to my AI service right now. Please try again later.";
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
export async function analyzePestImage(base64Image) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  try {
    const prompt = `
You are an expert plant pathologist and agrarian scientist. Analyze this image of a plant/leaf.
Identify any diseases, pests, or nutrient deficiencies visible.

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
