# schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models import UserRole, ReportStatus, WasteClass


# ─────────────────────────────────────────────
# AUTH SCHEMAS
# ─────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.user

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─────────────────────────────────────────────
# USER SCHEMAS
# ─────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# REPORT SCHEMAS
# ─────────────────────────────────────────────

class ReportCreate(BaseModel):
    location: str
    description: Optional[str] = None

class ReportStatusUpdate(BaseModel):
    status: ReportStatus

class ReportResponse(BaseModel):
    id: int
    user_id: int
    image_url: Optional[str]
    location: str
    description: Optional[str]
    status: ReportStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# CLASSIFICATION SCHEMAS
# ─────────────────────────────────────────────

class ClassificationResponse(BaseModel):
    id: int
    user_id: int
    image_url: Optional[str]
    predicted_class: WasteClass
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# LOCALITY STATS SCHEMAS
# ─────────────────────────────────────────────

class LocalityStatResponse(BaseModel):
    id: int
    locality_name: str
    total_reports: int
    resolved_reports: int
    updated_at: datetime

    class Config:
        from_attributes = True