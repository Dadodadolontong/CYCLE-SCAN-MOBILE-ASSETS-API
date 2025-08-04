from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from db import SessionLocal
from services.location_service import LocationService
from auth import require_role, get_current_user
from typing import Optional

router = APIRouter(prefix="/locations", tags=["locations"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Country endpoints
@router.get("/countries")
def list_countries(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return LocationService(db).list_countries(user_id=current_user.id)

@router.post("/countries")
def create_country(
    name: str = Body(...),
    code: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).create_country(name, code)

@router.put("/countries/{country_id}")
def update_country(
    country_id: str,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).update_country(country_id, updates)

@router.delete("/countries/{country_id}")
def delete_country(
    country_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).delete_country(country_id)

# Region endpoints
@router.get("/regions")
def list_regions(
    country_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return LocationService(db).list_regions(user_id=current_user.id, country_id=country_id)

@router.post("/regions")
def create_region(
    name: str = Body(...),
    country_id: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).create_region(name, country_id)

@router.put("/regions/{region_id}")
def update_region(
    region_id: str,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).update_region(region_id, updates)

@router.delete("/regions/{region_id}")
def delete_region(
    region_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).delete_region(region_id)

# Branch endpoints
@router.get("/branches")
def list_branches(
    region_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return LocationService(db).list_branches(user_id=current_user.id, region_id=region_id, search=search, skip=skip, limit=limit)

@router.post("/branches")
def create_branch(
    name: str = Body(...),
    region_id: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).create_branch(name, region_id)

@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: str,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).update_branch(branch_id, updates)

@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).delete_branch(branch_id)

@router.get("")
def list_locations(
    branch_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return LocationService(db).list_locations(user_id=current_user.id, branch_id=branch_id, search=search, skip=skip, limit=limit)

@router.post("")
def create_location(
    name: str = Body(...),
    description: Optional[str] = Body(None),
    erp_location_id: Optional[str] = Body(None),
    branch_id: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).create_location(name, description, erp_location_id, branch_id)

@router.put("/{location_id}")
def update_location(
    location_id: str,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).update_location(location_id, updates)

@router.delete("/{location_id}")
def delete_location(
    location_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return LocationService(db).delete_location(location_id) 