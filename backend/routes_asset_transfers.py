from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.orm import Session
from db import SessionLocal
from auth import get_current_user
from services.asset_transfer_service import AssetTransferService
from services.workflow_service import WorkflowService

router = APIRouter(prefix="/asset-transfers", tags=["asset-transfers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("")
async def create_transfer(
    source_branch_id: str = Form(...),
    destination_branch_id: str = Form(...),
    barcodes: str = Form(...),  # JSON string array
    remarks: Optional[str] = Form(None),
    photo1: Optional[UploadFile] = File(None),
    photo2: Optional[UploadFile] = File(None),
    photo3: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    photos: List[UploadFile] = [p for p in [photo1, photo2, photo3] if p is not None]
    created = await AssetTransferService(db).create_transfer(
        current_user.id,
        source_branch_id,
        destination_branch_id,
        barcodes,
        photos,
        remarks,
    )
    # Trigger workflow instance for this transfer
    instance_info = None
    try:
        instance_info = WorkflowService(db).trigger('asset_transfer', created['transfer_number'], getattr(current_user, 'email', None), 0, None)
    except Exception:
        instance_info = None
    if isinstance(created, dict) and instance_info:
        created['instance_id'] = instance_info.get('instance_id')
    return created

@router.get("")
def list_transfers(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return AssetTransferService(db).list_transfers(user_id=current_user.id, skip=skip, limit=limit)

@router.get("/{transfer_id}")
def get_transfer(transfer_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return AssetTransferService(db).get_transfer_details(transfer_id)

