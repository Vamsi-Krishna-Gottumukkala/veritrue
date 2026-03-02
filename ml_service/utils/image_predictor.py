"""
Image Predictor — loads fine-tuned EfficientNet-B0 and classifies images as real/fake.
"""

import io
import os
import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image


LABELS = ["fake", "real"]


class ImagePredictor:
    def __init__(self, model_dir: str):
        model_path = os.path.join(model_dir, "image_model.pt")
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Image model not found at {model_path}. Run train_image.py first."
            )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[ImagePredictor] Loading model from {model_path} on {self.device}")

        # Build EfficientNet-B0 with 2 output classes
        self.model = models.efficientnet_b0(weights=None)
        self.model.classifier[1] = torch.nn.Linear(
            self.model.classifier[1].in_features, 2
        )

        state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])
        print("[ImagePredictor] Model loaded successfully")

    def predict(self, image_bytes: bytes) -> dict:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1)[0]

        predicted_idx = torch.argmax(probs).item()
        label = LABELS[predicted_idx]
        confidence = probs[predicted_idx].item()

        return {
            "label": label,
            "confidence": round(confidence, 4),
            "probabilities": {
                LABELS[i]: round(probs[i].item(), 4) for i in range(len(LABELS))
            },
            "source": "ml_model",
        }

    def predict_frame(self, frame_rgb) -> dict:
        """Predict on an OpenCV frame (numpy array, RGB)."""
        img = Image.fromarray(frame_rgb)
        tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1)[0]

        predicted_idx = torch.argmax(probs).item()
        return {
            "label": LABELS[predicted_idx],
            "confidence": round(probs[predicted_idx].item(), 4),
            "fake_prob": round(probs[0].item(), 4),
        }
