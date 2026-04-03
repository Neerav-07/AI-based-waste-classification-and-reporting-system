# routers/auth.py

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from deps import get_db, get_current_user
import crud, schemas

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=schemas.UserResponse)
def signup(data: schemas.SignupRequest, db: Session = Depends(get_db)):
    user = crud.create_user(db, data)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2PasswordRequestForm gives us username + password fields.
    Swagger's Authorize form works with this automatically.
    We treat 'username' as email.
    """
    data  = schemas.LoginRequest(email=form_data.username, password=form_data.password)
    user  = crud.authenticate_user(db, data)
    token = crud.create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(
    db          : Session = Depends(get_db),
    current_user          = Depends(get_current_user)
):
    return current_user