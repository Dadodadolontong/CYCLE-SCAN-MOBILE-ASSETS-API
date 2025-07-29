from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid
from db import SessionLocal
from models import User, UserRole
from schemas import Token, UserCreateWithPassword, UserOutWithRoles
from auth import (
    authenticate_user, 
    create_access_token, 
    get_current_user, 
    get_password_hash,
    get_user_roles,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
import requests
from rauth import OAuth2Service
import rauth
import json
from config import config

router = APIRouter(prefix="/auth", tags=["authentication"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserOutWithRoles)
async def register_user(user_data: UserCreateWithPassword, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    db_user = User(
        id=user_id,
        email=user_data.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    
    # Create default user role
    default_role = UserRole(
        user_id=user_id,
        role="user"
    )
    db.add(default_role)
    
    db.commit()
    db.refresh(db_user)
    
    # Get user roles
    roles = get_user_roles(db, user_id)
    
    return UserOutWithRoles(
        id=db_user.id,
        email=db_user.email,
        roles=roles
    )

@router.get("/me", response_model=UserOutWithRoles)
async def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    roles = get_user_roles(db, current_user.id)
    return UserOutWithRoles(
        id=current_user.id,
        email=current_user.email,
        roles=roles
    ) 

@router.get("/login")
def login():
    state = str(uuid.uuid4())
    
    # Construct the authorization URL manually to ensure the API key is included
    from urllib.parse import urlencode
    
    params = {
        "client_id": config.OAUTH_CLIENT_ID,
        "redirect_uri": config.OAUTH_REDIRECT_URI,
        "scope": config.OAUTH_SCOPES,
        "response_type": "code",
        "state": state,
        "api-key": config.OAUTH_API_KEY
    }
    
    # Build the authorization URL with all parameters
    authorize_url = f"{config.OAUTH_AUTH_URL}?{urlencode(params)}"
    
    print(f"OAuth2 Authorization URL: {authorize_url}")
    print(f"OAuth2 API Key: {config.OAUTH_API_KEY}")
    
    return RedirectResponse(authorize_url)

@router.get("/callback")
def callback(code: str = Query(...), state: str = Query(None)):
    print("OAuth2 callback received:")
    print(f"  Code: {code[:10]}..." if code else "No code")
    print(f"  State: {state}")
    print(f"  Token URL: {config.OAUTH_TOKEN_URL}")
    print(f"  API Key: {config.OAUTH_API_KEY}")
    
    service = OAuth2Service(
        name="custom",
        client_id=config.OAUTH_CLIENT_ID,
        client_secret=config.OAUTH_CLIENT_SECRET,
        authorize_url=config.OAUTH_AUTH_URL,
        access_token_url=config.OAUTH_TOKEN_URL,
        base_url=config.OAUTH_USER_INFO_URL
    )
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config.OAUTH_REDIRECT_URI,
        "client_id": config.OAUTH_CLIENT_ID,
        "client_secret": config.OAUTH_CLIENT_SECRET
    }
    headers = {}
    
    print(f"Token exchange data: {data}")
    
    session = service.get_auth_session(
        data=data,
        decoder=lambda b: json.loads(b.decode()),
        headers=headers
    )
    
    print(f"Token exchange successful, access token: {session.access_token[:20]}..." if session.access_token else "No access token")
    
    # Fetch user info
    userinfo_headers = {"Authorization": f"Bearer {session.access_token}"}
    params = {"api-key": config.OAUTH_API_KEY}
    
    print(f"Fetching user info from: {config.OAUTH_USER_INFO_URL}")
    print(f"User info headers: {userinfo_headers}")
    print(f"User info params: {params}")
    
    userinfo_resp = session.get(config.OAUTH_USER_INFO_URL, headers=userinfo_headers, params=params)
    if not userinfo_resp.ok:
        print(f"User info request failed: {userinfo_resp.status_code} - {userinfo_resp.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
    
    userinfo = userinfo_resp.json()
    print(f"User info received: {userinfo}")
    
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email in user info")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.is_active:
                # Log in the user: issue access token and redirect to frontend dashboard with token
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                from auth import create_access_token
                access_token = create_access_token(
                    data={"sub": user.id}, expires_delta=access_token_expires
                )
                # Redirect to frontend dashboard with token
                return RedirectResponse(
                    url=f"{config.FRONTEND_URL}/dashboard?token={access_token}"
                )
            else:
                # User is not active (locked or pending review)
                return RedirectResponse(
                    url=f"{config.FRONTEND_URL}/auth?message=Your account is pending review by an administrator."
                )
        else:
            import uuid
            user_id = str(uuid.uuid4())
            new_user = User(
                id=user_id,
                email=email,
                display_name=userinfo.get("name", ""),
                is_active=False,
                password_hash="oauth2"  # or "" if you prefer
            )
            db.add(new_user)
            db.add(UserRole(user_id=user_id, role="guest"))
            db.commit()
            return RedirectResponse(
                url=f"{config.FRONTEND_URL}/auth?message=Your account is pending review by an administrator."
            )
    finally:    
        db.close() 