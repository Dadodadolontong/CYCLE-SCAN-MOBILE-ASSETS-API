from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models import CycleCountTask
from db import SessionLocal
from schemas import CycleCountTaskCreate, CycleCountTaskUpdate, CycleCountTaskOut
from auth import get_current_user, require_any_role

router = APIRouter(prefix="/cycle-count-tasks", tags=["cycle-count-tasks"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[CycleCountTaskOut])
def list_cycle_count_tasks(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(CycleCountTask).offset(skip).limit(limit).all()

@router.get("/{task_id}", response_model=CycleCountTaskOut)
def get_cycle_count_task(
    task_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    task = db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Cycle count task not found")
    return task

@router.post("/", response_model=CycleCountTaskOut)
def create_cycle_count_task(
    task: CycleCountTaskCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_task = CycleCountTask(**task.dict(), created_by=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{task_id}", response_model=CycleCountTaskOut)
def update_cycle_count_task(
    task_id: str, 
    task: CycleCountTaskUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_task = db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Cycle count task not found")
    
    # Only allow task creators, assignees, or admins to update
    if db_task.created_by != current_user.id and db_task.assigned_to != current_user.id:
        # Check if user has admin role
        from auth import get_user_roles
        user_roles = get_user_roles(db, current_user.id)
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}")
def delete_cycle_count_task(
    task_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(require_any_role(["admin"]))
):
    db_task = db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Cycle count task not found")
    db.delete(db_task)
    db.commit()
    return {"ok": True} 