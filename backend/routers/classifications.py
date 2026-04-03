# routers/classifications.py

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
from deps import get_db, get_current_user
import crud, schemas, models
import shutil, os, uuid

router = APIRouter(prefix="/classify", tags=["Classification"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_image(file: UploadFile) -> tuple[str, bytes]:
    """
    Saves uploaded image to disk and also returns raw bytes.
    We need bytes for the ML model, and the path to store in DB.
    """
    ext      = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Read bytes first
    file_bytes = file.file.read()

    # Save to disk
    with open(filepath, "wb") as buffer:
        buffer.write(file_bytes)

    return filepath, file_bytes


@router.post("/", response_model=schemas.ClassificationResponse)
def classify_image(
    image       : UploadFile | None = File(None),
    file        : UploadFile | None = File(None),
    db          : Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    upload = image or file

    if upload is None:
        raise HTTPException(status_code=422, detail="Image upload is required")

    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Save image and get bytes
    image_url, file_bytes = save_image(upload)

    # Run ML classifier
    try:
        from ml_classifier import get_model_status, predict_with_trained_model

        model_status = get_model_status()
        if not bool(model_status.get("ready")):
            raise HTTPException(
                status_code=503,
                detail=str(model_status.get("reason") or "AI model is not ready.")
            )

        result = predict_with_trained_model(file_bytes)

        if result is None:
            raise HTTPException(
                status_code=422,
                detail="Could not classify image. Make sure it is a valid image."
            )

        predicted_class = result.category    # ← .category not ["class"]
        confidence      = result.confidence  # ← .confidence same name

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    # Save result to DB
    record = crud.create_classification(
        db,
        user_id         = current_user.id,
        predicted_class = predicted_class,
        confidence      = confidence,
        image_url       = image_url
    )
    return record


@router.get("/my", response_model=List[schemas.ClassificationResponse])
def get_my_classifications(
    db          : Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_classifications_by_user(db, current_user.id)
