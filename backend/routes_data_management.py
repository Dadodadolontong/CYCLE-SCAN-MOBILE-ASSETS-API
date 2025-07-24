from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db import SessionLocal
from services.data_management_service import DataManagementService
from auth import require_role, get_current_user
from models import User
from typing import List, Dict, Any

router = APIRouter(prefix="/data-management", tags=["data-management"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sync-logs")
def get_sync_logs(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get recent sync logs"""
    service = DataManagementService(db)
    return service.get_sync_logs(limit)

@router.get("/stats")
def get_data_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get data statistics"""
    service = DataManagementService(db)
    return service.get_data_stats()

@router.post("/upload/regions")
async def upload_regions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Upload and process regions CSV file"""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    service = DataManagementService(db)
    result = service.process_csv_file(file, 'regions', str(current_user.id))
    
    return {
        'success': result['success'],
        'message': f"Processed {result['processed']} records with {result['errors']} errors",
        'details': {
            'processed': result['processed'],
            'errors': result['errors'],
            'error_details': result.get('error_details')
        }
    }

@router.post("/upload/locations")
async def upload_locations_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Upload and process locations CSV file"""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    service = DataManagementService(db)
    result = service.process_csv_file(file, 'locations', str(current_user.id))
    
    return {
        'success': result['success'],
        'message': f"Processed {result['processed']} records with {result['errors']} errors",
        'details': {
            'processed': result['processed'],
            'errors': result['errors'],
            'error_details': result.get('error_details')
        }
    }

@router.post("/upload/assets")
async def upload_assets_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Upload and process assets CSV file"""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    service = DataManagementService(db)
    result = service.process_csv_file(file, 'assets', str(current_user.id))
    
    return {
        'success': result['success'],
        'message': f"Processed {result['processed']} records with {result['errors']} errors",
        'details': {
            'processed': result['processed'],
            'errors': result['errors'],
            'error_details': result.get('error_details')
        }
    } 

@router.post("/debug/csv")
async def debug_csv_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Debug endpoint to inspect CSV content"""
    try:
        # Read CSV content
        content = file.file.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8-sig')  # Use utf-8-sig to handle BOM
        
        import csv
        import io
        
        csv_reader = csv.DictReader(io.StringIO(content))
        records = list(csv_reader)
        
        if not records:
            return {"error": "No records found in CSV"}
        
        # Clean column names (remove BOM and extra whitespace)
        cleaned_records = []
        for record in records:
            cleaned_record = {}
            for key, value in record.items():
                # Remove BOM and clean the key
                cleaned_key = key.replace('\ufeff', '').strip()
                cleaned_record[cleaned_key] = value
            cleaned_records.append(cleaned_record)
        
        # Return debug information
        return {
            "filename": file.filename,
            "total_records": len(records),
            "original_headers": list(records[0].keys()) if records else [],
            "cleaned_headers": list(cleaned_records[0].keys()) if cleaned_records else [],
            "first_record_original": records[0] if records else {},
            "first_record_cleaned": cleaned_records[0] if cleaned_records else {},
            "sample_records_cleaned": cleaned_records[:3]  # First 3 records
        }
        
    except Exception as e:
        return {"error": f"CSV parsing failed: {str(e)}"} 

@router.get("/debug/countries")
def get_countries_debug(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Debug endpoint to check existing countries"""
    from models import Country
    countries = db.query(Country).all()
    return {
        "total_countries": len(countries),
        "countries": [
            {
                "id": country.id,
                "name": country.name,
                "code": country.code
            }
            for country in countries
        ]
    } 