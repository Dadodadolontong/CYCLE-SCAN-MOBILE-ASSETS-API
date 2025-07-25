from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import Region
from db import SessionLocal
from schemas import RegionCreate, RegionUpdate, RegionOut
from auth import get_current_user

router = APIRouter(prefix="/regions", tags=["regions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[RegionOut])
def list_regions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Region).offset(skip).limit(limit).all()

@router.get("/{region_id}", response_model=RegionOut)
def get_region(region_id: str, db: Session = Depends(get_db)):
    region = db.query(Region).filter(Region.id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return region

@router.post("/", response_model=RegionOut)
def create_region(region: RegionCreate, db: Session = Depends(get_db)):
    db_region = Region(**region.dict())
    db.add(db_region)
    db.commit()
    db.refresh(db_region)
    return db_region

@router.put("/{region_id}", response_model=RegionOut)
def update_region(region_id: str, region: RegionUpdate, db: Session = Depends(get_db)):
    db_region = db.query(Region).filter(Region.id == region_id).first()
    if not db_region:
        raise HTTPException(status_code=404, detail="Region not found")
    for key, value in region.dict(exclude_unset=True).items():
        setattr(db_region, key, value)
    db.commit()
    db.refresh(db_region)
    return db_region

@router.delete("/{region_id}")
def delete_region(region_id: str, db: Session = Depends(get_db)):
    db_region = db.query(Region).filter(Region.id == region_id).first()
    if not db_region:
        raise HTTPException(status_code=404, detail="Region not found")
    db.delete(db_region)
    db.commit()
    return {"ok": True} 