from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from auth import get_current_user, require_role
from models import User, SyncLog
from services.erp_integration_service import ERPIntegrationService
from schemas import ERPAssetResponse
from datetime import datetime

router = APIRouter(prefix="/erp", tags=["ERP Integration"])

@router.post("/sync-locations", response_model=ERPAssetResponse)
async def sync_locations_from_oracle(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync locations from Oracle ERP database
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)

    try:
        result = erp_service.sync_locations_from_oracle()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync locations from Oracle ERP: {str(e)}"
        )

@router.post("/sync-assets", response_model=ERPAssetResponse)
async def sync_assets_from_oracle(
    force_full_sync: bool = Query(False, description="Force full sync instead of incremental"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync assets from Oracle ERP database
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    
    try:
        result = erp_service.sync_assets_from_oracle(
            user_id=current_user.id,
            force_full_sync=force_full_sync
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync assets from Oracle ERP: {str(e)}"
        )

@router.get("/sync-history")
async def get_sync_history(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Oracle ERP sync history
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    sync_logs = erp_service.get_sync_history(limit=limit)
    
    return {
        "sync_logs": [
            {
                "id": log.id,
                "sync_type": log.sync_type,
                "status": log.status,
                "started_at": log.started_at,
                "completed_at": log.completed_at,
                "assets_synced": log.assets_synced,
                "errors_count": log.errors_count,
                "initiated_by": log.initiated_by,
                "error_details": log.error_details
            }
            for log in sync_logs
        ],
        "total": len(sync_logs)
    }

@router.get("/test-connection")
async def test_oracle_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test connection to Oracle ERP database
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    
    try:
        result = erp_service.test_oracle_connection()
        return result
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error testing Oracle connection: {str(e)}",
            "error": str(e)
        }

@router.get("/sync-config")
async def get_sync_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current sync configuration and last sync date
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    sync_config = erp_service.get_sync_config()
    
    if sync_config:
        return {
            "sync_type": sync_config.sync_type,
            "last_sync_date": sync_config.last_sync_date,
            "created_at": sync_config.created_at,
            "updated_at": sync_config.updated_at
        }
    else:
        return {
            "sync_type": "asset_sync",
            "last_sync_date": None,
            "message": "No sync configuration found. Will use default date on first sync."
        }

@router.get("/locations-mapping")
async def get_locations_mapping(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get mapping of ERP location IDs to internal location IDs
    """
    # Check if user has admin role
    require_role(current_user, "admin")
    
    from models import Location
    
    locations = db.query(Location).filter(Location.erp_location_id.isnot(None)).all()
    
    return {
        "locations_mapping": [
            {
                "internal_id": location.id,
                "internal_name": location.name,
                "erp_location_id": location.erp_location_id,
                "description": location.description
            }
            for location in locations
        ],
        "total_mapped_locations": len(locations)
    } 