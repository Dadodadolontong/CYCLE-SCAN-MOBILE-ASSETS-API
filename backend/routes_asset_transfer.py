from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import SessionLocal
from schemas import AssetTransferCreate, AssetTransferOut
from services.asset_transfer_service import AssetTransferService
from auth import get_current_user
from typing import List

router = APIRouter(prefix="/asset-transfers", tags=["asset-transfers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=AssetTransferOut)
def create_asset_transfer(
    transfer: AssetTransferCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AssetTransferService(db)
    return service.create_transfer(transfer, created_by=current_user.id)

@router.get("/", response_model=List[AssetTransferOut])
def list_asset_transfers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AssetTransferService(db)
    # Optionally filter by user/role
    return service.list_transfers(user_id=current_user.id, role=getattr(current_user, 'role', None))

@router.get("/{transfer_id}", response_model=AssetTransferOut)
def get_asset_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AssetTransferService(db)
    transfer = service.get_transfer(transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Asset transfer not found")
    return transfer

@router.post("/{transfer_id}/approval")
def add_approval(
    transfer_id: str,
    role: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AssetTransferService(db)
    return service.add_approval(transfer_id, approver_id=current_user.id, role=role)

@router.patch("/approval/{approval_id}")
def update_approval(
    approval_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AssetTransferService(db)
    return service.update_approval(approval_id, status=status) 