from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from models import CycleCountTask
from db import SessionLocal
from schemas import CycleCountTaskCreate, CycleCountTaskUpdate, CycleCountTaskOut
from auth import get_current_user, require_any_role, get_user_roles
from services.cycle_count_task_service import CycleCountTaskService

router = APIRouter(prefix="/cycle-count-tasks", tags=["cycle-count-tasks"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=Dict[str, Any])
def list_cycle_count_tasks(
    skip: int = 0,
    limit: int = 100,
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountTaskService(db)
    result = service.list_tasks(skip=skip, limit=limit, status=status)
    items = [CycleCountTaskOut.model_validate(item) for item in result["items"]]
    return {"items": items, "total": result["total"]}

@router.get("/{task_id}", response_model=CycleCountTaskOut)
def get_cycle_count_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Cycle count task not found")
    return task

@router.post("/", response_model=CycleCountTaskOut)
def create_cycle_count_task(
    task: CycleCountTaskCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountTaskService(db)
    return service.create_task(task.dict(), created_by=current_user.id)

@router.put("/{task_id}", response_model=CycleCountTaskOut)
def update_cycle_count_task(
    task_id: str,
    task: CycleCountTaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = CycleCountTaskService(db)
    try:
        return service.update_task(task_id, task.dict(exclude_unset=True), current_user.id, get_user_roles)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.delete("/{task_id}")
def delete_cycle_count_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_any_role(["admin"]))
):
    service = CycleCountTaskService(db)
    try:
        service.delete_task(task_id, current_user, require_any_role)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) 