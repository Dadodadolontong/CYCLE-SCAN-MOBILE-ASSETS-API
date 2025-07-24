# CSV Upload Testing Guide

## Overview
This guide explains how to test the CSV upload functionality that has been migrated from Supabase to FastAPI.

## Prerequisites

1. **Backend Server**: Make sure the FastAPI backend is running on port 8002
2. **Admin User**: Ensure you have an admin user created in the FastAPI system
3. **Frontend**: Make sure the React frontend is running

## Test Files

Sample CSV files have been created in the `test-data/` directory:

### 1. Regions CSV (`test-data/sample-regions.csv`)
```csv
region-name,country-code,controller-email
North America,US,controller.na@company.com
Europe,UK,controller.eu@company.com
Asia Pacific,ID,controller.ap@company.com
```

### 2. Locations CSV (`test-data/sample-locations.csv`)
```csv
location-name,description,erp_location_id,branch-name
Main Warehouse,Primary storage facility,WH001,North America
Office Building A,Administrative offices,OFF001,North America
Production Plant,Manufacturing facility,PLANT001,Europe
Storage Facility B,Secondary storage,WH002,Asia Pacific
```

### 3. Assets CSV (`test-data/sample-assets.csv`)
```csv
name,erp_asset_id,location-name,barcode,category,model,build,status
Laptop Dell XPS,ASSET001,Office Building A,LP001,Electronics,Dell XPS 13,2023,Active
Forklift Toyota,ASSET002,Main Warehouse,FL001,Equipment,Toyota 8FGCU25,2022,Active
Server HP ProLiant,ASSET003,Office Building A,SRV001,Electronics,HP ProLiant DL380,2023,Active
Pallet Jack,ASSET004,Main Warehouse,PJ001,Equipment,Manual Pallet Jack,2021,Active
```

## Testing Methods

### Method 1: Backend API Testing (Python Script)

1. **Run the test script**:
   ```bash
   python test-csv-upload.py
   ```

2. **What the script tests**:
   - Login with admin credentials
   - Data statistics endpoint
   - Sync logs endpoint
   - CSV upload for regions, locations, and assets
   - Verification of new sync logs after uploads

### Method 2: Frontend UI Testing

1. **Access the test page**:
   Navigate to `http://localhost:5173/test-csv-upload`

2. **Test uploads**:
   - Use the "Upload Test" tab to upload CSV files
   - Check the "Data Stats" tab to see statistics
   - Check the "Sync Logs" tab to see upload history

### Method 3: Admin Dashboard Testing

1. **Access the admin dashboard**:
   Navigate to `http://localhost:5173/admin`

2. **Go to Data section**:
   Click on the "Data" tab in the admin dashboard

3. **Test uploads**:
   - Use the "Import Data" tab to upload CSV files
   - Check the "Import History" tab to see upload history
   - Check the "Import Errors" tab to see detailed error logs

## Expected Results

### Successful Upload
- File should be processed without errors
- Sync log should be created with status "completed"
- Data statistics should be updated
- Success message should be displayed

### Error Handling
- Invalid CSV format should show appropriate error messages
- Missing required fields should be flagged
- File validation should prevent invalid uploads

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Make sure you're logged in with an admin account
   - Check that the admin user has the correct role

2. **404 Not Found**:
   - Ensure the FastAPI backend is running on port 8002
   - Check that the routes are properly registered

3. **File Upload Errors**:
   - Verify the CSV file format matches the expected headers
   - Check that required fields are present
   - Ensure the file is a valid CSV

4. **Database Errors**:
   - Check that the database is running and accessible
   - Verify that the sync_logs table exists

### Debug Steps

1. **Check backend logs** for detailed error messages
2. **Verify database connection** and table structure
3. **Test individual endpoints** using the Python script
4. **Check browser network tab** for API request/response details

## API Endpoints

### Data Management Endpoints

- `GET /data-management/sync-logs` - Get recent sync logs
- `GET /data-management/stats` - Get data statistics
- `POST /data-management/upload/regions` - Upload regions CSV
- `POST /data-management/upload/locations` - Upload locations CSV
- `POST /data-management/upload/assets` - Upload assets CSV

### Authentication

All endpoints require admin authentication:
- Include `Authorization: Bearer <token>` header
- Token obtained from `/auth/token` endpoint

## Success Criteria

✅ **Backend API**: All endpoints respond correctly  
✅ **File Upload**: CSV files are processed successfully  
✅ **Data Storage**: Sync logs are created and stored  
✅ **Error Handling**: Invalid files are rejected with proper messages  
✅ **Frontend UI**: Upload interface works correctly  
✅ **Real-time Updates**: Data refreshes after successful uploads  
✅ **Admin Protection**: Only admin users can access upload functionality 