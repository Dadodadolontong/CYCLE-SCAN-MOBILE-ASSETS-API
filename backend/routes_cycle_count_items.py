from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import CycleCountItem
from db import SessionLocal
from schemas import CycleCountItemCreate, CycleCountItemUpdate, CycleCountItemOut
from auth import get_current_user, require_any_role

router = APIRouter(prefix="/cycle-count-items", tags=["cycle-count-items"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[CycleCountItemOut])
def list_cycle_count_items(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(CycleCountItem).offset(skip).limit(limit).all()

@router.get("/{item_id}", response_model=CycleCountItemOut)
def get_cycle_count_item(
    item_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    item = db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cycle count item not found")
    return item

@router.post("/", response_model=CycleCountItemOut)
def create_cycle_count_item(
    item: CycleCountItemCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_item = CycleCountItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=CycleCountItemOut)
def update_cycle_count_item(
    item_id: str, 
    item: CycleCountItemUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_item = db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cycle count item not found")
    
    # Update counted_by when status changes to 'counted'
    if item.status == 'counted' and not db_item.counted_by:
        item.counted_by = current_user.id
    
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_cycle_count_item(
    item_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(require_any_role(["admin"]))
):
    db_item = db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cycle count item not found")
    db.delete(db_item)
    db.commit()
    return {"ok": True}

# Additional endpoint to get items by task
@router.get("/task/{task_id}", response_model=List[CycleCountItemOut])
def get_items_by_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    items = db.query(CycleCountItem).filter(CycleCountItem.task_id == task_id).all()
    return items 