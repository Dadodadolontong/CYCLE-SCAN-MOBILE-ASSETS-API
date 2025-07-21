from sqlalchemy.orm import Session
from models import CycleCountTask
from typing import Optional, Dict, Any

class CycleCountTaskService:
    def __init__(self, db: Session):
        self.db = db

    def list_tasks(self, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> Dict[str, Any]:
        """List tasks with pagination and optional status filter."""
        query = self.db.query(CycleCountTask)
        if status and status != 'all':
            query = query.filter(CycleCountTask.status == status)
        total = query.count()
        print(limit, status)
        items = query.offset(skip).limit(limit).all()
        return {"items": items, "total": total}

    def get_task(self, task_id: str) -> Optional[CycleCountTask]:
        """Get a single task by ID."""
        return self.db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()

    def create_task(self, task_data: dict, created_by: str) -> CycleCountTask:
        """Create a new cycle count task."""
        db_task = CycleCountTask(**task_data, created_by=created_by)
        self.db.add(db_task)
        self.db.commit()
        self.db.refresh(db_task)
        return db_task

    def update_task(self, task_id: str, updates: dict, current_user_id: str, get_user_roles) -> CycleCountTask:
        """Update a cycle count task if authorized."""
        db_task = self.db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()
        if not db_task:
            raise Exception("Cycle count task not found")
        # Only allow task creators, assignees, or admins to update
        if db_task.created_by != current_user_id and db_task.assigned_to != current_user_id:
            user_roles = get_user_roles(self.db, current_user_id)
            if "admin" not in user_roles:
                raise Exception("Not authorized to update this task")
        for key, value in updates.items():
            setattr(db_task, key, value)
        self.db.commit()
        self.db.refresh(db_task)
        return db_task

    def delete_task(self, task_id: str, current_user, require_any_role) -> bool:
        """Delete a cycle count task if authorized."""
        db_task = self.db.query(CycleCountTask).filter(CycleCountTask.id == task_id).first()
        if not db_task:
            raise Exception("Cycle count task not found")
        # Only admins can delete
        require_any_role(["admin"])(current_user)
        self.db.delete(db_task)
        self.db.commit()
        return True 