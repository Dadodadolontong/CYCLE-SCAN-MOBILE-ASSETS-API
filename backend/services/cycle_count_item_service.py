from sqlalchemy.orm import Session, selectinload
from models import CycleCountItem, Asset
from typing import Optional, Dict, Any, List

class CycleCountItemService:
    def __init__(self, db: Session):
        self.db = db

    def list_items(self, skip: int = 0, limit: int = 100, task_id: Optional[str] = None) -> Dict[str, Any]:
        """List items with pagination and optional task_id filter, joined with asset details."""
        query = self.db.query(CycleCountItem).options(selectinload(CycleCountItem.asset))
        if task_id:
            query = query.filter(CycleCountItem.task_id == task_id)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        # Serialize items with asset details
        result = []
        for item in items:
            item_dict = item.__dict__.copy()
            if hasattr(item, 'asset') and item.asset:
                asset_dict = item.asset.__dict__.copy()
                asset_dict.pop('_sa_instance_state', None)
                item_dict['asset'] = asset_dict
            item_dict.pop('_sa_instance_state', None)
            result.append(item_dict)
        return {"items": result, "total": total}

    def get_item(self, item_id: str) -> Optional[CycleCountItem]:
        """Get a single item by ID."""
        return self.db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()

    def create_item(self, item_data: dict) -> CycleCountItem:
        """Create a new cycle count item."""
        db_item = CycleCountItem(**item_data)
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def update_item(self, item_id: str, updates: dict, current_user_id: str, get_user_roles) -> CycleCountItem:
        """Update a cycle count item if authorized."""
        db_item = self.db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()
        if not db_item:
            raise Exception("Cycle count item not found")
        # Add any necessary permission checks here
        for key, value in updates.items():
            setattr(db_item, key, value)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def delete_item(self, item_id: str, current_user, require_any_role) -> bool:
        """Delete a cycle count item if authorized."""
        db_item = self.db.query(CycleCountItem).filter(CycleCountItem.id == item_id).first()
        if not db_item:
            raise Exception("Cycle count item not found")
        # Only admins can delete
        require_any_role(["admin"])(current_user)
        self.db.delete(db_item)
        self.db.commit()
        return True 