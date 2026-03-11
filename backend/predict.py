import sys
import joblib
import numpy as np
import os
import warnings

warnings.filterwarnings('ignore')

# Path to the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'crop_recommendation_model.pkl')

# LabelEncoder encodes alphabetically, so the mapping is:
# ( from: atharvaingle/crop-recommendation-dataset on Kaggle, 22 crops )
CROP_LABELS = [
    'apple',        # 0
    'banana',       # 1
    'blackgram',    # 2
    'chickpea',     # 3
    'coconut',      # 4
    'coffee',       # 5
    'cotton',       # 6
    'grapes',       # 7
    'jute',         # 8
    'kidneybeans',  # 9
    'lentil',       # 10
    'maize',        # 11
    'mango',        # 12
    'mothbeans',    # 13
    'mungbean',     # 14
    'muskmelon',    # 15
    'orange',       # 16
    'papaya',       # 17
    'pigeonpeas',   # 18
    'pomegranate',  # 19
    'rice',         # 20
    'watermelon',   # 21
]

# StandardScaler statistics from the Crop Recommendation dataset
# (training set statistics from atharvaingle/crop-recommendation-dataset)
# Feature order: N, P, K, temperature, humidity, ph, rainfall
SCALER_MEAN = np.array([50.5518, 53.3622, 48.1490, 25.6162, 71.4818, 6.4694, 103.4635])
SCALER_STD  = np.array([36.9173, 32.9859, 50.6479,  5.0637, 22.2638,  0.7739,  54.9583])

def scale_input(features):
    return (features - SCALER_MEAN) / SCALER_STD

def predict():
    try:
        if len(sys.argv) < 8:
            print("Error: Expected 7 parameters: N P K temperature humidity ph rainfall", file=sys.stderr)
            sys.exit(1)

        # Parse inputs: N, P, K, temperature, humidity, ph, rainfall
        raw = np.array([float(arg) for arg in sys.argv[1:8]])

        # Scale using training dataset statistics
        scaled = scale_input(raw).reshape(1, -1)

        # Load model and predict
        model = joblib.load(MODEL_PATH)
        pred_index = model.predict(scaled)[0]

        crop_name = CROP_LABELS[int(pred_index)]
        print(crop_name)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    predict()
