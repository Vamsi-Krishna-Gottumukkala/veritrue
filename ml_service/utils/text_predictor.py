"""
Text Predictor — loads fine-tuned DistilBERT and classifies text as real/fake.
"""

import os
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification


LABELS = ["fake", "real"]


class TextPredictor:
    def __init__(self, model_dir: str):
        model_path = os.path.join(model_dir, "text_model")
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Text model not found at {model_path}. Run train_text.py first."
            )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[TextPredictor] Loading model from {model_path} on {self.device}")

        self.tokenizer = DistilBertTokenizer.from_pretrained(model_path)
        self.model = DistilBertForSequenceClassification.from_pretrained(model_path)
        self.model.to(self.device)
        self.model.eval()
        print("[TextPredictor] Model loaded successfully")

    def predict(self, text: str) -> dict:
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256,
            padding="max_length",
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)[0]

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
