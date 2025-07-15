from typing import Optional, Dict, Any
from sqlalchemy.orm import Query
from sqlalchemy import or_, and_
from models import UserRole, UserCountryAssignment, UserRegionAssignment, UserBranchAssignment, Country, Region, Branch, Location

def apply_search_filter(query: Query, search_term: Optional[str], search_fields: list) -> Query:
    """Apply search filter to a query"""
    if search_term:
        search_conditions = []
        for field in search_fields:
            search_conditions.append(field.ilike(f"%{search_term}%"))
        query = query.filter(or_(*search_conditions))
    return query

def apply_filters(query: Query, filters: Dict[str, Any]) -> Query:
    """Apply multiple filters to a query"""
    for field, value in filters.items():
        if value is not None:
            if hasattr(query.column_descriptions[0]['entity'], field):
                query = query.filter(getattr(query.column_descriptions[0]['entity'], field) == value)
    return query

def paginate_query(query: Query, skip: int = 0, limit: int = 100) -> Query:
    """Apply pagination to a query"""
    return query.offset(skip).limit(limit)

def get_pagination_info(total_count: int, skip: int, limit: int) -> Dict[str, Any]:
    """Get pagination metadata"""
    return {
        "total": total_count,
        "skip": skip,
        "limit": limit,
        "page": (skip // limit) + 1,
        "total_pages": (total_count + limit - 1) // limit,
        "has_next": skip + limit < total_count,
        "has_prev": skip > 0
    }

def get_access_scope_for_user(db, user_id: str):
    """
    Returns a dict with lists of accessible country_ids, region_ids, branch_ids, and location_ids for the user.
    Admins get all. Others get only what is assigned to them (and children).
    """
    # Get user roles
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    roles = [r.role for r in user_roles]
    is_admin = 'admin' in roles

    # If admin, return all
    if is_admin:
        country_ids = [c.id for c in db.query(Country.id).all()]
        region_ids = [r.id for r in db.query(Region.id).all()]
        branch_ids = [b.id for b in db.query(Branch.id).all()]
        location_ids = [l.id for l in db.query(Location.id).all()]
        return {
            'country_ids': country_ids,
            'region_ids': region_ids,
            'branch_ids': branch_ids,
            'location_ids': location_ids,
            'is_admin': True
        }

    # Otherwise, build access scope
    country_ids = set()
    region_ids = set()
    branch_ids = set()
    location_ids = set()

    # Accounting manager: assigned countries
    if 'accounting_manager' in roles:
        assigned_countries = db.query(UserCountryAssignment.country_id).filter(UserCountryAssignment.user_id == user_id).all()
        for (country_id,) in assigned_countries:
            country_ids.add(country_id)
            # All regions in country
            for region in db.query(Region).filter(Region.country_id == country_id):
                region_ids.add(region.id)
                # All branches in region
                for branch in db.query(Branch).filter(Branch.region_id == region.id):
                    branch_ids.add(branch.id)
                    # All locations in branch
                    for location in db.query(Location).filter(Location.branch_id == branch.id):
                        location_ids.add(location.id)

    # Controller: assigned regions
    if 'controller' in roles:
        assigned_regions = db.query(UserRegionAssignment.region_id).filter(UserRegionAssignment.user_id == user_id).all()
        for (region_id,) in assigned_regions:
            region_ids.add(region_id)
            region = db.query(Region).filter(Region.id == region_id).first()
            if region:
                country_ids.add(region.country_id)
            # All branches in region
            for branch in db.query(Branch).filter(Branch.region_id == region_id):
                branch_ids.add(branch.id)
                # All locations in branch
                for location in db.query(Location).filter(Location.branch_id == branch.id):
                    location_ids.add(location.id)

    # Manager/user: assigned branches
    if 'manager' in roles or 'user' in roles:
        assigned_branches = db.query(UserBranchAssignment.branch_id).filter(UserBranchAssignment.user_id == user_id).all()
        for (branch_id,) in assigned_branches:
            branch_ids.add(branch_id)
            branch = db.query(Branch).filter(Branch.id == branch_id).first()
            if branch:
                region_ids.add(branch.region_id)
                if branch.country_id:
                    country_ids.add(branch.country_id)
            # All locations in branch
            for location in db.query(Location).filter(Location.branch_id == branch_id):
                location_ids.add(location.id)

    return {
        'country_ids': list(country_ids),
        'region_ids': list(region_ids),
        'branch_ids': list(branch_ids),
        'location_ids': list(location_ids),
        'is_admin': False
    } 