from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import Country
from db import SessionLocal
from schemas import CountryCreate, CountryUpdate, CountryOut
from auth import get_current_user

router = APIRouter(prefix="/countries", tags=["countries"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[CountryOut])
def list_countries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Country).offset(skip).limit(limit).all()

@router.get("/{country_id}", response_model=CountryOut)
def get_country(country_id: str, db: Session = Depends(get_db)):
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country

@router.post("/", response_model=CountryOut)
def create_country(country: CountryCreate, db: Session = Depends(get_db)):
    db_country = Country(**country.dict())
    db.add(db_country)
    db.commit()
    db.refresh(db_country)
    return db_country

@router.put("/{country_id}", response_model=CountryOut)
def update_country(country_id: str, country: CountryUpdate, db: Session = Depends(get_db)):
    db_country = db.query(Country).filter(Country.id == country_id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    for key, value in country.dict(exclude_unset=True).items():
        setattr(db_country, key, value)
    db.commit()
    db.refresh(db_country)
    return db_country

@router.delete("/{country_id}")
def delete_country(country_id: str, db: Session = Depends(get_db)):
    db_country = db.query(Country).filter(Country.id == country_id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    db.delete(db_country)
    db.commit()
    return {"ok": True} 