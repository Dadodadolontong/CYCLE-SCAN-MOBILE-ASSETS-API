from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, UploadFile
from typing import List, Dict, Any, Optional
from models import SyncLog, Asset, Location, User, Region, Country
import csv
import io
import uuid
from datetime import datetime

class DataManagementService:
    def __init__(self, db: Session):
        self.db = db

    def get_sync_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent sync logs"""
        logs = self.db.query(SyncLog).order_by(desc(SyncLog.started_at)).limit(limit).all()
        
        return [
            {
                'id': log.id,
                'sync_type': log.sync_type,
                'status': log.status,
                'started_at': log.started_at,
                'completed_at': log.completed_at,
                'assets_synced': log.assets_synced,
                'errors_count': log.errors_count,
                'error_details': log.error_details,
                'initiated_by': log.initiated_by,
                'file_name': log.file_name,
                'records_processed': log.records_processed,
                'scheduled_at': log.scheduled_at,
                'schedule_type': log.schedule_type,
                'next_run_at': log.next_run_at,
            }
            for log in logs
        ]

    def get_data_stats(self) -> Dict[str, Any]:
        """Get data statistics"""
        # Count assets
        total_assets = self.db.query(func.count(Asset.id)).scalar()
        
        # Count locations
        total_locations = self.db.query(func.count(Location.id)).scalar()
        
        # Count successful imports
        successful_imports = self.db.query(func.count(SyncLog.id)).filter(
            SyncLog.status == 'completed'
        ).scalar()
        
        return {
            'total_assets': total_assets,
            'total_locations': total_locations,
            'successful_imports': successful_imports
        }

    def create_sync_log(self, sync_type: str, file_name: str, initiated_by: str) -> str:
        """Create a new sync log entry"""
        log_id = str(uuid.uuid4())
        sync_log = SyncLog(
            id=log_id,
            sync_type=sync_type,
            status='in_progress',
            started_at=datetime.utcnow(),
            initiated_by=initiated_by,
            file_name=file_name,
            records_processed=0,
            errors_count=0
        )
        
        self.db.add(sync_log)
        self.db.commit()
        return log_id

    def update_sync_log(self, log_id: str, status: str, records_processed: int = 0, 
                       errors_count: int = 0, error_details: Optional[Dict] = None):
        """Update a sync log entry"""
        sync_log = self.db.query(SyncLog).filter(SyncLog.id == log_id).first()
        if not sync_log:
            raise HTTPException(status_code=404, detail="Sync log not found")
        
        # Update attributes using setattr
        setattr(sync_log, 'status', status)
        setattr(sync_log, 'records_processed', records_processed)
        setattr(sync_log, 'errors_count', errors_count)
        setattr(sync_log, 'error_details', error_details)
        
        if status in ['completed', 'failed']:
            setattr(sync_log, 'completed_at', datetime.utcnow())
        
        self.db.commit()

    def process_csv_file(self, file: UploadFile, sync_type: str, initiated_by: str) -> Dict[str, Any]:
        """Process uploaded CSV file"""
        try:
            # Create sync log
            file_name = file.filename or "unknown.csv"
            log_id = self.create_sync_log(sync_type, file_name, initiated_by)
            
            # Read CSV content
            content = file.file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8-sig')  # Use utf-8-sig to handle BOM
            
            csv_reader = csv.DictReader(io.StringIO(content))
            records = list(csv_reader)
            
            if not records:
                self.update_sync_log(log_id, 'failed', 0, 1, {'error': 'No records found in CSV'})
                raise HTTPException(status_code=400, detail="No records found in CSV file")
            
            # Clean column names (remove BOM and extra whitespace)
            cleaned_records = []
            for record in records:
                cleaned_record = {}
                for key, value in record.items():
                    # Remove BOM and clean the key
                    cleaned_key = key.replace('\ufeff', '').strip()
                    cleaned_record[cleaned_key] = value
                cleaned_records.append(cleaned_record)
            
            # Process based on sync type
            if sync_type == 'regions':
                result = self._process_regions_csv(cleaned_records)
            elif sync_type == 'locations':
                result = self._process_locations_csv(cleaned_records)
            elif sync_type == 'assets':
                result = self._process_assets_csv(cleaned_records)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported sync type: {sync_type}")
            
            # Update sync log with results
            self.update_sync_log(
                log_id, 
                'completed' if result['success'] else 'failed',
                result.get('processed', 0),
                result.get('errors', 0),
                result.get('error_details')
            )
            
            return result
            
        except Exception as e:
            # Update sync log with error
            if 'log_id' in locals():
                self.update_sync_log(log_id, 'failed', 0, 1, {'error': str(e)})
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    def _process_regions_csv(self, records: List[Dict]) -> Dict[str, Any]:
        from models import Branch
        processed = 0
        errors = 0
        error_details = []
        if records:
            print(f"DEBUG: First record keys: {list(records[0].keys())}")
            print(f"DEBUG: First record: {records[0]}")
        for i, record in enumerate(records, 1):
            try:
                region_name = (
                    record.get('region-name') or record.get('region_name') or record.get('region') or record.get('name')
                )
                country_code = (
                    record.get('country-code') or record.get('country_code') or record.get('country') or record.get('code')
                )
                branch_name = (
                    record.get('branch-name') or record.get('branch_name') or record.get('branch')
                )
                region_controller_email = (
                    record.get('region-controller-email') or record.get('region_controller_email') or record.get('controller-email') or record.get('controller_email') or record.get('controller')
                )
                branch_manager_email = (
                    record.get('branch-manager-email') or record.get('branch_manager_email') or record.get('manager-email') or record.get('manager_email') or record.get('manager')
                )
                print(f"DEBUG: Mapped values - region_name: '{region_name}', country_code: '{country_code}', branch_name: '{branch_name}', region_controller_email: '{region_controller_email}', branch_manager_email: '{branch_manager_email}'")
                if not region_name or not country_code or not branch_name:
                    error_msg = f"Row {i}: Missing required fields"
                    if not region_name:
                        error_msg += " (region name is empty or missing)"
                    if not country_code:
                        error_msg += " (country code is empty or missing)"
                    if not branch_name:
                        error_msg += " (branch name is empty or missing)"
                    errors += 1
                    error_details.append(error_msg)
                    continue
                country = self.db.query(Country).filter(Country.code == country_code).first()
                if not country:
                    errors += 1
                    error_details.append(f"Row {i}: Country with code '{country_code}' not found")
                    continue
                region = self.db.query(Region).filter(
                    Region.name == region_name,
                    Region.country_id == country.id
                ).first()
                if not region:
                    region = Region(
                        id=str(uuid.uuid4()),
                        name=region_name,
                        country_id=country.id
                    )
                    if region_controller_email:
                        user = self.db.query(User).filter(User.email == region_controller_email).first()
                        if user:
                            region.controller_id = user.id
                        else:
                            error_details.append(f"Row {i}: Region controller email '{region_controller_email}' not found in users")
                    self.db.add(region)
                    print(f"DEBUG: Created region '{region_name}' in country '{country.name}'")
                else:
                    if region_controller_email:
                        user = self.db.query(User).filter(User.email == region_controller_email).first()
                        if user:
                            region.controller_id = user.id
                        else:
                            error_details.append(f"Row {i}: Region controller email '{region_controller_email}' not found in users")
                    print(f"DEBUG: Region '{region_name}' already exists in country '{country.name}', using existing region")
                self.db.flush()
                branch = self.db.query(Branch).filter(
                    Branch.name == branch_name,
                    Branch.region_id == region.id
                ).first()
                if not branch:
                    branch = Branch(
                        id=str(uuid.uuid4()),
                        name=branch_name,
                        region_id=region.id,
                        country_id=country.id
                    )
                    if branch_manager_email:
                        user = self.db.query(User).filter(User.email == branch_manager_email).first()
                        if user:
                            branch.manager_id = user.id
                        else:
                            error_details.append(f"Row {i}: Branch manager email '{branch_manager_email}' not found in users")
                    self.db.add(branch)
                    print(f"DEBUG: Created branch '{branch_name}' in region '{region_name}'")
                else:
                    if branch_manager_email:
                        user = self.db.query(User).filter(User.email == branch_manager_email).first()
                        if user:
                            branch.manager_id = user.id
                        else:
                            error_details.append(f"Row {i}: Branch manager email '{branch_manager_email}' not found in users")
                    print(f"DEBUG: Branch '{branch_name}' already exists in region '{region_name}', using existing branch")
                processed += 1
            except Exception as e:
                errors += 1
                error_details.append(f"Row {i}: {str(e)}")
                print(f"DEBUG: Error processing row {i}: {str(e)}")
        try:
            self.db.commit()
            print(f"DEBUG: Successfully committed {processed} region/branch rows to database")
        except Exception as e:
            self.db.rollback()
            errors += len(records)
            error_details.append(f"Database commit failed: {str(e)}")
            print(f"DEBUG: Database commit failed: {str(e)}")
        return {
            'success': errors == 0,
            'processed': processed,
            'errors': errors,
            'error_details': error_details if error_details else None
        }

    def _process_locations_csv(self, records: List[Dict]) -> Dict[str, Any]:
        """Process locations CSV data"""
        processed = 0
        errors = 0
        error_details = []
        
        for i, record in enumerate(records, 1):
            try:
                # Flexible field mapping
                location_name = (
                    record.get('location-name') or 
                    record.get('location_name') or 
                    record.get('location') or 
                    record.get('name')
                )
                
                description = (
                    record.get('description') or 
                    record.get('desc') or 
                    ''
                )
                
                erp_location_id = (
                    record.get('erp_location_id') or 
                    record.get('erp-location-id') or 
                    record.get('erp_id') or 
                    None
                )
                
                branch_name = (
                    record.get('branch-name') or 
                    record.get('branch_name') or 
                    record.get('branch') or 
                    None
                )
                
                # Validate required fields
                if not location_name:
                    errors += 1
                    error_details.append(f"Row {i}: Missing location name")
                    continue
                
                # Check if location already exists
                existing_location = self.db.query(Location).filter(Location.name == location_name).first()
                if existing_location:
                    print(f"DEBUG: Location '{location_name}' already exists, skipping")
                    processed += 1
                    continue
                
                # Find branch if specified
                branch_id = None
                if branch_name:
                    from models import Branch
                    branch = self.db.query(Branch).filter(Branch.name == branch_name).first()
                    if branch:
                        branch_id = branch.id
                    else:
                        error_details.append(f"Row {i}: Branch '{branch_name}' not found")
                
                # Create new location
                location = Location(
                    id=str(uuid.uuid4()),
                    name=location_name,
                    description=description,
                    erp_location_id=erp_location_id,
                    branch_id=branch_id
                )
                
                self.db.add(location)
                processed += 1
                print(f"DEBUG: Created location '{location_name}'")
                
            except Exception as e:
                errors += 1
                error_details.append(f"Row {i}: {str(e)}")
        
        # Commit all changes
        try:
            self.db.commit()
            print(f"DEBUG: Successfully committed {processed} locations to database")
        except Exception as e:
            self.db.rollback()
            errors += len(records)
            error_details.append(f"Database commit failed: {str(e)}")
        
        return {
            'success': errors == 0,
            'processed': processed,
            'errors': errors,
            'error_details': error_details if error_details else None
        }

    def _process_assets_csv(self, records: List[Dict]) -> Dict[str, Any]:
        """Process assets CSV data"""
        processed = 0
        errors = 0
        error_details = []
        
        for i, record in enumerate(records, 1):
            try:
                # Flexible field mapping
                asset_name = (
                    record.get('name') or 
                    record.get('asset_name') or 
                    record.get('asset-name') or 
                    record.get('title')
                )
                
                erp_asset_id = (
                    record.get('erp_asset_id') or 
                    record.get('erp-asset-id') or 
                    record.get('erp_id') or 
                    record.get('asset_id')
                )
                
                location_name = (
                    record.get('location-name') or 
                    record.get('location_name') or 
                    record.get('location') or 
                    None
                )
                
                barcode = (
                    record.get('barcode') or 
                    record.get('barcode_id') or 
                    None
                )
                
                category = (
                    record.get('category') or 
                    record.get('asset_category') or 
                    None
                )
                
                model = (
                    record.get('model') or 
                    record.get('asset_model') or 
                    None
                )
                
                build = (
                    record.get('build') or 
                    record.get('build_year') or 
                    None
                )
                
                status = (
                    record.get('status') or 
                    record.get('asset_status') or 
                    'active'
                )
                
                # Validate required fields
                if not asset_name or not erp_asset_id:
                    error_msg = f"Row {i}: Missing required fields"
                    if not asset_name:
                        error_msg += " (asset name is empty or missing)"
                    if not erp_asset_id:
                        error_msg += " (ERP asset ID is empty or missing)"
                    errors += 1
                    error_details.append(error_msg)
                    continue
                
                # Check if asset already exists
                existing_asset = self.db.query(Asset).filter(Asset.erp_asset_id == erp_asset_id).first()
                if existing_asset:
                    print(f"DEBUG: Asset with ERP ID '{erp_asset_id}' already exists, skipping")
                    processed += 1
                    continue
                
                # Find location if specified
                location_id = None
                if location_name:
                    location = self.db.query(Location).filter(Location.name == location_name).first()
                    if location:
                        location_id = location.id
                    else:
                        error_details.append(f"Row {i}: Location '{location_name}' not found")
                
                # Create new asset
                asset = Asset(
                    id=str(uuid.uuid4()),
                    name=asset_name,
                    erp_asset_id=erp_asset_id,
                    barcode=barcode,
                    category=category,
                    model=model,
                    build=build,
                    status=status,
                    location=location_id
                )
                
                self.db.add(asset)
                processed += 1
                print(f"DEBUG: Created asset '{asset_name}' with ERP ID '{erp_asset_id}'")
                
            except Exception as e:
                errors += 1
                error_details.append(f"Row {i}: {str(e)}")
        
        # Commit all changes
        try:
            self.db.commit()
            print(f"DEBUG: Successfully committed {processed} assets to database")
        except Exception as e:
            self.db.rollback()
            errors += len(records)
            error_details.append(f"Database commit failed: {str(e)}")
        
        return {
            'success': errors == 0,
            'processed': processed,
            'errors': errors,
            'error_details': error_details if error_details else None
        } 