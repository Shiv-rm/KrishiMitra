import sys
import joblib
import numpy as np
import os
import warnings
import json
import random
import pandas as pd

warnings.filterwarnings('ignore')

# Paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'crop_recommendation/newmodels')

# Load XGB model and preprocessors
try:
    XGB_MODEL = joblib.load(os.path.join(MODELS_DIR, 'xgb_model.pkl'))
    LABEL_ENCODER = joblib.load(os.path.join(MODELS_DIR, 'label_encoder.pkl'))
    FEATURE_NAMES = joblib.load(os.path.join(MODELS_DIR, 'feature_names.pkl'))
except Exception as e:
    print(json.dumps({"error": f"Failed to load XGB model or preprocessors: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

def get_crop_metrics(crop_name):
    """Generates mock metrics for demonstrating the UI features."""
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

        # Parse inputs
        N, P, K, temperature, humidity, ph, rainfall = [float(arg) for arg in sys.argv[1:8]]
        
        # Create input dataframe for feature engineering
        input_data = pd.DataFrame([{
            'N': N, 'P': P, 'K': K,
            'temperature': temperature,
            'humidity': humidity,
            'ph': ph,
            'rainfall': rainfall
        }])

        # Feature Engineering (matching the training script)
        input_data['NPK_ratio'] = input_data['N'] / (input_data['P'] + input_data['K'] + 1)
        input_data['total_nutrients'] = input_data['N'] + input_data['P'] + input_data['K']
        input_data['temp_humidity_interaction'] = input_data['temperature'] * input_data['humidity']
        input_data['rainfall_humidity_ratio'] = input_data['rainfall'] / (input_data['humidity'] + 1)

        input_data['N_squared'] = input_data['N'] ** 2
        input_data['P_squared'] = input_data['P'] ** 2
        input_data['K_squared'] = input_data['K'] ** 2

        # Temperature category binning [0, 15, 25, 35, 50]
        # Labels: 0 (Cold), 1 (Moderate), 2 (Warm), 3 (Hot)
        input_data['temp_category'] = pd.cut(
            input_data['temperature'],
            bins=[0, 15, 25, 35, 50],
            labels=[0, 1, 2, 3],
            include_lowest=True
        ).fillna(1) # Default to 'Moderate' if NaN
        
        # Rainfall category binning [0, 50, 100, 150, 300]
        # Labels: 0 (Low), 1 (Medium), 2 (High), 3 (Very_High)
        input_data['rainfall_category'] = pd.cut(
            input_data['rainfall'],
            bins=[0, 50, 100, 150, 300],
            labels=[0, 1, 2, 3],
            include_lowest=True
        ).fillna(1) # Default to 'Medium' if NaN
        
        input_data['temp_category'] = input_data['temp_category'].astype(int)
        input_data['rainfall_category'] = input_data['rainfall_category'].astype(int)

        # Ensure correct feature order
        input_data = input_data[FEATURE_NAMES]

        # Prediction using XGBoost Model (Trained on raw features in the script)
        proba = XGB_MODEL.predict_proba(input_data)[0]
        
        # Get top 3 indices
        top_n = 3
        ranked_idx = np.argsort(proba)[::-1][:top_n]
        
        recommendations = []
        for idx in ranked_idx:
            c_name = LABEL_ENCODER.inverse_transform([int(idx)])[0]
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
        
        # Output result as JSON
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    predict()
