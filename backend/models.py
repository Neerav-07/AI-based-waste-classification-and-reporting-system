# models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

# ─── Enum Types ────────────────────────────────────────────────
# These restrict the column to specific allowed values only

class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"

class ReportStatus(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"

class WasteClass(str, enum.Enum):
    dry = "dry"
    wet = "wet"
    e_waste = "e_waste"
    hazardous = "hazardous"


# ─── Users Table ───────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, index=True, nullable=False)
    password   = Column(String, nullable=False)          # stored as bcrypt hash
    role       = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships — lets you do user.reports or user.classifications
    reports         = relationship("Report", back_populates="user")
    classifications = relationship("Classification", back_populates="user")


# ─── Reports Table ─────────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url   = Column(String, nullable=True)
    location    = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(Enum(ReportStatus), default=ReportStatus.pending, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Link back to the user who created this report
    user = relationship("User", back_populates="reports")


# ─── Classifications Table ─────────────────────────────────────
class Classification(Base):
    __tablename__ = "classifications"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url       = Column(String, nullable=True)
    predicted_class = Column(Enum(WasteClass), nullable=False)
    confidence      = Column(Float, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # Link back to the user who triggered this classification
    user = relationship("User", back_populates="classifications")

# ─── Locality Stats Table ──────────────────────────────────────
class LocalityStat(Base):
    __tablename__ = "locality_stats"

    id               = Column(Integer, primary_key=True, index=True)
    locality_name    = Column(String, nullable=False, unique=True)
    total_reports    = Column(Integer, default=0, nullable=False)
    resolved_reports = Column(Integer, default=0, nullable=False)
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())