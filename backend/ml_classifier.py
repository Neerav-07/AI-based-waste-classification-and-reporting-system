from __future__ import annotations

import json
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from threading import Lock

try:
    import numpy as np
    from PIL import Image, ImageFile, UnidentifiedImageError
    from tensorflow import keras
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
except Exception:  # pragma: no cover - optional at runtime until ML deps are installed
    np = None
    Image = None
    ImageFile = None
    UnidentifiedImageError = Exception
    keras = None
    preprocess_input = None

if ImageFile is not None:
    ImageFile.LOAD_TRUNCATED_IMAGES = True

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "ai" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "waste_mobilenetv2.keras"
METADATA_PATH = ARTIFACTS_DIR / "waste_classifier_metadata.json"

bundle_lock = Lock()
model_bundle: tuple[object, dict[str, object]] | None = None


@dataclass
class TrainedPrediction:
    category: str
    confidence: float


def trained_model_ready() -> bool:
    return bool(keras and np and MODEL_PATH.exists() and METADATA_PATH.exists())


def load_model_bundle() -> tuple[object, dict[str, object]] | None:
    global model_bundle

    if not trained_model_ready():
        return None

    with bundle_lock:
        if model_bundle is None:
            metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            model = keras.models.load_model(MODEL_PATH)
            model_bundle = (model, metadata)

    return model_bundle


def predict_with_trained_model(file_bytes: bytes) -> TrainedPrediction | None:
    bundle = load_model_bundle()
    if not bundle or not np or not Image or not preprocess_input:
        return None

    model, metadata = bundle
    image_size = int(metadata.get("image_size", 224))
    class_names = metadata.get("class_names", [])

    try:
        with Image.open(BytesIO(file_bytes)) as image:
            image = image.convert("RGB").resize((image_size, image_size))
            array = np.asarray(image, dtype="float32")
    except (UnidentifiedImageError, OSError, ValueError):
        return None

    batch = np.expand_dims(array, axis=0)
    batch = preprocess_input(batch)
    scores = model.predict(batch, verbose=0)[0]
    best_index = int(np.argmax(scores))

    if best_index >= len(class_names):
        return None

    return TrainedPrediction(
        category=str(class_names[best_index]),
        confidence=float(scores[best_index]),
    )
