from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from models import Asset
from utils import get_access_scope_for_user, apply_search_filter, apply_filters, paginate_query

class AssetService:
    def __init__(self, db: Session):
        self.db = db

    def list_assets(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        location: Optional[str] = None
    ) -> List[Asset]:
        query = self.db.query(Asset)
        # Row-level filtering
        scope = get_access_scope_for_user(self.db, user_id)
        if not scope['is_admin']:
            allowed_location_ids = set(scope['location_ids'])
            query = query.filter(Asset.location.in_(allowed_location_ids))
        # Apply search
        if search:
            query = apply_search_filter(query, search, [Asset.name, Asset.barcode, Asset.model])
        # Apply filters
        filters = {
            'status': status,
            'category': category,
            'location': location
        }
        query = apply_filters(query, filters)
        # Apply pagination
        query = paginate_query(query, skip, limit)
        return query.all()

    def count_assets(
        self,
        user_id: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        location: Optional[str] = None
    ) -> int:
        query = self.db.query(Asset)
        # Row-level filtering
        scope = get_access_scope_for_user(self.db, user_id)
        if not scope['is_admin']:
            allowed_location_ids = set(scope['location_ids'])
            query = query.filter(Asset.location.in_(allowed_location_ids))
        # Apply search
        if search:
            query = apply_search_filter(query, search, [Asset.name, Asset.barcode, Asset.model])
        # Apply filters
        filters = {
            'status': status,
            'category': category,
            'location': location
        }
        query = apply_filters(query, filters)
        return query.count() 