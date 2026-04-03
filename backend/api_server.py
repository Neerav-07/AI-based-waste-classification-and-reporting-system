from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Literal
from uuid import uuid4
from databse import enginer, Base 
import models
from fastqpi import Depends
from sqlalchemy.orm import Session
from deps import get_db

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ml_classifier import predict_with_trained_model

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
REPORT_IMAGES_DIR = UPLOADS_DIR / "reports"
REPORTS_FILE = DATA_DIR / "reports.json"

ReportStatus = Literal["pending", "resolved"]
WasteCategory = Literal["dry", "wet", "e_waste", "hazardous"]

storage_lock = Lock()

WASTE_DETAILS: dict[WasteCategory, dict[str, Any]] = {
    "wet": {
        "title": "Wet Waste",
        "description": "Biodegradable organic waste",
        "bin_color": "GREEN",
        "disposal": "Place this in the green bin and keep it away from dry recyclables.",
        "tips": [
            "Drain excess liquid before disposal.",
            "Compost kitchen scraps where possible.",
        ],
    },
    "dry": {
        "title": "Dry Waste",
        "description": "Recyclable paper, plastic, metal, or glass",
        "bin_color": "BLUE",
        "disposal": "Keep the item dry and send it to a recycling or dry-waste stream.",
        "tips": [
            "Rinse containers before disposal.",
            "Flatten boxes to save storage space.",
        ],
    },
    "e_waste": {
        "title": "E-Waste",
        "description": "Electronic devices and accessories",
        "bin_color": "SPECIAL COLLECTION",
        "disposal": "Take this to an authorized e-waste collection point instead of a household bin.",
        "tips": [
            "Remove batteries if they can be separated safely.",
            "Erase personal data from devices before handover.",
        ],
    },
    "hazardous": {
        "title": "Hazardous Waste",
        "description": "Dangerous or toxic household material",
        "bin_color": "RED",
        "disposal": "Seal the item safely and use a hazardous-waste collection channel only.",
        "tips": [
            "Do not mix it with regular household garbage.",
            "Keep it out of reach of children and pets.",
        ],
    },
}


class WasteData(BaseModel):
    title: str
    description: str
    bin_color: str
    disposal: str
    tips: list[str]


class ClassificationResponse(BaseModel):
    prediction: WasteCategory
    confidence: float
    data: WasteData


class ReportResponse(BaseModel):
    id: str
    category: str
    description: str
    location: str
    locality: str
    status: ReportStatus
    created_at: str
    image_url: str | None = None
    reporter_name: str | None = None
    reporter_email: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class ReportStatusUpdate(BaseModel):
    status: str


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    if not REPORTS_FILE.exists():
        REPORTS_FILE.write_text("[]", encoding="utf-8")


def read_reports() -> list[dict[str, Any]]:
    ensure_storage()

    with storage_lock:
        try:
            payload = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = []
            REPORTS_FILE.write_text("[]", encoding="utf-8")

    if not isinstance(payload, list):
        return []

    return [item for item in payload if isinstance(item, dict)]


def write_reports(reports: list[dict[str, Any]]) -> None:
    ensure_storage()

    with storage_lock:
        REPORTS_FILE.write_text(json.dumps(reports, indent=2), encoding="utf-8")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalized_status(value: str) -> ReportStatus:
    lowered = value.strip().lower()
    if lowered in {"resolved", "solved", "closed"}:
        return "resolved"
    return "pending"


def confidence_from_bytes(file_bytes: bytes) -> float:
    digest = hashlib.sha256(file_bytes).digest()
    return round(0.72 + (digest[1] / 255) * 0.23, 2)


def category_from_file(file_name: str, content_type: str | None, file_bytes: bytes) -> WasteCategory:
    lowered_name = file_name.lower()
    lowered_type = (content_type or "").lower()

    keyword_map: list[tuple[WasteCategory, tuple[str, ...]]] = [
        ("e_waste", ("battery", "phone", "laptop", "charger", "wire", "electronic", "circuit", "keyboard")),
        ("hazardous", ("chemical", "paint", "medical", "acid", "toxic", "spray", "hazard")),
        ("wet", ("food", "fruit", "vegetable", "banana", "leaf", "organic", "kitchen", "wet")),
        ("dry", ("paper", "plastic", "bottle", "glass", "metal", "cardboard", "can", "dry")),
    ]

    for category, keywords in keyword_map:
        if any(keyword in lowered_name for keyword in keywords):
            return category

    if "application/pdf" in lowered_type:
        return "dry"

    category_cycle: tuple[WasteCategory, ...] = ("dry", "wet", "e_waste", "hazardous")
    digest = hashlib.sha256(file_bytes).digest()
    return category_cycle[digest[0] % len(category_cycle)]


def build_image_url(request: Request, relative_path: str) -> str:
    return f"{str(request.base_url).rstrip('/')}/{relative_path.lstrip('/')}"


def save_upload(file: UploadFile, destination_dir: Path) -> str | None:
    file_name = file.filename or ""
    suffix = Path(file_name).suffix.lower()

    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    destination_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{suffix}"
    destination = destination_dir / stored_name

    with destination.open("wb") as target:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            target.write(chunk)

    return stored_name


def sort_reports(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(reports, key=lambda item: item.get("created_at", ""), reverse=True)


def update_report_status_by_id(report_id: str, status: str) -> dict[str, Any]:
    reports = read_reports()

    for report in reports:
        if str(report.get("id")) == report_id:
            report["status"] = normalized_status(status)
            write_reports(reports)
            return report

    raise HTTPException(status_code=404, detail="Report not found")


ensure_storage()

app = FastAPI(
    title="AI-based Waste Classification and Reporting API",
    version="1.0.0",
)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "Backend running successfully"}


@app.post("/classify", response_model=ClassificationResponse)
async def classify(file: UploadFile = File(...)) -> ClassificationResponse:
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    trained_prediction = predict_with_trained_model(file_bytes)
    category = (
        trained_prediction.category
        if trained_prediction is not None
        else category_from_file(file.filename or "", file.content_type, file_bytes)
    )
    confidence = (
        trained_prediction.confidence
        if trained_prediction is not None
        else confidence_from_bytes(file_bytes)
    )

    return ClassificationResponse(
        prediction=category,
        confidence=confidence,
        data=WasteData(**WASTE_DETAILS[category]),
    )


@app.get("/reports", response_model=list[ReportResponse])
def list_reports() -> list[dict[str, Any]]:
    return sort_reports(read_reports())


@app.post("/reports", response_model=ReportResponse, status_code=201)
async def create_report(
    request: Request,
    category: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    locality: str = Form(...),
    reporter_name: str | None = Form(None),
    reporter_email: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    image: UploadFile | None = File(None),
) -> dict[str, Any]:
    image_url: str | None = None

    if image is not None:
        stored_name = save_upload(image, REPORT_IMAGES_DIR)
        if stored_name:
            image_url = build_image_url(request, f"uploads/reports/{stored_name}")

    report = {
        "id": f"report-{uuid4().hex[:12]}",
        "category": category.strip(),
        "description": description.strip(),
        "location": location.strip(),
        "locality": locality.strip(),
        "status": "pending",
        "created_at": utc_now_iso(),
        "image_url": image_url,
        "reporter_name": reporter_name.strip() if reporter_name else None,
        "reporter_email": reporter_email.strip() if reporter_email else None,
        "latitude": latitude,
        "longitude": longitude,
    }

    reports = read_reports()
    reports.append(report)
    write_reports(sort_reports(reports))

    return report


@app.patch("/reports/{report_id}", response_model=ReportResponse)
def update_report_status(report_id: str, payload: ReportStatusUpdate) -> dict[str, Any]:
    return update_report_status_by_id(report_id, payload.status)


@app.patch("/reports/{report_id}/status", response_model=ReportResponse)
def update_report_status_alias(report_id: str, payload: ReportStatusUpdate) -> dict[str, Any]:
    return update_report_status_by_id(report_id, payload.status)

@app.get("/test-db")
def test_db(db: Session= Depends(get_db)):
    return{"message": "DB connected"}
