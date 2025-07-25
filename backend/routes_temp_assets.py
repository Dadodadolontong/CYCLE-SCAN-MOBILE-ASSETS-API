from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import TempAsset
from db import SessionLocal
from schemas import TempAssetCreate, TempAssetUpdate, TempAssetOut
from auth import get_current_user, require_any_role

router = APIRouter(prefix="/temp-assets", tags=["temp-assets"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[TempAssetOut])
def list_temp_assets(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(TempAsset).offset(skip).limit(limit).all()

@router.get("/{temp_asset_id}", response_model=TempAssetOut)
def get_temp_asset(
    temp_asset_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    temp_asset = db.query(TempAsset).filter(TempAsset.id == temp_asset_id).first()
    if not temp_asset:
        raise HTTPException(status_code=404, detail="Temp asset not found")
    return temp_asset

@router.post("/", response_model=TempAssetOut)
def create_temp_asset(
    temp_asset: TempAssetCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_temp_asset = TempAsset(**temp_asset.dict(), created_by=current_user.id)
    db.add(db_temp_asset)
    db.commit()
    db.refresh(db_temp_asset)
    return db_temp_asset

@router.put("/{temp_asset_id}", response_model=TempAssetOut)
def update_temp_asset(
    temp_asset_id: str, 
    temp_asset: TempAssetUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_temp_asset = db.query(TempAsset).filter(TempAsset.id == temp_asset_id).first()
    if not db_temp_asset:
        raise HTTPException(status_code=404, detail="Temp asset not found")
    
    # Only allow users to update their own temp assets or admins
    if db_temp_asset.created_by != current_user.id:
        # Check if user has admin role
        from auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Not authorized to update this temp asset")
    
    for key, value in temp_asset.dict(exclude_unset=True).items():
        setattr(db_temp_asset, key, value)
    db.commit()
    db.refresh(db_temp_asset)
    return db_temp_asset

@router.delete("/{temp_asset_id}")
def delete_temp_asset(
    temp_asset_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_temp_asset = db.query(TempAsset).filter(TempAsset.id == temp_asset_id).first()
    if not db_temp_asset:
        raise HTTPException(status_code=404, detail="Temp asset not found")
    
    # Only allow users to delete their own temp assets or admins
    if db_temp_asset.created_by != current_user.id:
        # Check if user has admin role
        from auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Not authorized to delete this temp asset")
    
    db.delete(db_temp_asset)
    db.commit()
    return {"ok": True} 