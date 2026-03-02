"""
Video Predictor — extracts frames from video, detects faces, and classifies
each face using the image model. Aggregates into a per-video verdict.
"""

import io
import os
import tempfile
import cv2
import numpy as np
from utils.image_predictor import ImagePredictor


class VideoPredictor:
    def __init__(self, image_predictor: ImagePredictor):
        self.image_predictor = image_predictor
        # OpenCV face detector (Haar cascade)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        print("[VideoPredictor] Initialized with face cascade")

    def predict(self, video_bytes: bytes) -> dict:
        # Write video to temp file (OpenCV needs file path)
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0

            # Sample 1 frame per second
            sample_interval = max(1, int(fps))
            frame_scores = []
            frame_idx = 0
            fake_count = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % sample_interval == 0:
                    # Detect faces
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    faces = self.face_cascade.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
                    )

                    timestamp = round(frame_idx / fps, 1) if fps > 0 else frame_idx

                    if len(faces) > 0:
                        # Classify the largest face
                        largest = max(faces, key=lambda f: f[2] * f[3])
                        x, y, w, h = largest

                        # Add margin
                        margin = int(max(w, h) * 0.2)
                        x1 = max(0, x - margin)
                        y1 = max(0, y - margin)
                        x2 = min(frame.shape[1], x + w + margin)
                        y2 = min(frame.shape[0], y + h + margin)

                        face_crop = frame[y1:y2, x1:x2]
                        face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)

                        result = self.image_predictor.predict_frame(face_rgb)
                        result["timestamp"] = timestamp
                        result["face_detected"] = True
                        frame_scores.append(result)

                        if result["label"] == "fake":
                            fake_count += 1
                    else:
                        # No face detected in this frame
                        frame_scores.append({
                            "label": "unknown",
                            "confidence": 0.0,
                            "fake_prob": 0.0,
                            "timestamp": timestamp,
                            "face_detected": False,
                        })

                frame_idx += 1

            cap.release()

            # Aggregate results
            scored_frames = [f for f in frame_scores if f["face_detected"]]
            total_scored = len(scored_frames)

            if total_scored == 0:
                return {
                    "label": "unknown",
                    "confidence": 0.0,
                    "frame_count": len(frame_scores),
                    "fake_frame_count": 0,
                    "frame_scores": frame_scores,
                    "source": "ml_model",
                }

            fake_ratio = fake_count / total_scored
            avg_fake_prob = np.mean([f["fake_prob"] for f in scored_frames])

            if fake_ratio > 0.5:
                label = "fake"
                confidence = round(float(avg_fake_prob), 4)
            else:
                label = "real"
                confidence = round(1.0 - float(avg_fake_prob), 4)

            return {
                "label": label,
                "confidence": confidence,
                "frame_count": len(frame_scores),
                "fake_frame_count": fake_count,
                "frame_scores": frame_scores,
                "source": "ml_model",
            }
        finally:
            os.unlink(tmp_path)
