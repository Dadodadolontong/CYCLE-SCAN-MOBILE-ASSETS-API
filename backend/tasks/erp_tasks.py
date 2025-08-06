import logging
from celery import current_task
from sqlalchemy.orm import Session
from db import get_db
from services.erp_integration_service import ERPIntegrationService
from celery_app import celery_app
from datetime import datetime
import uuid
import platform

logger = logging.getLogger("uvicorn")

current_platform = platform.system().lower()

task_kwargs = {"time_limit": 10 if current_platform == "windows" else {},"bind": True,"name": "tasks.erp_tasks.sync_assets_from_oracle"}

@celery_app.task(**task_kwargs)
def sync_assets_from_oracle_task(self, user_id: str = None, force_full_sync: bool = False):
    """
    Background task to sync assets from Oracle ERP
    """
    task_id = str(uuid.uuid4())
    logger.info(f"Starting ERP asset sync task {task_id} for user {user_id}")
    
    # Update task state
    current_task.update_state(
        state="PROGRESS",
        meta={
            "task_id": task_id,
            "status": "starting",
            "message": "Initializing ERP sync..."
        }
    )
    
    try:
        # Get database session
        db = next(get_db())
        erp_service = ERPIntegrationService(db)
        
        # Create sync log
        sync_log = erp_service.create_sync_log(
            sync_type="oracle_asset_sync",
            initiated_by=user_id,
            task_id=task_id
        )
        
        # Update task state
        current_task.update_state(
            state="PROGRESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "connecting",
                "message": "Connecting to Oracle ERP..."
            }
        )
        
        # Get last sync date
        if force_full_sync:
            last_sync_date = datetime(2000, 1, 1)
            logger.info("Performing full sync from Oracle ERP")
        else:
            last_sync_date = erp_service.get_last_sync_date('asset_sync')
            logger.info(f"Performing incremental sync since: {last_sync_date}")
        
        # Update task state
        current_task.update_state(
            state="PROGRESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "fetching",
                "message": "Fetching assets from Oracle ERP...",
                "last_sync_date": last_sync_date.isoformat()
            }
        )
        
        # Fetch assets from Oracle
        success, oracle_data, error_msg = erp_service.fetch_assets_from_oracle(last_sync_date)
        
        if not success:
            erp_service.update_sync_log_error(sync_log.id, error_msg)
            current_task.update_state(
                state="FAILURE",
                meta={
                    "task_id": task_id,
                    "sync_log_id": sync_log.id,
                    "status": "failed",
                    "error": error_msg
                }
            )
            return {
                "success": False,
                "message": f"Failed to fetch from Oracle ERP: {error_msg}",
                "task_id": task_id,
                "sync_log_id": sync_log.id
            }
        
        # Update task state
        current_task.update_state(
            state="PROGRESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "processing",
                "message": f"Processing {len(oracle_data)} assets...",
                "total_records": len(oracle_data)
            }
        )
        
        # Process assets
        assets_processed = 0
        assets_created = 0
        assets_updated = 0
        errors = []
        current_sync_date = datetime.utcnow()
        
        for i, oracle_record in enumerate(oracle_data):
            try:
                # Update progress every 100 records
                if i % 100 == 0:
                    current_task.update_state(
                        state="PROGRESS",
                        meta={
                            "task_id": task_id,
                            "sync_log_id": sync_log.id,
                            "status": "processing",
                            "message": f"Processing asset {i+1} of {len(oracle_data)}...",
                            "progress": f"{i}/{len(oracle_data)}",
                            "assets_processed": assets_processed,
                            "assets_created": assets_created,
                            "assets_updated": assets_updated
                        }
                    )
                
                # Map Oracle data to our schema
                erp_asset = erp_service.map_oracle_data_to_asset(oracle_record)
                if not erp_asset:
                    errors.append(f"Failed to map Oracle record: {oracle_record}")
                    continue
                
                # Create or update asset
                success, message, asset = erp_service.create_or_update_asset(erp_asset)
                
                if success:
                    assets_processed += 1
                    if "created" in message.lower():
                        assets_created += 1
                    elif "updated" in message.lower():
                        assets_updated += 1
                else:
                    errors.append(f"Failed to process asset {erp_asset.barcode}: {message}")
                    
            except Exception as e:
                error_msg = f"Error processing Oracle record: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        # Update last sync date
        erp_service.update_last_sync_date(current_sync_date, 'asset_sync')
        
        # Update sync log with success
        erp_service.update_sync_log_success(
            sync_log.id,
            assets_processed,
            len(errors),
            errors if errors else None
        )
        
        # Final task state
        current_task.update_state(
            state="SUCCESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "completed",
                "message": f"Successfully synced {assets_processed} assets",
                "assets_processed": assets_processed,
                "assets_created": assets_created,
                "assets_updated": assets_updated,
                "errors_count": len(errors),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "success": True,
            "message": f"Successfully synced {assets_processed} assets from Oracle ERP",
            "assets_processed": assets_processed,
            "assets_created": assets_created,
            "assets_updated": assets_updated,
            "errors": errors,
            "task_id": task_id,
            "sync_log_id": sync_log.id,
            "details": {
                "last_sync_date": last_sync_date.isoformat(),
                "current_sync_date": current_sync_date.isoformat(),
                "total_records": len(oracle_data),
                "force_full_sync": force_full_sync
            }
        }
        
    except Exception as e:
        error_msg = f"ERP sync task failed: {str(e)}"
        logger.error(error_msg)
        
        # Update sync log with error if it exists
        try:
            if 'sync_log' in locals():
                erp_service.update_sync_log_error(sync_log.id, error_msg)
        except:
            pass
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "task_id": task_id,
                "status": "failed",
                "error": error_msg
            }
        )
        
        return {
            "success": False,
            "message": error_msg,
            "task_id": task_id
        }
    
    finally:
        # Close database session
        try:
            db.close()
        except:
            pass

@celery_app.task(bind=True, name="tasks.erp_tasks.sync_locations_from_oracle")
def sync_locations_from_oracle_task(self, user_id: str = None):
    """
    Background task to sync locations from Oracle ERP
    """
    task_id = str(uuid.uuid4())
    logger.info(f"Starting ERP location sync task {task_id} for user {user_id}")
    
    # Update task state
    current_task.update_state(
        state="PROGRESS",
        meta={
            "task_id": task_id,
            "status": "starting",
            "message": "Initializing location sync..."
        }
    )
    
    try:
        # Get database session
        db = next(get_db())
        erp_service = ERPIntegrationService(db)
        
        # Create sync log
        sync_log = erp_service.create_sync_log(
            sync_type="oracle_location_sync",
            initiated_by=user_id,
            task_id=task_id
        )
        
        # Update task state
        current_task.update_state(
            state="PROGRESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "syncing",
                "message": "Syncing locations from Oracle ERP..."
            }
        )
        
        # Perform location sync
        result = erp_service.sync_locations_from_oracle()
        
        # Update sync log with success
        erp_service.update_sync_log_success(
            sync_log.id,
            result.get("locations_synced", 0),
            len(result.get("errors", [])),
            result.get("errors") if result.get("errors") else None
        )
        
        # Final task state
        current_task.update_state(
            state="SUCCESS",
            meta={
                "task_id": task_id,
                "sync_log_id": sync_log.id,
                "status": "completed",
                "message": f"Successfully synced locations",
                "locations_synced": result.get("locations_synced", 0),
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "success": True,
            "message": "Successfully synced locations from Oracle ERP",
            "task_id": task_id,
            "sync_log_id": sync_log.id,
            "result": result
        }
        
    except Exception as e:
        error_msg = f"ERP location sync task failed: {str(e)}"
        logger.error(error_msg)
        
        # Update sync log with error if it exists
        try:
            if 'sync_log' in locals():
                erp_service.update_sync_log_error(sync_log.id, error_msg)
        except:
            pass
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "task_id": task_id,
                "status": "failed",
                "error": error_msg
            }
        )
        
        return {
            "success": False,
            "message": error_msg,
            "task_id": task_id
        }
    
    finally:
        # Close database session
        try:
            db.close()
        except:
            pass 