import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import Asset, Location, SyncLog, ERPSyncConfig, Branch
from schemas import ERPAssetPayload, ERPAssetResponse
import uuid
from datetime import datetime
import oracledb
import platform
from config import config

logger = logging.getLogger("uvicorn")

class ERPIntegrationService:
    def __init__(self, db: Session):
        self.db = db
        
    def get_oracle_connection(self) -> oracledb.Connection:
        """
        Create Oracle database connection
        """
        d = None
        os = platform.system()
        if os == "Windows":
            d = f"{config.ORACLE_CLIENT_PATH}"
            logger.info(f"Initializing Oracle client with lib_dir: {d}")            
            oracledb.init_oracle_client(lib_dir=d)
        elif os == "Linux":
            logger.info("Initializing Oracle client")
            oracledb.init_oracle_client()

        try:
            # Build Oracle connection string
            dsn = f"{config.ORACLE_HOST}:{config.ORACLE_PORT}/{config.ORACLE_SERVICE}"
            
            # Create connection
            connection = oracledb.connect(
                user=config.ORACLE_USERNAME,
                password=config.ORACLE_PASSWORD,
                dsn=dsn
            )
            
            logger.info(f"Successfully connected to Oracle database: {config.ORACLE_HOST}")
            return connection
            
        except Exception as e:
            error_msg = f"Failed to connect to Oracle database: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        
    def sync_locations_from_oracle(self):
        """
        Sync locations from Oracle ERP database
        """
        connection = self.get_oracle_connection()
        cursor = connection.cursor()
        
        # Query locations from Oracle ERP
        query = """
            SELECT
                concatenated_segments as name,
                (
                    SELECT
                        description
                    FROM
                        fnd_flex_values_vl
                    WHERE
                            flex_value = fl.segment1
                        AND flex_value_set_id = 1015222
                )
                || ' - '
                || (
                    SELECT
                        description
                    FROM
                        fnd_flex_values_vl
                    WHERE
                            flex_value = fl.segment2
                        AND flex_value_set_id = 1015223
                )
                || ' - '
                || (
                    SELECT
                        description
                    FROM
                        fnd_flex_values_vl
                    WHERE
                            flex_value = fl.segment3
                        AND flex_value_set_id = 1015378
                )
                || ' - '
                || (
                    SELECT
                        description
                    FROM
                        fnd_flex_values_vl
                    WHERE
                            flex_value = fl.segment4
                        AND flex_value_set_id = 1015225
                )                     as description,
                location_id           as erp_location_id,
                segment3              as branchname
            FROM
                fa_locations_kfv fl
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        try:
            for row in rows:
                existing_location = self.db.query(Location).filter(Location.erp_location_id == row[2]).first()
                branch_id = self.db.query(Branch).filter(Branch.name == row[3]).first()
            
                if existing_location:
                    # Update existing location
                    existing_location.name = row[0]
                    existing_location.description = row[1]
                    if branch_id:
                        existing_location.branch_id = branch_id.id
                    existing_location.updated_at = datetime.utcnow()
                    existing_location.synced_at = datetime.utcnow()
                    logger.info(f"Updated location with ERP ID: {row[2]}")
                else:
                    # Create new location
                    new_location = Location(
                        id=str(uuid.uuid4()),
                        name=row[0],
                        description=row[1],
                        erp_location_id=row[2],
                        branch_id=branch_id.id if branch_id else None
                    )
                    self.db.add(new_location)
                    logger.info(f"Created new location with ERP ID: {row[2]}")

        except Exception as e:
            logger.error(f"Error updating location: {str(e)}")
            self.db.rollback()
            cursor.close()
            connection.close()
            return ERPAssetResponse(
                success=False,
                message=f"Error updating location: {str(e)}",
                errors=[str(e)]
            )
            
        self.db.commit()
        cursor.close()
        connection.close()
        logger.info(f"Successfully synced {len(rows)} locations from Oracle ERP")
        return ERPAssetResponse(
            success=True,
            message=f"Successfully synced {len(rows)} locations from Oracle ERP",
            locations_synced=len(rows)
        )
                   

        

    def get_last_sync_date(self, sync_type: str = 'asset_sync') -> datetime:
        """
        Get the last sync date for the specified sync type
        """
        try:
            sync_config = self.db.query(ERPSyncConfig).filter(
                ERPSyncConfig.sync_type == sync_type
            ).first()
            
            if sync_config:
                return sync_config.last_sync_date
            else:
                # Create default sync config if it doesn't exist
                default_date = datetime(2020, 1, 1)  # Default to 2020-01-01
                sync_config = ERPSyncConfig(
                    id=str(uuid.uuid4()),
                    sync_type=sync_type,
                    last_sync_date=default_date
                )
                self.db.add(sync_config)
                self.db.commit()
                return default_date
                
        except Exception as e:
            logger.error(f"Error getting last sync date: {str(e)}")
            # Return a default date if there's an error
            return datetime(2020, 1, 1)

    def update_last_sync_date(self, sync_date: datetime, sync_type: str = 'asset_sync'):
        """
        Update the last sync date
        """
        try:
            sync_config = self.db.query(ERPSyncConfig).filter(
                ERPSyncConfig.sync_type == sync_type
            ).first()
            
            if sync_config:
                sync_config.last_sync_date = sync_date
                sync_config.updated_at = datetime.utcnow()
            else:
                sync_config = ERPSyncConfig(
                    id=str(uuid.uuid4()),
                    sync_type=sync_type,
                    last_sync_date=sync_date
                )
                self.db.add(sync_config)
            
            self.db.commit()
            logger.info(f"Updated last sync date to: {sync_date}")
            
        except Exception as e:
            logger.error(f"Error updating last sync date: {str(e)}")
            self.db.rollback()

    def fetch_assets_from_oracle(self, last_sync_date: datetime) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Fetch assets from Oracle ERP database
        """
        connection = None
        try:
            connection = self.get_oracle_connection()
            cursor = connection.cursor()
            logger.info(f"Fetching assets from Oracle ERP since: {last_sync_date}")
            
            # Query assets from Oracle ERP
            query = """
                SELECT
                translate(fa.description,
                        chr(9)
                        || chr(10)
                        || chr(11)
                        || chr(13),
                        ' ')             as name,
                fa.asset_id                as asset_id,
                fl.location_id as location_id,
                fa.tag_number              as barcode,
                fa.attribute_category_code as category,
                translate(fa.manufacturer_name, CHR(9)||CHR(10)||CHR(11)||CHR(13),' ')       as manufacturer,
                translate(fa.model_number, CHR(9)||CHR(10)||CHR(11)||CHR(13),' ')       as model,
                translate(fa.serial_number, CHR(9)||CHR(10)||CHR(11)||CHR(13),' ')           as serial_number
            FROM
                fa_additions            fa,
                fa_distribution_history fd,
                fa_locations_kfv        fl
            WHERE
                    fa.asset_id = fd.asset_id
                AND fd.location_id = fl.location_id
                AND fa.in_use_flag = 'YES'
                AND fd.date_ineffective IS NULL
                AND fa.last_update_date > :last_sync_date
                AND fa.tag_number is not null 
                ORDER BY fa.asset_id
            """
            
            logger.info(f"Querying Oracle ERP for assets updated after: {last_sync_date}")
            
            cursor.execute(query, last_sync_date=last_sync_date)
            
            # Fetch all results
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            assets = []
            for row in rows:
                asset = {
                    'barcode': row[3],
                    'name': row[0],
                    'model': row[5],
                    'build': row[6],
                    'category': row[4],
                    'erp_location': row[2],
                    'erp_asset_id': row[1]                    
                }
                assets.append(asset)                 
            
            logger.info(f"Successfully fetched {len(assets)} assets from Oracle ERP")
            return True, assets, ""
            
        except Exception as e:
            error_msg = f"Error fetching assets from Oracle ERP: {str(e)}"
            logger.error(error_msg)
            return False, [], error_msg
            
        finally:
            if connection:
                connection.close()

    def map_oracle_data_to_asset(self, oracle_data: Dict[str, Any]) -> Optional[ERPAssetPayload]:
        """
        Map Oracle ERP data to our ERPAssetPayload schema
        """
        try:
            # Extract data from Oracle result
            barcode = oracle_data.get('barcode')
            name = oracle_data.get('name')
            model = oracle_data.get('model')
            build = oracle_data.get('build')
            category = oracle_data.get('category')
            erp_asset_id = oracle_data.get('erp_asset_id')
            location_id = oracle_data.get('erp_location')

            # Validate required fields
            if not barcode or not name or not location_id:
                logger.warning(f"Missing required fields in Oracle data: {oracle_data}")
                return None

            return ERPAssetPayload(
                barcode=str(barcode),
                name=str(name),
                model=str(model) if model else None,
                build=str(build) if build else None,
                category=str(category) if category else None,
                erp_asset_id=str(erp_asset_id),
                location_id=str(location_id)
            )
            
        except Exception as e:
            logger.error(f"Error mapping Oracle data: {str(e)}, data: {oracle_data}")
            return None

    def find_location_by_erp_id(self, erp_location_id: str) -> Optional[Location]:
        """
        Find location by ERP location ID
        """
        return self.db.query(Location).filter(Location.erp_location_id == erp_location_id).first()

    def create_or_update_asset(self, erp_asset: ERPAssetPayload) -> Tuple[bool, str, Optional[Asset]]:
        """
        Create or update asset from ERP data
        """
        try:
            # Find location by ERP location ID
            location = self.find_location_by_erp_id(erp_asset.location_id)
            if not location:
                error_msg = f"Location not found for ERP location ID: {erp_asset.location_id}"
                logger.warning(error_msg)
                return False, error_msg, None

            # Check if asset already exists by barcode (tag_number)
            existing_asset = self.db.query(Asset).filter(Asset.barcode == erp_asset.barcode).first()
            
            if existing_asset:
                # Update existing asset
                existing_asset.name = erp_asset.name
                existing_asset.model = erp_asset.model
                existing_asset.build = erp_asset.build
                existing_asset.location = location.id
                existing_asset.category = erp_asset.category
                existing_asset.erp_asset_id = erp_asset.erp_asset_id
                existing_asset.updated_at = datetime.utcnow()
                existing_asset.synced_at = datetime.utcnow()
                
                self.db.commit()
                logger.info(f"Updated asset with barcode: {erp_asset.barcode}")
                return True, "Asset updated", existing_asset
            else:
                # Create new asset
                new_asset = Asset(
                    id=str(uuid.uuid4()),
                    erp_asset_id=erp_asset.erp_asset_id,  # Use tag_number as ERP asset ID
                    name=erp_asset.name,
                    barcode=erp_asset.barcode,
                    model=erp_asset.model,
                    build=erp_asset.build,
                    location=location.id,
                    category=erp_asset.category,                    
                    status='active',
                    synced_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                self.db.add(new_asset)
                self.db.commit()
                self.db.refresh(new_asset)
                
                logger.info(f"Created new asset with barcode: {erp_asset.barcode}")
                return True, "Asset created", new_asset
                
        except IntegrityError as e:
            self.db.rollback()
            error_msg = f"Database integrity error: {str(e)}"
            logger.error(error_msg)
            return False, error_msg, None
        except Exception as e:
            self.db.rollback()
            error_msg = f"Error creating/updating asset: {str(e)}"
            logger.error(error_msg)
            return False, error_msg, None

    def sync_assets_from_oracle(
        self, 
        user_id: Optional[str] = None,
        force_full_sync: bool = False
    ) -> ERPAssetResponse:
        """
        Main method to sync assets from Oracle ERP database
        """
        sync_log = SyncLog(
            id=str(uuid.uuid4()),
            sync_type="oracle_asset_sync",
            status="running",
            initiated_by=user_id
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            # Get last sync date
            if force_full_sync:
                last_sync_date = datetime(2020, 1, 1)  # Force full sync
                logger.info("Performing full sync from Oracle ERP")
            else:
                last_sync_date = self.get_last_sync_date('asset_sync')
                logger.info(f"Performing incremental sync from Oracle ERP since: {last_sync_date}")

            # Fetch assets from Oracle
            success, oracle_data, error_msg = self.fetch_assets_from_oracle(last_sync_date)
            
            if not success:
                sync_log.status = "failed"
                sync_log.error_details = {"error": error_msg}
                self.db.commit()
                return ERPAssetResponse(
                    success=False,
                    message=f"Failed to fetch from Oracle ERP: {error_msg}",
                    errors=[error_msg]
                )

            # Process assets
            assets_processed = 0
            assets_created = 0
            assets_updated = 0
            errors = []
            current_sync_date = datetime.utcnow()

            for oracle_record in oracle_data:
                try:                    
                    # Map Oracle data to our schema
                    erp_asset = self.map_oracle_data_to_asset(oracle_record)
                    if not erp_asset:
                        errors.append(f"Failed to map Oracle record: {oracle_record}")
                        continue

                    # Create or update asset
                    success, message, asset = self.create_or_update_asset(erp_asset)
                    
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
            self.update_last_sync_date(current_sync_date, 'asset_sync')

            # Update sync log
            sync_log.status = "completed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.assets_synced = assets_processed
            sync_log.errors_count = len(errors)
            sync_log.error_details = {"errors": errors} if errors else None
            self.db.commit()

            return ERPAssetResponse(
                success=True,
                message=f"Successfully synced {assets_processed} assets from Oracle ERP",
                assets_processed=assets_processed,
                assets_created=assets_created,
                assets_updated=assets_updated,
                errors=errors,
                details={
                    "last_sync_date": last_sync_date.isoformat(),
                    "current_sync_date": current_sync_date.isoformat(),
                    "total_records": len(oracle_data),
                    "sync_log_id": sync_log.id,
                    "force_full_sync": force_full_sync
                }
            )

        except Exception as e:
            # Update sync log with error
            sync_log.status = "failed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_details = {"error": str(e)}
            self.db.commit()
            
            error_msg = f"Unexpected error during Oracle ERP sync: {str(e)}"
            logger.error(error_msg)
            return ERPAssetResponse(
                success=False,
                message=error_msg,
                errors=[error_msg]
            )

    def get_sync_history(self, limit: int = 50) -> List[SyncLog]:
        """
        Get Oracle ERP sync history
        """
        return self.db.query(SyncLog)\
            .filter(SyncLog.sync_type == "oracle_asset_sync")\
            .order_by(SyncLog.started_at.desc())\
            .limit(limit)\
            .all()

    def get_sync_config(self) -> Optional[ERPSyncConfig]:
        """
        Get current sync configuration
        """
        return self.db.query(ERPSyncConfig)\
            .filter(ERPSyncConfig.sync_type == "asset_sync")\
            .first()

    def test_oracle_connection(self) -> Dict[str, Any]:
        """
        Test Oracle database connection
        """
        try:
            connection = self.get_oracle_connection()
            cursor = connection.cursor()
            
            # Test query to get count of assets
            cursor.execute("SELECT 1 FROM dual")
            count = cursor.fetchone()[0]
                      
            connection.close()
            
            return {
                "success": True,
                "message": "Successfully connected to Oracle ERP database",                
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to connect to Oracle ERP database: {str(e)}",
                "error": str(e)
            }

    # Background task helper methods
    def create_sync_log(self, sync_type: str, initiated_by: str = None, task_id: str = None) -> SyncLog:
        """
        Create a new sync log entry for background tasks
        """
        sync_log = SyncLog(
            id=str(uuid.uuid4()),
            sync_type=sync_type,
            status="running",
            initiated_by=initiated_by
        )
        self.db.add(sync_log)
        self.db.commit()
        self.db.refresh(sync_log)
        return sync_log

    def update_sync_log_success(self, sync_log_id: str, assets_synced: int, errors_count: int, error_details: Any = None):
        """
        Update sync log with success status
        """
        sync_log = self.db.query(SyncLog).filter(SyncLog.id == sync_log_id).first()
        if sync_log:
            sync_log.status = "completed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.assets_synced = assets_synced
            sync_log.errors_count = errors_count
            sync_log.error_details = error_details
            self.db.commit()

    def update_sync_log_error(self, sync_log_id: str, error_message: str):
        """
        Update sync log with error status
        """
        sync_log = self.db.query(SyncLog).filter(SyncLog.id == sync_log_id).first()
        if sync_log:
            sync_log.status = "failed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_details = {"error": error_message}
            self.db.commit()

    def get_sync_log_by_task_id(self, task_id: str) -> Optional[SyncLog]:
        """
        Get sync log by task ID
        """
        return self.db.query(SyncLog).filter(SyncLog.id == task_id).first() 