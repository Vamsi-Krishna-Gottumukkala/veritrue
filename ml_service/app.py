"""
VeriTrue ML Microservice
FastAPI server hosting text, image, and video classification models.
"""

import io
import os
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.text_predictor import TextPredictor
from utils.image_predictor import ImagePredictor
from utils.video_predictor import VideoPredictor

app = FastAPI(title="VeriTrue ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Lazy-loaded predictors
text_predictor: TextPredictor | None = None
image_predictor: ImagePredictor | None = None
video_predictor: VideoPredictor | None = None


def get_text_predictor() -> TextPredictor:
    global text_predictor
    if text_predictor is None:
        text_predictor = TextPredictor(MODEL_DIR)
    return text_predictor


def get_image_predictor() -> ImagePredictor:
    global image_predictor
    if image_predictor is None:
        image_predictor = ImagePredictor(MODEL_DIR)
    return image_predictor


def get_video_predictor() -> VideoPredictor:
    global video_predictor
    if video_predictor is None:
        video_predictor = VideoPredictor(get_image_predictor())
    return video_predictor


# ---------- Request / Response schemas ----------

class TextRequest(BaseModel):
    text: str


class PredictionResponse(BaseModel):
    label: str
    confidence: float
    probabilities: dict
    source: str = "ml_model"


class VideoPredictionResponse(BaseModel):
    label: str
    confidence: float
    frame_count: int
    fake_frame_count: int
    frame_scores: list
    source: str = "ml_model"


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {"status": "ok", "models_dir": MODEL_DIR}


@app.post("/predict/text", response_model=PredictionResponse)
async def predict_text(req: TextRequest):
    try:
        predictor = get_text_predictor()
        result = predictor.predict(req.text)
        return PredictionResponse(**result)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/image", response_model=PredictionResponse)
async def predict_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        predictor = get_image_predictor()
        result = predictor.predict(contents)
        return PredictionResponse(**result)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/video", response_model=VideoPredictionResponse)
async def predict_video(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        predictor = get_video_predictor()
        result = predictor.predict(contents)
        return VideoPredictionResponse(**result)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
