from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from models import Asset
from db import SessionLocal
from schemas import AssetCreate, AssetUpdate, AssetOut
from auth import get_current_user, require_role
from utils import apply_search_filter, apply_filters, paginate_query, get_pagination_info, get_access_scope_for_user

router = APIRouter(prefix="/assets", tags=["assets"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[AssetOut])
def list_assets(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search in name, barcode, model"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Asset)
    # Row-level filtering
    scope = get_access_scope_for_user(db, current_user.id)
    if not scope['is_admin']:
        allowed_location_ids = set(scope['location_ids'])
        query = query.filter(Asset.location.in_(allowed_location_ids))
    # Apply search
    if search:
        query = apply_search_filter(query, search, [Asset.name, Asset.barcode, Asset.model])
    # Apply filters
    filters = {
        'status': status,
        'category': category,
        'location': location
    }
    query = apply_filters(query, filters)
    # Apply pagination
    query = paginate_query(query, skip, limit)
    return query.all()

@router.get("/search", response_model=List[AssetOut])
def search_assets(
    q: str = Query(..., description="Search term"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Advanced search endpoint"""
    query = db.query(Asset)
    query = apply_search_filter(query, q, [Asset.name, Asset.barcode, Asset.model, Asset.erp_asset_id])
    query = paginate_query(query, skip, limit)
    return query.all()

@router.get("/count")
def count_assets(
    search: Optional[str] = Query(None, description="Search in name, barcode, model"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Asset)
    # Row-level filtering
    scope = get_access_scope_for_user(db, current_user.id)
    if not scope['is_admin']:
        allowed_location_ids = set(scope['location_ids'])
        query = query.filter(Asset.location.in_(allowed_location_ids))
    if search:
        query = apply_search_filter(query, search, [Asset.name, Asset.barcode, Asset.model])
    filters = {
        'status': status,
        'category': category,
        'location': location
    }
    query = apply_filters(query, filters)
    count = query.count()
    return {"count": count}

@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("/", response_model=AssetOut)
def create_asset(
    asset: AssetCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    db_asset = Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: str, 
    asset: AssetUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for key, value in asset.dict(exclude_unset=True).items():
        setattr(db_asset, key, value)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(db_asset)
    db.commit()
    return {"ok": True}

@router.get("/barcode/{barcode}", response_model=AssetOut)
def get_asset_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get asset by barcode"""
    asset = db.query(Asset).filter(Asset.barcode == barcode).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset 