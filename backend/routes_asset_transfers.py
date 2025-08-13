from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from db import SessionLocal
from auth import get_current_user
from services.asset_transfer_service import AssetTransferService

router = APIRouter(prefix="/asset-transfers", tags=["asset-transfers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
async def create_transfer(
    source_location_id: str = Form(...),
    destination_location_id: str = Form(...),
    barcodes: str = Form(...),  # JSON string array
    photo1: Optional[UploadFile] = File(None),
    photo2: Optional[UploadFile] = File(None),
    photo3: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    photos: List[UploadFile] = [p for p in [photo1, photo2, photo3] if p is not None]
    return await AssetTransferService(db).create_transfer(
        current_user.id,
        source_location_id,
        destination_location_id,
        barcodes,
        photos,
    )

