from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, Field

from db.database import get_db
from models.user import User
from utils.auth import get_password_hash, verify_password, create_access_token, decode_token_allow_expired
from api.dependencies import get_current_user_required

router = APIRouter()

security = HTTPBearer(auto_error=False)


class UserRegister(BaseModel):
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$", description="User email address")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class UserLogin(BaseModel):
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$", description="User email address")
    password: str



class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: DBSession = Depends(get_db)):
    """Register a new user and return an access token."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Hash password and save new user
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    token = create_access_token(subject=new_user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user.to_dict()
    }


@router.post("/auth/login", response_model=Token)
def login(credentials: UserLogin, db: DBSession = Depends(get_db)):
    """Authenticate a user and return an access token."""
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # Check password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # Generate token
    token = create_access_token(subject=user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user_required)):
    """Fetch current user's profile details."""
    return current_user.to_dict()


@router.post("/auth/refresh")
def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DBSession = Depends(get_db),
):
    """Refresh an access token.

    Accepts a valid or recently-expired token (within the refresh window)
    and returns a brand-new access token. This prevents users from being
    logged out during Render cold starts or long idle periods.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token_allow_expired(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired beyond refresh window. Please log in again.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Issue fresh token
    new_token = create_access_token(subject=user.id)
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }
