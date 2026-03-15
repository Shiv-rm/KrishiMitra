import sys
import joblib
import numpy as np
import os
import warnings
import json
import random
import pandas as pd
warnings.filterwarnings('ignore')

# Path to the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models/crop_recommendation_xgb_model.pkl')

CROP_LABELS = [
    'apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee', 'cotton',
    'grapes', 'jute', 'kidneybeans', 'lentil', 'maize', 'mango', 'mothbeans',
    'mungbean', 'muskmelon', 'orange', 'papaya', 'pigeonpeas', 'pomegranate',
    'rice', 'watermelon'
]

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

        N, P, K, temperature, humidity, ph, rainfall = [float(arg) for arg in sys.argv[1:8]]
        
        NPK_mean = (N + P + K) / 3.0
        THI = (temperature * humidity) / 100.0

        input_data = pd.DataFrame([{
            'N': N,
            'P': P,
            'K': K,
            'temperature': temperature,
            'humidity': humidity,
            'ph': ph,
            'rainfall': rainfall,
            'NPK_mean': NPK_mean,
            'THI': THI
        }])
        
        model = joblib.load(MODEL_PATH)
        proba = model.predict_proba(input_data)[0]
        
        top_n = 2
        ranked_idx = np.argsort(proba)[::-1][:top_n]
        
        recommendations = []
        for idx in ranked_idx:
            c_name = CROP_LABELS[int(idx)]
            conf = float(proba[idx] * 100)
            c_metrics = get_crop_metrics(c_name)
            recommendations.append({
                "crop": c_name,
                "confidence": round(conf, 2),
                **c_metrics
            })
        
        top_crop = recommendations[0]
        
        output = {
            "top_recommendation": top_crop["crop"],
            "top_yield_forecast": top_crop["yield_forecast"],
            "top_profit_margin": top_crop["profit_margin"],
            "top_sustainability_score": top_crop["sustainability_score"],
            "recommendations": recommendations
        }
        
        # Ensures stdout only has valid JSON
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    predict()
