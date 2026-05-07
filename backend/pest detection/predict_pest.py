import sys
import os
import torch
import torch.nn as nn
from PIL import Image
import numpy as np
import json
import timm
import albumentations as A
from albumentations.pytorch import ToTensorV2

# Define constants (matching training notebook)
IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Sorted class names (must exactly match the order from training)
CLASS_NAMES = [
    "Cashew anthracnose",
    "Cashew gumosis",
    "Cashew healthy",
    "Cashew leaf miner",
    "Cashew red rust",
    "Cassava bacterial blight",
    "Cassava brown spot",
    "Cassava green mite",
    "Cassava healthy",
    "Cassava mosaic",
    "Maize fall armyworm",
    "Maize grasshoper",
    "Maize healthy",
    "Maize leaf beetle",
    "Maize leaf blight",
    "Maize leaf spot",
    "Maize streak virus",
    "Tomato healthy",
    "Tomato leaf blight",
    "Tomato leaf curl",
    "Tomato septoria leaf spot",
    "Tomato verticulium wilt"
]

# Replicate Model Architecture
class CropPestNet(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        # Use efficientnet_b2 as backbone (stripped of head)
        self.backbone = timm.create_model(
            'efficientnet_b2',
            pretrained=False,
            num_classes=0
        )
        num_features = self.backbone.num_features # 1408
        
        # Head as defined in the notebook
        self.head = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(512, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)

def predict(image_path, model_path):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Load model
    num_classes = len(CLASS_NAMES)
    model = CropPestNet(num_classes)
    
    try:
        # Load state dict (checkpoint is a dictionary containing 'model_state')
        checkpoint = torch.load(model_path, map_location=device)
        if 'model_state' in checkpoint:
            model.load_state_dict(checkpoint['model_state'])
        else:
            model.load_state_dict(checkpoint)
        
        model.to(device)
        model.eval()
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        return

    # Image Preprocessing
    transform = A.Compose([
        A.Resize(IMG_SIZE, IMG_SIZE),
        A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ToTensorV2(),
    ])

    try:
        image = Image.open(image_path).convert('RGB')
        image_np = np.array(image)
        input_tensor = transform(image=image_np)['image'].unsqueeze(0).to(device)
    except Exception as e:
        print(json.dumps({"error": f"Failed to process image: {str(e)}"}))
        return

    # Inference
    with torch.no_grad():
        logits = model(input_tensor)
        probabilities = torch.softmax(logits, dim=1)[0]
        conf, pred_idx = torch.max(probabilities, dim=0)
        
        prediction = CLASS_NAMES[pred_idx.item()]
        confidence = float(conf.item())

    # Return result
    print(json.dumps({
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "status": "success"
    }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
        
    img_path = sys.argv[1]
    # Default model path
    mod_path = os.path.join(os.path.dirname(__file__), "pest_detection_model.pth")
    
    if len(sys.argv) > 2:
        mod_path = sys.argv[2]
        
    if not os.path.exists(mod_path):
        print(json.dumps({"error": f"Model not found at {mod_path}"}))
        sys.exit(1)
        
    predict(img_path, mod_path)
