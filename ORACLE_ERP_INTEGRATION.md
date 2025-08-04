# Oracle ERP Integration

This document describes the Oracle ERP integration system that connects directly to the Oracle database to sync asset data.

## Overview

The Oracle ERP integration replaces the previous REST API-based approach with a direct database connection to Oracle. This provides:

- **Direct Database Access**: Connect directly to Oracle ERP database
- **Incremental Sync**: Only sync assets updated since last sync
- **Automatic Mapping**: Map Oracle fields to internal asset structure
- **Sync History**: Track all sync operations with detailed logs
- **Location Mapping**: Map ERP location IDs to internal locations

## Configuration

### Environment Variables

Add the following Oracle database configuration to your `.env` file:

```env
# Oracle Database Configuration for ERP
ORACLE_HOST=your-oracle-host
ORACLE_PORT=1521
ORACLE_SERVICE=your-oracle-service
ORACLE_USERNAME=your-oracle-username
ORACLE_PASSWORD=your-oracle-password
ORACLE_SCHEMA=your-oracle-schema

# ERP Integration Configuration
ERP_API_TIMEOUT=30
ERP_DEFAULT_BATCH_SIZE=100
ERP_MAX_RETRIES=3
```

### Database Setup

Run the migration script to create the required table:

```bash
cd backend
python create_erp_sync_table.py
```

## Oracle Database Schema

The integration expects the following Oracle table structure:

```sql
-- Oracle ERP Assets Table
CREATE TABLE fa_assets (
    tag_number VARCHAR2(64) NOT NULL,
    asset_name VARCHAR2(255) NOT NULL,
    model VARCHAR2(128),
    build VARCHAR2(128),
    location_id VARCHAR2(64) NOT NULL,
    last_updated_date DATE NOT NULL
);
```

### Field Mapping

| Oracle Field | Internal Field | Description |
|--------------|----------------|-------------|
| `tag_number` | `barcode` | Asset barcode/tag number |
| `asset_name` | `name` | Asset name/description |
| `model` | `model` | Asset model |
| `build` | `build` | Asset build |
| `location_id` | `location` | ERP location ID (mapped to internal location) |

## API Endpoints

### 1. Sync Assets from Oracle

**POST** `/erp/sync-assets`

Sync assets from Oracle ERP database.

**Query Parameters:**
- `force_full_sync` (boolean, optional): Force full sync instead of incremental

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 150 assets from Oracle ERP",
  "assets_processed": 150,
  "assets_created": 25,
  "assets_updated": 125,
  "errors": [],
  "details": {
    "last_sync_date": "2024-01-15T10:30:00",
    "current_sync_date": "2024-01-15T11:00:00",
    "total_records": 150,
    "sync_log_id": "uuid",
    "force_full_sync": false
  }
}
```

### 2. Test Oracle Connection

**GET** `/erp/test-connection`

Test connection to Oracle ERP database.

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to Oracle ERP database",
  "total_assets": 1250,
  "sample_data": [
    {
      "tag_number": "ASSET001",
      "asset_name": "Laptop Dell XPS 13",
      "model": "XPS 13 9310",
      "build": "2023",
      "location_id": "LOC001"
    }
  ]
}
```

### 3. Get Sync History

**GET** `/erp/sync-history`

Get Oracle ERP sync history.

**Query Parameters:**
- `limit` (integer, optional): Number of records to return (default: 50, max: 100)

**Response:**
```json
{
  "sync_logs": [
    {
      "id": "uuid",
      "sync_type": "oracle_asset_sync",
      "status": "completed",
      "started_at": "2024-01-15T10:30:00",
      "completed_at": "2024-01-15T10:35:00",
      "assets_synced": 150,
      "errors_count": 0,
      "initiated_by": "user-uuid",
      "error_details": null
    }
  ],
  "total": 1
}
```

### 4. Get Sync Configuration

**GET** `/erp/sync-config`

Get current sync configuration and last sync date.

**Response:**
```json
{
  "sync_type": "asset_sync",
  "last_sync_date": "2024-01-15T10:30:00",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-15T10:35:00"
}
```

### 5. Get Locations Mapping

**GET** `/erp/locations-mapping`

Get mapping of ERP location IDs to internal location IDs.

**Response:**
```json
{
  "locations_mapping": [
    {
      "internal_id": "uuid",
      "internal_name": "Main Office",
      "erp_location_id": "LOC001",
      "description": "Main office building"
    }
  ],
  "total_mapped_locations": 1
}
```

## Sync Process

### 1. Incremental Sync (Default)

The system performs incremental syncs by default:

1. **Get Last Sync Date**: Retrieve the last successful sync date from `erp_sync_configs` table
2. **Query Oracle**: Execute query to get assets updated since last sync:
   ```sql
   SELECT tag_number, asset_name, model, build, location_id 
   FROM fa_assets 
   WHERE last_updated_date > :last_sync_date
   ORDER BY last_updated_date
   ```
3. **Process Assets**: For each asset:
   - Map Oracle data to internal schema
   - Find location by ERP location ID
   - Create new asset or update existing one
4. **Update Sync Date**: Update last sync date to current time
5. **Log Results**: Record sync operation in `sync_logs` table

### 2. Full Sync

To perform a full sync, set `force_full_sync=true`:

- Uses a default date (2020-01-01) as the last sync date
- Processes all assets in the Oracle database
- Useful for initial setup or data recovery

## Location Mapping

Before syncing assets, ensure locations are properly mapped:

1. **Create Locations**: Create locations in the internal system
2. **Set ERP Location ID**: Set the `erp_location_id` field for each location
3. **Verify Mapping**: Use the `/erp/locations-mapping` endpoint to verify

Example location setup:
```sql
INSERT INTO locations (id, name, description, erp_location_id) 
VALUES ('uuid', 'Main Office', 'Main office building', 'LOC001');
```

## Error Handling

The system handles various error scenarios:

- **Oracle Connection Errors**: Connection failures are logged and reported
- **Missing Locations**: Assets with unmapped location IDs are skipped and logged
- **Data Validation**: Invalid or missing required fields are logged
- **Database Errors**: Integrity errors and other database issues are handled gracefully

## Testing

Use the provided test script to verify the integration:

```bash
python test-erp-integration.py
```

The test script will:
1. Authenticate with admin credentials
2. Test Oracle database connection
3. Get sync configuration
4. Get locations mapping
5. Get sync history

## Monitoring

Monitor the integration through:

1. **Sync Logs**: Check `/erp/sync-history` for sync operation details
2. **Application Logs**: Monitor backend logs for detailed error information
3. **Database**: Check `sync_logs` and `erp_sync_configs` tables directly

## Security Considerations

- **Database Credentials**: Store Oracle credentials securely in environment variables
- **Network Security**: Ensure secure network access to Oracle database
- **Access Control**: Only admin users can perform ERP sync operations
- **Audit Trail**: All sync operations are logged with user information

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify Oracle host, port, and service name
   - Check network connectivity
   - Verify credentials

2. **No Assets Synced**
   - Check if `last_updated_date` field exists in Oracle table
   - Verify location mapping
   - Check sync configuration

3. **Location Mapping Errors**
   - Ensure locations have `erp_location_id` set
   - Verify ERP location IDs match Oracle data

4. **Permission Errors**
   - Ensure Oracle user has SELECT permission on `fa_assets` table
   - Check if user has access to the specified schema

### Debug Steps

1. Test Oracle connection using `/erp/test-connection`
2. Check sync configuration using `/erp/sync-config`
3. Verify location mapping using `/erp/locations-mapping`
4. Review sync history for error details
5. Check backend logs for detailed error information 