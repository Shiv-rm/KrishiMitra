import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

/**
 * Analyzes an image of a crop to predict disease using a pre-trained MobileNetV2 model.
 * 
 * @param {string} imageBase64 - The base64 encoded image data.
 * @param {string} lang - Language for the response (default 'en').
 * @returns {Promise<Object>} - The analysis result from the model.
 */
export async function analyzeCropDiseaseImage(imageBase64, lang = 'en') {
    // 1. Create a unique temporary file path for the image
    const tempDir = os.tmpdir();
    const tempFileName = `crop_disease_${Date.now()}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
        // 2. Decode and save the base64 image to the temp file
        // imageBase64 might contain 'data:image/jpeg;base64,' prefix
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(tempFilePath, buffer);

        // 3. Prepare paths for calling the Python script
        // Note: We use the same virtualenv path pattern as in backend.js
        const pythonPath = path.join(__dirname, '..', '..', 'venv', 'bin', 'python');
        const scriptPath = path.join(__dirname, 'crop_disease_predict.py');

        // 4. Execute the Python script
        console.log(`Running crop disease analysis for: ${tempFilePath}`);
        const { stdout, stderr } = await execPromise(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`);

        if (stderr) {
            console.error("Python Prediction Stderr:", stderr);
        }

        // 5. Parse the JSON result
        let result;
        try {
            result = JSON.parse(stdout.trim());
        } catch (parseError) {
            console.error("Failed to parse Python output:", stdout);
            throw new Error("Invalid output format from prediction model.");
        }

        // 6. Return the diagnostic results
        return {
            status: "success",
            ...result,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error("Crop Disease Service Error:", error);
        throw error;
    } finally {
        // 7. Cleanup: Delete the temporary file
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupError) {
            console.warn("Failed to delete temp image file:", cleanupError.message);
        }
    }
}
