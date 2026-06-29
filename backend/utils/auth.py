"""Authentication Utilities — helpers for hashing passwords and generating JWT tokens."""

from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from config import settings

# Setup password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Generate a JWT access token for a subject (usually user ID)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "iat": now}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token_allow_expired(token: str) -> dict | None:
    """Decode a JWT token, allowing expired tokens within the refresh window.

    Returns the payload if the token is valid or recently expired (within
    REFRESH_TOKEN_WINDOW_MINUTES). Returns None if the token is malformed
    or expired beyond the refresh window.
    """
    try:
        # First try normal decode
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        # Token is expired — check if within refresh window
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False},
            )
            exp = payload.get("exp")
            if exp:
                expired_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                now = datetime.now(timezone.utc)
                window = timedelta(minutes=settings.REFRESH_TOKEN_WINDOW_MINUTES)
                if now - expired_at <= window:
                    return payload  # Within refresh window
            return None
        except JWTError:
            return None
    except JWTError:
        return None
