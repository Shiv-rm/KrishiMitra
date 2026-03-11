import joblib
import sys
import json
import os
import warnings

# Suppress warnings like InconsistentVersionWarning to keep stdout/stderr clean
warnings.filterwarnings("ignore")

# Alphabetical mapping used by LabelEncoder on the standard crop dataset
CROP_MAP = {
    0: 'apple', 1: 'banana', 2: 'blackgram', 3: 'chickpea', 4: 'coconut',
    5: 'coffee', 6: 'cotton', 7: 'grapes', 8: 'jute', 9: 'kidneybeans',
    10: 'lentil', 11: 'maize', 12: 'mango', 13: 'mothbeans', 14: 'mungbean',
    15: 'muskmelon', 16: 'orange', 17: 'papaya', 18: 'pigeonpeas',
    19: 'pomegranate', 20: 'rice', 21: 'watermelon'
}

def load_model():
    model_path = 'crop_recommendation_model.pkl'
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    try:
        # Try joblib first
        return joblib.load(model_path)
    except Exception as e:
        # Fallback to pickle (though joblib is usually better for scikit-learn)
        import pickle
        with open(model_path, 'rb') as f:
            return pickle.load(f)

def predict(data):
    model = load_model()
    
    # Expected order: N, P, K, temperature, humidity, ph, rainfall
    features = [
        float(data['N']),
        float(data['P']),
        float(data['K']),
        float(data['temperature']),
        float(data['humidity']),
        float(data['ph']),
        float(data['rainfall'])
    ]
    
    # NOTE: The training code used StandardScaler.
    # To get accurate results, the user SHOULD save their scaler in Colab and load it here.
    # For now, we use the raw features as requested.
    
    prediction = model.predict([features])
    label_idx = int(prediction[0])
    
    # Return mapping if possible, otherwise return label
    return CROP_MAP.get(label_idx, str(label_idx))

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        result = predict(input_data)
        # ONLY print the final result to stdout
        print(result)
    except Exception as e:
        # Print error details to stderr
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
