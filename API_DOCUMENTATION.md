# API Documentation
# Asset Management System

## Overview

- **Base URL**: `http://localhost:8000/api`
- **Authentication**: JWT Bearer tokens
- **Content-Type**: `application/json`

## Authentication

### Login
```bash
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=password123
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "display_name": "John Doe",
    "roles": ["admin"]
  }
}
```

### OAuth Flow
```bash
GET /auth/oauth-providers
GET /auth/authorize/{provider}
GET /auth/callback?code=...&state=...
```

## Core APIs

### Assets

#### List Assets
```bash
GET /assets?skip=0&limit=100&search=laptop&location=loc-id&status=active
Authorization: Bearer <token>
```

**Response:**
```json
{
  "items": [
    {
      "id": "asset-id",
      "erp_asset_id": 12345,
      "name": "Laptop Dell XPS 13",
      "barcode": "LAP001",
      "model": "XPS 13",
      "build": "2023",
      "category": "Electronics",
      "location": "location-id",
      "status": "active",
      "last_seen": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "synced_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "skip": 0,
  "limit": 100
}
```

#### Create Asset
```bash
POST /assets
Authorization: Bearer <token>
Content-Type: application/json

{
  "erp_asset_id": 12345,
  "name": "Laptop Dell XPS 13",
  "barcode": "LAP001",
  "model": "XPS 13",
  "build": "2023",
  "category": "Electronics",
  "location": "location-id",
  "status": "active"
}
```

#### Get Asset
```bash
GET /assets/{asset_id}
Authorization: Bearer <token>
```

#### Update Asset
```bash
PUT /assets/{asset_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Laptop Name",
  "status": "inactive"
}
```

#### Delete Asset
```bash
DELETE /assets/{asset_id}
Authorization: Bearer <token>
```

### Locations

#### List Locations
```bash
GET /locations?skip=0&limit=100&search=building&branch_id=branch-id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "items": [
    {
      "id": "location-id",
      "name": "Building A - Floor 1",
      "description": "Main office building, first floor",
      "erp_location_id": 1001,
      "branch_id": "branch-id",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "skip": 0,
  "limit": 100
}
```

#### Create Location
```bash
POST /locations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Building A - Floor 1",
  "description": "Main office building, first floor",
  "erp_location_id": 1001,
  "branch_id": "branch-id"
}
```

### Geographic Hierarchy

#### Countries
```bash
GET /countries
POST /countries
Authorization: Bearer <token>
```

#### Regions
```bash
GET /regions
POST /regions
Authorization: Bearer <token>
```

#### Branches
```bash
GET /branches?skip=0&limit=100&search=office&region_id=region-id
POST /branches
Authorization: Bearer <token>
```

### Users & Roles

#### Users
```bash
GET /users
POST /users
Authorization: Bearer <token>
```

#### User Roles
```bash
GET /user-roles
POST /user-roles
Authorization: Bearer <token>
```

#### User Assignments
```bash
GET /user-assignments
POST /user-assignments
Authorization: Bearer <token>
```

### Cycle Counting

#### Cycle Count Tasks
```bash
GET /cycle-count-tasks?status=active&assigned_to=user-id
POST /cycle-count-tasks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Monthly Asset Count",
  "description": "Monthly cycle count for all assets",
  "location_filter": "location-id",
  "category_filter": "Electronics",
  "status": "draft",
  "assigned_to": "user-id"
}
```

#### Cycle Count Items
```bash
GET /cycle-count-items?task_id=task-id&status=counted
POST /cycle-count-items
PUT /cycle-count-items/{item_id}
Authorization: Bearer <token>
```

**Update Item:**
```json
{
  "actual_location": "Building A - Floor 2",
  "status": "counted",
  "notes": "Asset found in different location"
}
```

### Categories
```bash
GET /categories
POST /categories
Authorization: Bearer <token>
```

### Temp Assets
```bash
GET /temp-assets?converted=FALSE&cycle_count_task_id=task-id
POST /temp-assets
Authorization: Bearer <token>
```

### Asset Transfers
```bash
GET /asset-transfers?status=pending
POST /asset-transfers
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "source_location_id": "source-location-id",
  "destination_location_id": "dest-location-id",
  "items": [
    {
      "asset_id": "asset-id",
      "barcode": "LAP001"
    }
  ]
}
```

## ERP Integration APIs

### Test Connection
```bash
POST /erp/test-connection
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "host": "oracle-host",
    "port": 1521,
    "service": "service-name",
    "connection_time": "0.5s"
  }
}
```

### Sync Assets
```bash
POST /erp/sync-assets?force_full_sync=false
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Asset sync task queued successfully",
  "task_id": "task-uuid",
  "details": {
    "sync_type": "incremental",
    "estimated_duration": "5-10 minutes"
  }
}
```

### Sync Locations
```bash
POST /erp/sync-locations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Location sync task queued successfully",
  "task_id": "task-uuid"
}
```

### Sync History
```bash
GET /erp/sync-history?limit=50&sync_type=asset_sync
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "sync-log-id",
    "sync_type": "asset_sync",
    "status": "completed",
    "started_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T10:05:00Z",
    "assets_synced": 150,
    "errors_count": 2,
    "error_details": ["Asset LAP001: Invalid location"],
    "initiated_by": "user-id",
    "task_id": "task-uuid"
  }
]
```

### Sync Configuration
```bash
GET /erp/sync-config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "asset_sync": {
    "last_sync_date": "2024-01-15T10:00:00Z",
    "total_assets_synced": 1500,
    "last_sync_status": "completed"
  },
  "location_sync": {
    "last_sync_date": "2024-01-15T09:00:00Z",
    "total_locations_synced": 50,
    "last_sync_status": "completed"
  }
}
```

### Locations Mapping
```bash
GET /erp/locations-mapping
Authorization: Bearer <token>
```

## Background Task APIs

### Task Status
```bash
GET /task-status/{task_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "task_id": "task-uuid",
  "status": "PROGRESS",
  "progress": {
    "total_records": 1000,
    "assets_processed": 500,
    "assets_created": 100,
    "assets_updated": 400,
    "locations_synced": 0
  },
  "message": "Processing asset 500 of 1000...",
  "started_at": "2024-01-15T10:00:00Z",
  "estimated_completion": "2024-01-15T10:05:00Z"
}
```

### Task History
```bash
GET /tasks/history?limit=50&status=SUCCESS
Authorization: Bearer <token>
```

## Error Handling

### Error Response Format
```json
{
  "detail": [
    {
      "type": "validation_error",
      "loc": ["body", "field_name"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

## Examples

### Complete Workflow

#### 1. Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin123"
```

#### 2. Create Asset
```bash
curl -X POST "http://localhost:8000/api/assets" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "erp_asset_id": 12345,
    "name": "Laptop Dell XPS 13",
    "barcode": "LAP001",
    "model": "XPS 13",
    "build": "2023",
    "category": "Electronics",
    "location": "location-id",
    "status": "active"
  }'
```

#### 3. Sync from ERP
```bash
curl -X POST "http://localhost:8000/api/erp/sync-assets" \
  -H "Authorization: Bearer <token>"
```

#### 4. Check Task Status
```bash
curl -X GET "http://localhost:8000/api/task-status/<task-id>" \
  -H "Authorization: Bearer <token>"
```

### Pagination Examples

#### Get Assets with Pagination
```bash
curl -X GET "http://localhost:8000/api/assets?skip=0&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Search Assets
```bash
curl -X GET "http://localhost:8000/api/assets?search=laptop&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Filter by Location
```bash
curl -X GET "http://localhost:8000/api/assets?location=location-id&status=active" \
  -H "Authorization: Bearer <token>"
```

## Rate Limiting

- **Authentication**: 5 requests/minute
- **Asset endpoints**: 100 requests/minute
- **ERP sync**: 10 requests/minute
- **Background tasks**: 50 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Common Error Responses

### Validation Error
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "erp_asset_id"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

### Authentication Error
```json
{
  "detail": "Not authenticated"
}
```

### Permission Error
```json
{
  "detail": "Insufficient permissions"
}
```

### Not Found Error
```json
{
  "detail": "Asset not found"
}
``` 