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
from oauth import (
    OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, OAUTH2_AUTH_URL,
    OAUTH2_TOKEN_URL, OAUTH2_USERINFO_URL, OAUTH2_SCOPES, OAUTH2_REDIRECT_URI, CUSTOM_LOAD,OAUTH2_API_KEY
)
import requests
from rauth import OAuth2Service
import json
from config import config

router = APIRouter(prefix="/auth", tags=["authentication"])

# OAuth2 service configuration using config
oauth_service = rauth.OAuth2Service(
    client_id=config.OAUTH_CLIENT_ID,
    client_secret=config.OAUTH_CLIENT_SECRET,
    name="dexanpassport",
    authorize_url=config.OAUTH_AUTH_URL,
    access_token_url=config.OAUTH_TOKEN_URL,
    base_url="https://dexanpassport.com"
)

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
    service = OAuth2Service(
        name="custom",
        client_id=OAUTH2_CLIENT_ID,
        client_secret=OAUTH2_CLIENT_SECRET,
        authorize_url=OAUTH2_AUTH_URL,
        access_token_url=OAUTH2_TOKEN_URL,
        base_url=OAUTH2_USERINFO_URL  # Not always used, but required by rauth
    )
    params = {
        "client_id": OAUTH2_CLIENT_ID,
        "redirect_uri": OAUTH2_REDIRECT_URI,
        "scope": OAUTH2_SCOPES,
        "response_type": "code",
        "state": state,
        "api-key": OAUTH2_API_KEY
    }
    authorize_url = service.get_authorize_url(**params)
    return RedirectResponse(authorize_url)

@router.get("/callback")
def callback(code: str = Query(...), state: str = Query(None)):
    print("OAuth2 state received:", state)
    service = OAuth2Service(
        name="custom",
        client_id=OAUTH2_CLIENT_ID,
        client_secret=OAUTH2_CLIENT_SECRET,
        authorize_url=OAUTH2_AUTH_URL,
        access_token_url=OAUTH2_TOKEN_URL,
        base_url=OAUTH2_USERINFO_URL
    )
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": OAUTH2_REDIRECT_URI,
        "client_id": OAUTH2_CLIENT_ID,
        "client_secret": OAUTH2_CLIENT_SECRET
    }
    headers = {}
    
    session = service.get_auth_session(
        data=data,
        decoder=lambda b: json.loads(b.decode()),
        headers=headers
    )
    # Fetch user info
    userinfo_headers = {"Authorization": f"Bearer {session.access_token}"}
    params = {"api-key": OAUTH2_API_KEY}
    
    userinfo_resp = session.get(OAUTH2_USERINFO_URL, headers=userinfo_headers, params=params)
    if not userinfo_resp.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
    userinfo = userinfo_resp.json()
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
                    url=f"http://localhost:8080/dashboard?token={access_token}"
                )
            else:
                # User is not active (locked or pending review)
                return RedirectResponse(
                    url="http://localhost:8080/auth?message=Your account is pending review by an administrator."
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
                url="http://localhost:8080/auth?message=Your account is pending review by an administrator."
            )
    finally:    
        db.close() 