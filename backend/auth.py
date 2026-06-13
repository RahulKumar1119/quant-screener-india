"""Authentication module for the Quant Screener India backend.

Provides JWT-based authentication with email/password signup and signin,
using bcrypt for password hashing and DynamoDB for user storage.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import boto3
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ---------------------------------------------------------------------------
# DynamoDB setup
# ---------------------------------------------------------------------------

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
users_table = dynamodb.Table("quant-screener-users")

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/auth")

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(default="", max_length=30)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserProfile(BaseModel):
    email: str
    user_id: str
    created_at: str


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------


def create_token(email: str, user_id: str) -> str:
    """Generate a JWT token with HS256 algorithm and 24-hour expiry."""
    payload = {
        "email": email,
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def get_token_from_header(request: Request) -> str:
    """Extract Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return auth_header[7:]  # Strip "Bearer " prefix


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/signup", status_code=201)
async def signup(req: SignUpRequest) -> AuthResponse:
    """Register a new user with email and password.

    Checks DynamoDB for existing user, hashes password with bcrypt,
    stores user record, and returns a JWT access token.
    """
    # Check if user already exists
    response = users_table.get_item(Key={"email": req.email})
    existing = response.get("Item")
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Create user
    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    created_at = datetime.now(timezone.utc).isoformat()

    username = req.username.strip() or req.email.split("@")[0]

    users_table.put_item(
        Item={
            "email": req.email,
            "user_id": user_id,
            "username": username,
            "password_hash": password_hash,
            "created_at": created_at,
        }
    )

    token = create_token(req.email, user_id)
    return AuthResponse(token=token, user={"email": req.email, "user_id": user_id, "username": username})


@router.post("/signin")
async def signin(req: SignInRequest) -> AuthResponse:
    """Authenticate a user with email and password.

    Validates credentials against DynamoDB, verifies bcrypt hash,
    and returns a JWT access token.
    """
    response = users_table.get_item(Key={"email": req.email})
    item = response.get("Item")

    if not item:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Verify password hash
    stored_hash = item["password_hash"].encode("utf-8")
    if not bcrypt.checkpw(req.password.encode("utf-8"), stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(req.email, item["user_id"])
    return AuthResponse(token=token, user={"email": req.email, "user_id": item["user_id"], "username": item.get("username", req.email.split("@")[0])})


@router.get("/me")
async def get_me(request: Request) -> UserProfile:
    """Validate JWT from Authorization header and return user profile.

    Decodes the token and fetches the user record from DynamoDB.
    """
    token = get_token_from_header(request)
    payload = decode_token(token)

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    # Fetch user from DynamoDB to get created_at
    response = users_table.get_item(Key={"email": email})
    item = response.get("Item")

    if not item:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return UserProfile(
        email=item["email"],
        user_id=item["user_id"],
        created_at=item.get("created_at", ""),
    )
