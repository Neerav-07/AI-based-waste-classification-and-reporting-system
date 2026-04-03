# routers/admin.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from deps import get_db, get_current_admin
import crud, schemas

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/reports", response_model=List[schemas.ReportResponse])
def get_all_reports(
    skip        : int     = 0,
    limit       : int     = 50,
    db          : Session = Depends(get_db),
    current_admin         = Depends(get_current_admin)
):
    return crud.get_all_reports(db, skip=skip, limit=limit)


@router.patch("/reports/{report_id}/status", response_model=schemas.ReportResponse)
def update_status(
    report_id   : int,
    data        : schemas.ReportStatusUpdate,
    db          : Session = Depends(get_db),
    current_admin         = Depends(get_current_admin)
):
    return crud.update_report_status(db, report_id, data)


@router.get("/analytics", response_model=List[schemas.LocalityStatResponse])
def get_analytics(
    db          : Session = Depends(get_db),
    current_admin         = Depends(get_current_admin)
):
    return crud.get_all_locality_stats(db)