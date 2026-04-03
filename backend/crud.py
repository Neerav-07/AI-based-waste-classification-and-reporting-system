# crud.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import os
from dotenv import load_dotenv

import models
import schemas

load_dotenv()

SECRET_KEY                 = os.getenv("SECRET_KEY")
ALGORITHM                  = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# bcrypt context for hashing and verifying passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ═══════════════════════════════════════════════════════════════
# AUTH UTILITIES
# ═══════════════════════════════════════════════════════════════

def hash_password(plain_password: str) -> str:
    """Converts plain text password into a bcrypt hash."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if a plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    """
    Creates a JWT token containing the user's id and role.
    Token expires after ACCESS_TOKEN_EXPIRE_MINUTES minutes.
    """
    expire  = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub" : str(user_id),      # subject — who this token belongs to
        "role": role,         # stored so we can check admin/user quickly
        "exp" : expire        # expiry time
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ═══════════════════════════════════════════════════════════════
# USER CRUD
# ═══════════════════════════════════════════════════════════════

def get_user_by_email(db: Session, email: str):
    """Fetch a single user by their email address."""
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    """Fetch a single user by their ID."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, data: schemas.SignupRequest):
    """
    Creates a new user after checking email isn't already taken.
    Password is hashed before saving.
    """
    # Check if email already exists
    existing = get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    new_user = models.User(
        name     = data.name,
        email    = data.email,
        password = hash_password(data.password),
        role     = data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)   # refreshes the object with DB-generated values (id, created_at)
    return new_user


def authenticate_user(db: Session, data: schemas.LoginRequest):
    """
    Verifies email exists and password is correct.
    Returns the user object if valid, raises 401 if not.
    """
    user = get_user_by_email(db, data.email)

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    return user


# ═══════════════════════════════════════════════════════════════
# REPORT CRUD
# ═══════════════════════════════════════════════════════════════

def create_report(
    db       : Session,
    data     : schemas.ReportCreate,
    user_id  : int,
    image_url: str = None
):
    """Creates a new garbage report linked to the logged-in user."""
    report = models.Report(
        user_id     = user_id,
        image_url   = image_url,
        location    = data.location,
        description = data.description,
        status      = models.ReportStatus.pending
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # After creating a report, update locality stats
    update_locality_stats(db, data.location)

    return report


def get_all_reports(db: Session, skip: int = 0, limit: int = 50):
    """
    Returns all reports — used by admin.
    skip + limit allow pagination (e.g. skip=0, limit=20 → first page).
    """
    return (
        db.query(models.Report)
        .order_by(models.Report.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_reports_by_user(db: Session, user_id: int):
    """Returns all reports filed by a specific user — personal history."""
    return (
        db.query(models.Report)
        .filter(models.Report.user_id == user_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )


def get_reports_by_locality(db: Session, locality: str):
    """
    Returns all reports where location matches the given locality.
    Uses ilike for case-insensitive partial matching.
    """
    return (
        db.query(models.Report)
        .filter(models.Report.location.ilike(f"%{locality}%"))
        .order_by(models.Report.created_at.desc())
        .all()
    )


def update_report_status(
    db       : Session,
    report_id: int,
    data     : schemas.ReportStatusUpdate
):
    """
    Admin updates a report's status to resolved or pending.
    Also keeps locality_stats in sync.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    old_status = report.status
    report.status = data.status
    db.commit()
    db.refresh(report)

    # Sync locality stats whenever status changes
    sync_locality_resolved_count(db, report.location)

    return report


# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION CRUD
# ═══════════════════════════════════════════════════════════════

def create_classification(
    db             : Session,
    user_id        : int,
    predicted_class: str,
    confidence     : float,
    image_url      : str = None
):
    """Saves an AI classification result linked to the user."""
    record = models.Classification(
        user_id         = user_id,
        image_url       = image_url,
        predicted_class = predicted_class,
        confidence      = confidence
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_classifications_by_user(db: Session, user_id: int):
    """Returns all classifications triggered by a specific user."""
    return (
        db.query(models.Classification)
        .filter(models.Classification.user_id == user_id)
        .order_by(models.Classification.created_at.desc())
        .all()
    )


# ═══════════════════════════════════════════════════════════════
# LOCALITY STATS CRUD
# ═══════════════════════════════════════════════════════════════

def update_locality_stats(db: Session, locality: str):
    """
    Called every time a new report is created.
    If locality exists in stats → increment total_reports.
    If not → create a new row for it.
    """
    stat = (
        db.query(models.LocalityStat)
        .filter(models.LocalityStat.locality_name == locality)
        .first()
    )

    if stat:
        stat.total_reports += 1
    else:
        stat = models.LocalityStat(
            locality_name    = locality,
            total_reports    = 1,
            resolved_reports = 0
        )
        db.add(stat)

    db.commit()


def sync_locality_resolved_count(db: Session, locality: str):
    """
    Called whenever a report status changes.
    Recounts resolved reports from scratch to stay accurate.
    """
    resolved_count = (
        db.query(func.count(models.Report.id))
        .filter(
            models.Report.location == locality,
            models.Report.status   == models.ReportStatus.resolved
        )
        .scalar()
    )

    stat = (
        db.query(models.LocalityStat)
        .filter(models.LocalityStat.locality_name == locality)
        .first()
    )

    if stat:
        stat.resolved_reports = resolved_count
        db.commit()


def get_all_locality_stats(db: Session):
    """Returns all locality stats — used in admin analytics dashboard."""
    return (
        db.query(models.LocalityStat)
        .order_by(models.LocalityStat.total_reports.desc())
        .all()
    )


def get_locality_stat_by_name(db: Session, locality: str):
    """Returns stats for a single locality by exact name."""
    return (
        db.query(models.LocalityStat)
        .filter(models.LocalityStat.locality_name == locality)
        .first()
    )