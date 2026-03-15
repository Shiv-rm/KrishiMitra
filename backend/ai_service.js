import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

// Create Gemini instance
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

/**
 * Sends a message and optional base64 image to Gemini and returns the reply.
 */
export async function getGeminiResponse(message, base64Image = null) {
  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    return "Error: GEMINI_API_KEY is not configured on the server.";
  }

  try {
    const contents = [];
    
    // Add text if provided
    if (message) {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    // Add image if provided
    if (base64Image) {
      // Decode the data URL into mimeType and base64 string
      const match = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        
        // If there was no message, we still need a prompt to instruct the model what to do with the image
        if (!message) {
           contents.push({
             role: "user",
             parts: [{ text: "What do you see in this image? Assess any crop diseases or issues if visible." }]
           });
        }
        
        // Push the image part to the same turn
        contents[contents.length - 1].parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
    }

    // A system instruction is helpful for the specific use case
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: "You are KrishiMitra AI, an expert agricultural assistant. Answer questions clearly. If shown an image of a plant, detect any crop diseases and provide concise, practical remedies. Keep responses helpful and easy to read.",
        temperature: 0.7
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my AI service right now. Please try again later.";
  }
}

/**
 * Generates a Resource Management Roadmap for a specific crop and field size.
 * Returns a JSON object containing the timeline and resource requirements.
 */
export async function generateRoadmap(crop, landSize, landUnit = 'acres') {
  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const prompt = `
You are an expert agricultural scientist. A farmer wants to grow "${crop}" on a field of ${landSize} ${landUnit}.
Create a step-by-step Resource Management Roadmap for them. Calculate the estimated required amounts of fertilizers, pesticides, and water for this specific land size.

You MUST respond strictly with valid JSON. Do not use markdown blocks like \`\`\`json. Return only the JSON object.
Format the JSON exactly like this:
{
  "roadmap": [
    {
      "phase": "Pre-sowing",
      "timeline": "Week 1",
      "action": "Soil preparation and base fertilization.",
      "resources": "X kg of NPK fertilizer, Y liters of water"
    },
    {
      "phase": "Growth",
      "timeline": "Week 4-8",
      "action": "Description of action",
      "resources": "Description of resources needed"
    }
  ]
}`;

    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3 }
    });

    // Clean potential markdown blocks
    let rawText = response.text.trim();
    if (rawText.startsWith('```json')) rawText = rawText.slice(7);
    if (rawText.startsWith('```')) rawText = rawText.slice(3);
    if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);

    return JSON.parse(rawText.trim());
  } catch (error) {
    console.error("Gemini Roadmap API Error:", error);
    throw new Error("Failed to generate agricultural roadmap.");
  }
}

/**
 * Analyzes an image of a plant/leaf for diseases/pests using Gemini Vision.
 * Returns a JSON object with disease, analysis, treatments, and prevention.
 */
export async function analyzePestImage(base64Image) {
  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const prompt = `
You are an expert plant pathologist and agrarian scientist. Analyze this image of a plant/leaf.
Identify any diseases, pests, or nutrient deficiencies visible.

You MUST respond strictly with valid JSON. Do not use markdown blocks like \`\`\`json. Return only the JSON object.
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
    let inlineData = null;
    if (match) {
      inlineData = {
        data: match[2],
        mimeType: match[1]
      };
    } else {
        inlineData = {
           data: base64Image,
           mimeType: "image/jpeg"
        };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData }
          ]
        }
      ]
    });

    const text = response.text.trim();
    let jsonString = text;
    if (jsonString.startsWith('\`\`\`json')) {
      jsonString = jsonString.slice(7, -3).trim();
    } else if (jsonString.startsWith('\`\`\`')) {
      jsonString = jsonString.slice(3, -3).trim();
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Pest Analysis Error:", error);
    throw new Error("Failed to analyze image with AI.");
  }
}
