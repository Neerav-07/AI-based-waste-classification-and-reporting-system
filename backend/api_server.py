# api_server.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from database import Base, engine
import models  # noqa: F401
import os

load_dotenv()

from routers import admin, auth, classifications, reports

APP_ENV = os.getenv("APP_ENV", "development")
IS_DEV = APP_ENV == "development"

app = FastAPI(
    title="Waste Classification API",
    version="1.0.0",
    docs_url="/docs" if IS_DEV else None,
    redoc_url="/redoc" if IS_DEV else None,
)

origins = [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://127.0.0.1:8081",
    "exp://localhost:8081",
    "http://10.0.2.2:8000",
]
origin_regex = r"^(https?|exp)://([A-Za-z0-9.-]+)(:\d+)?$" if IS_DEV else None

if not IS_DEV:
    frontend_url = os.getenv("FRONTEND_URL", "")
    if frontend_url:
        origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(classifications.router)
app.include_router(admin.router)


@app.get("/")
def root():
    from ml_classifier import get_model_status

    model_status = get_model_status()
    return {
        "message": "Waste Classification API is running",
        "version": "1.0.0",
        "env": APP_ENV,
        "model_ready": model_status["ready"],
        "model_status": model_status["reason"],
    }
