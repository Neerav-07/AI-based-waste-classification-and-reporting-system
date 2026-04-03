# routers/reports.py

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from deps import get_db, get_current_user
import crud, schemas, models
import shutil, os, uuid

router = APIRouter(prefix="/reports", tags=["Reports"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_image(file: UploadFile) -> str:
    ext      = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return filepath


@router.post("/", response_model=schemas.ReportResponse)
def create_report(
    location    : str                  = Form(...),
    description : Optional[str]        = Form(None),
    image       : Optional[UploadFile] = File(None),
    db          : Session              = Depends(get_db),
    current_user: models.User          = Depends(get_current_user)
):
    image_url = None
    if image:
        image_url = save_image(image)
    data   = schemas.ReportCreate(location=location, description=description)
    report = crud.create_report(db, data, current_user.id, image_url)
    return report


@router.get("/my", response_model=List[schemas.ReportResponse])
def get_my_reports(
    db          : Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_reports_by_user(db, current_user.id)


@router.get("/locality", response_model=List[schemas.ReportResponse])
def get_locality_reports(
    locality    : str,
    db          : Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_reports_by_locality(db, locality)


@router.get("/locality/stats", response_model=List[schemas.LocalityStatResponse])
def get_locality_stats(
    db          : Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_all_locality_stats(db)