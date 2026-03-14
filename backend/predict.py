import sys
import joblib
import numpy as np
import os
import warnings
import json
import random

warnings.filterwarnings('ignore')

# Path to the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'crop_recommendation_model.pkl')

CROP_LABELS = [
    'apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee', 'cotton',
    'grapes', 'jute', 'kidneybeans', 'lentil', 'maize', 'mango', 'mothbeans',
    'mungbean', 'muskmelon', 'orange', 'papaya', 'pigeonpeas', 'pomegranate',
    'rice', 'watermelon'
]

SCALER_MEAN = np.array([50.5518, 53.3622, 48.1490, 25.6162, 71.4818, 6.4694, 103.4635])
SCALER_STD  = np.array([36.9173, 32.9859, 50.6479,  5.0637, 22.2638,  0.7739,  54.9583])

def scale_input(features):
    return (features - SCALER_MEAN) / SCALER_STD

def get_crop_metrics(crop_name):
    # Mocking yield (tons/acre), profit margin (%), sustainability score (0-100)
    # Give some determinism using the hash of crop_name
    random.seed(crop_name)
    yield_val = round(random.uniform(1.5, 8.5), 1)
    profit = round(random.uniform(20.0, 65.0), 1)
    sustainability = random.randint(60, 95)
    
    return {
        "yield_forecast": f"{yield_val} tons/acre",
        "profit_margin": f"{profit}%",
        "sustainability_score": f"{sustainability}/100"
    }

def predict():
    try:
        if len(sys.argv) < 8:
            print(json.dumps({"error": "Expected 7 parameters: N P K temperature humidity ph rainfall"}), file=sys.stderr)
            sys.exit(1)

        raw = np.array([float(arg) for arg in sys.argv[1:8]])
        scaled = scale_input(raw).reshape(1, -1)
        model = joblib.load(MODEL_PATH)
        pred_index = model.predict(scaled)[0]
        crop_name = CROP_LABELS[int(pred_index)]
        
        metrics = get_crop_metrics(crop_name)
        
        output = {
            "recommendation": crop_name,
            **metrics
        }
        
        # Ensures stdout only has valid JSON
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    predict()
