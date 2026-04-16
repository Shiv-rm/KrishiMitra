import { analyzeCropDiseaseImage } from './crop_disease_service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
    console.log("--- Starting Crop Disease Service Test ---");
    
    // Path to a sample image in your project
    const sampleImagePath = path.join(__dirname, 'sample_cropdisease_dataset', 'Apple___Apple_scab', 'a3824376-87d9-464c-b78e-e35d029d43f2___FREC_Scab 3249.JPG');
    
    if (!fs.existsSync(sampleImagePath)) {
        console.error("Error: Sample image not found at", sampleImagePath);
        return;
    }

    try {
        console.log("Loading sample image and converting to Base64...");
        const imageBuffer = fs.readFileSync(sampleImagePath);
        const imageBase64 = imageBuffer.toString('base64');

        console.log("Calling analyzeCropDiseaseImage service (this may take a few seconds)...");
        const startTime = Date.now();
        const result = await analyzeCropDiseaseImage(imageBase64);
        const duration = (Date.now() - startTime) / 1000;

        console.log("\n--- TEST RESULT ---");
        console.log(`Execution Time: ${duration}s`);
        console.log(JSON.stringify(result, null, 2));
        
        if (result.status === "success" && result.prediction) {
            console.log("\n✅ SERVICE IS WORKING CORRECTLY!");
        } else {
            console.log("\n❌ Service returned something unexpected.");
        }

    } catch (error) {
        console.error("\n❌ TEST FAILED with error:");
        console.error(error);
    }
}

runTest();
