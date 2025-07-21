from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from models import CycleCountItem
from db import SessionLocal
from schemas import CycleCountItemCreate, CycleCountItemUpdate, CycleCountItemOut
from auth import get_current_user, require_any_role, get_user_roles
from services.cycle_count_item_service import CycleCountItemService

router = APIRouter(prefix="/cycle-count-items", tags=["cycle-count-items"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=Dict[str, Any])
def list_cycle_count_items(
    skip: int = 0,
    limit: int = 100,
    task_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountItemService(db)
    return service.list_items(skip=skip, limit=limit, task_id=task_id)

@router.get("/{item_id}", response_model=CycleCountItemOut)
def get_cycle_count_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountItemService(db)
    item = service.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cycle count item not found")
    return item

@router.post("/", response_model=CycleCountItemOut)
def create_cycle_count_item(
    item: CycleCountItemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountItemService(db)
    return service.create_item(item.dict())

@router.put("/{item_id}", response_model=CycleCountItemOut)
def update_cycle_count_item(
    item_id: str,
    item: CycleCountItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountItemService(db)
    try:
        return service.update_item(item_id, item.dict(exclude_unset=True), current_user.id, get_user_roles)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.delete("/{item_id}")
def delete_cycle_count_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_any_role(["admin"]))
):
    service = CycleCountItemService(db)
    try:
        service.delete_item(item_id, current_user, require_any_role)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# Additional endpoint to get items by task (kept for compatibility, but now uses service)
@router.get("/task/{task_id}", response_model=List[CycleCountItemOut])
def get_items_by_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountItemService(db)
    result = service.list_items(task_id=task_id)
    return result["items"] 