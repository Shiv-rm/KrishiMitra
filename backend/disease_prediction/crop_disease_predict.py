import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# Suppress TensorFlow logging to keep stdout clean for JSON
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Set path to the model file
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'mobilenet_crop_disease_final.keras')

# Class names in alphabetical order (matches Keras image_dataset_from_directory)
CLASS_NAMES = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
    'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight',
    'Potato___Late_blight', 'Potato___healthy', 'Raspberry___healthy', 'Soybean___healthy',
    'Squash___Powdery_mildew', 'Strawberry___Leaf_scorch', 'Strawberry___healthy',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
]

def load_model():
    """Loads the pre-trained Keras model."""
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        return model
    except Exception as e:
        error_msg = {"error": f"Failed to load model from {MODEL_PATH}: {str(e)}"}
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

def run_prediction(img_path):
    """Loads image, pre-processes it, and runs prediction."""
    model = load_model()
    
    try:
        # Load and resize image to 128x128
        img = image.load_img(img_path, target_size=(128, 128))
        img_array = image.img_to_array(img)
        
        # Preprocess input as required by MobileNetV2
        img_preprocessed = preprocess_input(img_array)
        img_batch = np.expand_dims(img_preprocessed, axis=0)
        
        # Run inference
        # model.predict returns probabilities since the last layer is softmax
        predictions = model.predict(img_batch, verbose=0)[0]
        
        # Get the top prediction
        top_idx = np.argmax(predictions)
        confidence = float(predictions[top_idx])
        
        # Get top 5 classes for additional context
        top_5_indices = np.argsort(predictions)[::-1][:5]
        all_predictions = [
            {"label": CLASS_NAMES[i], "confidence": round(float(predictions[i]) * 100, 2)}
            for i in top_5_indices
        ]
        
        result = {
            "prediction": CLASS_NAMES[top_idx],
            "confidence": round(float(confidence) * 100, 2),
            "top_predictions": all_predictions
        }
        
        # Output result as JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = {"error": f"Prediction process failed: {str(e)}"}
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python3 crop_disease_predict.py <image_path>"}), file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image path {image_path} does not exist."}), file=sys.stderr)
        sys.exit(1)
        
    run_prediction(image_path)
