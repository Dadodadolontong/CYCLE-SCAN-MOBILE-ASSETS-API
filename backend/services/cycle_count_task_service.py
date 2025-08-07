from sqlalchemy.orm import Session
from models import CycleCountTask, Asset, CycleCountItem
from typing import Optional, Dict, Any
from datetime import datetime

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
        
        # Allow task creators, assignees, or users with appropriate roles to update
        user_roles = get_user_roles(self.db, current_user_id)       
        
        can_update = (
            db_task.created_by == current_user_id or 
            db_task.assigned_to == current_user_id or 
            "admin" in user_roles or 
            "manager" in user_roles or 
            "controller" in user_roles
        )       
        
        if not can_update:
            raise Exception("Not authorized to update this task")
        
        # Check if task is being completed
        is_being_completed = (
            updates.get('status') == 'completed' and 
            db_task.status != 'completed'
        )
        
        # Apply updates
        for key, value in updates.items():
            setattr(db_task, key, value)
        
        # If task is being completed, insert missing assets
        if is_being_completed and db_task.location_filter:
            missing_count = self._insert_missing_assets(
                task_id=task_id,
                location_filter=db_task.location_filter,
                category_filter=db_task.category_filter
            )
            print(f"Inserted {missing_count} missing assets for completed task {task_id}")
        
        self.db.commit()
        self.db.refresh(db_task)
        return db_task

    def _insert_missing_assets(self, task_id: str, location_filter: str, category_filter: Optional[str] = None) -> int:
        """Insert missing assets into cycle count items when task is completed."""
        # Get all assets that match the task's location and category filters
        query = self.db.query(Asset).filter(Asset.location == location_filter)
        
        if category_filter:
            query = query.filter(Asset.category == category_filter)
        
        # Get all assets in scope for this task
        assets_in_scope = query.all()
        
        # Get all assets that have already been counted for this task
        counted_asset_ids = set(
            item.asset_id for item in 
            self.db.query(CycleCountItem).filter(CycleCountItem.task_id == task_id).all()
        )
        
        # Find assets that haven't been counted (missing assets)
        missing_assets = [asset for asset in assets_in_scope if asset.id not in counted_asset_ids]
        
        # Insert missing assets as cycle count items with 'missing' status
        missing_items = []
        for asset in missing_assets:
            missing_item = CycleCountItem(
                task_id=task_id,
                asset_id=asset.id,
                expected_location=asset.location,
                status='missing',
                actual_location=asset.location,
                counted_at=None,
                counted_by=None,
                notes='Automatically marked as missing when task was completed'
            )
            missing_items.append(missing_item)
        
        if missing_items:
            self.db.add_all(missing_items)
            self.db.commit()
        
        return len(missing_items)

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