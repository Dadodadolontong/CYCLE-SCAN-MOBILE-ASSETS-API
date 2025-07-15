from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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