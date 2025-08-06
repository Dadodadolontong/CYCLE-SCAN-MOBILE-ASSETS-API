from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from auth import get_current_user, require_role
from models import User, SyncLog
from services.erp_integration_service import ERPIntegrationService
from schemas import ERPAssetResponse
from datetime import datetime
from tasks.erp_tasks import sync_assets_from_oracle_task, sync_locations_from_oracle_task
from celery.result import AsyncResult

router = APIRouter(prefix="/erp", tags=["ERP Integration"])

@router.post("/sync-locations", response_model=dict)
async def sync_locations_from_oracle(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start background sync of locations from Oracle ERP database
    """
    # Check if user has admin role
    require_role("admin")
    
    try:
        # Start background task
        task = sync_locations_from_oracle_task.delay(user_id=current_user.id)
        
        return {
            "success": True,
            "message": "Location sync started in background",
            "task_id": task.id,
            "status": "PENDING"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start location sync: {str(e)}"
        )

@router.post("/sync-assets", response_model=dict)
async def sync_assets_from_oracle(
    force_full_sync: bool = Query(False, description="Force full sync instead of incremental"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start background sync of assets from Oracle ERP database
    """
    # Check if user has admin role
    require_role("admin")
    
    try:
        # Start background task
        task = sync_assets_from_oracle_task.delay(
            user_id=current_user.id,
            force_full_sync=force_full_sync
        )
        
        return {
            "success": True,
            "message": "Asset sync started in background",
            "task_id": task.id,
            "status": "PENDING",
            "force_full_sync": force_full_sync
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start asset sync: {str(e)}"
        )

@router.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the status of a background task
    """
    # Check if user has admin role
    require_role("admin")
    
    try:
        # Get task result
        task_result = AsyncResult(task_id)
        
        response = {
            "task_id": task_id,
            "status": task_result.status,
        }
        
        if task_result.ready():
            if task_result.successful():
                response["result"] = task_result.result
            else:
                response["error"] = str(task_result.info)
        else:
            # Task is still running, get progress info
            if task_result.info:
                response["progress"] = task_result.info
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}"
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
    Test Oracle ERP database connection
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    result = erp_service.test_oracle_connection()
    
    return result

@router.get("/sync-config")
async def get_sync_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current ERP sync configuration
    """
    # Check if user has admin role
    require_role("admin")
    
    erp_service = ERPIntegrationService(db)
    config = erp_service.get_sync_config()
    
    if config:
        return {
            "last_asset_sync": config.last_sync_date.isoformat() if config.last_sync_date else None,
            "last_location_sync": None,  # TODO: Add location sync tracking
            "total_assets_synced": 0,  # TODO: Add asset counting
            "total_locations_synced": 0  # TODO: Add location counting
        }
    else:
        return {
            "last_asset_sync": None,
            "last_location_sync": None,
            "total_assets_synced": 0,
            "total_locations_synced": 0
        }

@router.get("/locations-mapping")
async def get_locations_mapping(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ERP location mapping information
    """
    # Check if user has admin role
    require_role("admin")
    
    # Get locations with ERP IDs
    locations = db.query(Location).filter(Location.erp_location_id.isnot(None)).all()
    
    return {
        "locations": [
            {
                "id": loc.id,
                "name": loc.name,
                "erp_location_id": loc.erp_location_id,
                "branch_id": loc.branch_id
            }
            for loc in locations
        ],
        "total": len(locations)
    } 