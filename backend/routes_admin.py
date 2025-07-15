from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from models import User, UserRole, Asset, Location, SyncLog
from db import SessionLocal
from auth import require_role
from services.user_service import UserService
from services.asset_service import AssetService

router = APIRouter(prefix="/admin", tags=["admin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats/users")
def get_user_stats(db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get user statistics for admin dashboard"""
    try:
        user_service = UserService(db)
        return user_service.get_user_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user stats: {str(e)}")

@router.get("/stats/data")
def get_data_stats(db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get data statistics for admin dashboard"""
    try:
        # Count assets and locations with row-level filtering
        asset_service = AssetService(db)
        total_assets = asset_service.count_assets(user_id=current_user.id)
        total_locations = db.query(func.count(Location.id)).scalar()
        # Get recent sync logs
        recent_syncs = db.query(SyncLog).order_by(SyncLog.started_at.desc()).limit(5).all()
        sync_data = []
        for sync in recent_syncs:
            sync_data.append({
                "id": sync.id,
                "sync_type": sync.sync_type,
                "status": sync.status,
                "started_at": sync.started_at.isoformat() if sync.started_at is not None else None,
                "completed_at": sync.completed_at.isoformat() if sync.completed_at is not None else None,
                "records_processed": sync.records_processed,
                "error_message": sync.error_details
            })
        return {
            "total_assets": total_assets,
            "total_locations": total_locations,
            "recent_syncs": sync_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data stats: {str(e)}")

@router.get("/stats/overview")
def get_system_overview(db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get complete system overview for admin dashboard"""
    try:
        user_service = UserService(db)
        user_stats = user_service.get_user_stats()
        
        # Data stats
        total_assets = db.query(func.count(Asset.id)).scalar()
        total_locations = db.query(func.count(Location.id)).scalar()
        
        # Recent sync logs
        recent_syncs = db.query(SyncLog).order_by(SyncLog.started_at.desc()).limit(5).all()
        sync_data = []
        for sync in recent_syncs:
            sync_data.append({
                "id": sync.id,
                "sync_type": sync.sync_type,
                "status": sync.status,
                "started_at": sync.started_at.isoformat() if sync.started_at is not None else None,
                "completed_at": sync.completed_at.isoformat() if sync.completed_at is not None else None,
                "records_processed": sync.records_processed,
                "error_message": sync.error_details
            })
        
        return {
            "user_stats": user_stats,
            "data_stats": {
                "total_assets": total_assets,
                "total_locations": total_locations,
                "recent_syncs": sync_data
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching system overview: {str(e)}")

# User Management Endpoints using UserService
@router.get("/users")
def get_users_with_roles(db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get all users with their roles and display names"""
    try:
        user_service = UserService(db)
        return user_service.get_all_users_with_roles()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get a specific user with role and profile"""
    try:
        user_service = UserService(db)
        user = user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.post("/users")
def create_user(
    email: str = Body(...),
    password: str = Body(...),
    display_name: str = Body(None),
    role: str = Body('user'),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    """Create a new user"""
    try:
        user_service = UserService(db)
        return user_service.create_user(email, password, display_name, role)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    email: str = Body(None),
    display_name: str = Body(None),
    role: str = Body(None),
    is_active: bool = Body(None),
    password: str = Body(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    """Update user information"""
    try:
        user_service = UserService(db)
        update_data = {}
        if email is not None:
            update_data['email'] = email
        if display_name is not None:
            update_data['display_name'] = display_name
        if role is not None:
            update_data['role'] = role
        if is_active is not None:
            update_data['is_active'] = is_active
        if password is not None:
            update_data['password'] = password
        
        return user_service.update_user(user_id, **update_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Delete a user"""
    try:
        user_service = UserService(db)
        return user_service.delete_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@router.post("/users/{user_id}/lock")
def lock_user(user_id: str, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Lock a user"""
    try:
        user_service = UserService(db)
        return user_service.lock_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error locking user: {str(e)}")

@router.post("/users/{user_id}/unlock")
def unlock_user(user_id: str, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Unlock a user"""
    try:
        user_service = UserService(db)
        return user_service.unlock_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unlocking user: {str(e)}")

@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, new_role: str, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Update user role"""
    try:
        user_service = UserService(db)
        return user_service.update_user_role(user_id, new_role)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user role: {str(e)}") 

@router.get("/roles")
def get_all_roles(db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    """Get all unique user roles"""
    user_service = UserService(db)
    return {"roles": user_service.get_all_roles()} 