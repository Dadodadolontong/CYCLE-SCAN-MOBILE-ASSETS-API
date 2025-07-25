from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import UserRole
from db import SessionLocal
from schemas import UserRoleCreate, UserRoleUpdate, UserRoleOut
from auth import get_current_user

router = APIRouter(prefix="/user-roles", tags=["user-roles"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[UserRoleOut])
def list_user_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(UserRole).offset(skip).limit(limit).all()

@router.get("/{user_role_id}", response_model=UserRoleOut)
def get_user_role(user_role_id: str, db: Session = Depends(get_db)):
    user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not user_role:
        raise HTTPException(status_code=404, detail="User role not found")
    return user_role

@router.post("/", response_model=UserRoleOut)
def create_user_role(user_role: UserRoleCreate, db: Session = Depends(get_db)):
    db_user_role = UserRole(**user_role.dict())
    db.add(db_user_role)
    db.commit()
    db.refresh(db_user_role)
    return db_user_role

@router.put("/{user_role_id}", response_model=UserRoleOut)
def update_user_role(user_role_id: str, user_role: UserRoleUpdate, db: Session = Depends(get_db)):
    db_user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not db_user_role:
        raise HTTPException(status_code=404, detail="User role not found")
    for key, value in user_role.dict(exclude_unset=True).items():
        setattr(db_user_role, key, value)
    db.commit()
    db.refresh(db_user_role)
    return db_user_role

@router.delete("/{user_role_id}")
def delete_user_role(user_role_id: str, db: Session = Depends(get_db)):
    db_user_role = db.query(UserRole).filter(UserRole.id == user_role_id).first()
    if not db_user_role:
        raise HTTPException(status_code=404, detail="User role not found")
    db.delete(db_user_role)
    db.commit()
    return {"ok": True} 