# ERP Frontend Integration

This document describes the ERP (Oracle) integration that has been implemented in the frontend admin panel.

## Overview

The ERP integration allows administrators to:
- Test Oracle database connection
- Synchronize assets from Oracle ERP
- Synchronize locations from Oracle ERP
- View sync history and configuration
- Monitor sync status and results

## Components Implemented

### 1. FastAPI Client Extensions (`frontend/src/integrations/fastapi/client.ts`)

Added new interfaces and methods for ERP operations:

#### Interfaces:
- `ERPSyncResponse` - Response from sync operations
- `SyncLog` - Individual sync log entry
- `SyncHistoryResponse` - Collection of sync logs
- `ERPSyncConfig` - Current sync configuration
- `OracleConnectionTest` - Connection test result

#### Methods:
- `syncAssetsFromOracle(forceFullSync: boolean)` - Sync assets from Oracle
- `syncLocationsFromOracle()` - Sync locations from Oracle
- `getSyncHistory(limit: number)` - Get sync history
- `testOracleConnection()` - Test Oracle connection
- `getSyncConfig()` - Get current sync configuration
- `getLocationsMapping()` - Get location mappings

### 2. React Query Hooks (`frontend/src/hooks/useERPIntegration.ts`)

Created custom hooks for ERP operations using React Query:

#### Hooks:
- `useERPSyncHistory(limit)` - Query hook for sync history
- `useERPSyncConfig()` - Query hook for sync configuration
- `useTestOracleConnection()` - Mutation hook for connection testing
- `useSyncAssetsFromOracle()` - Mutation hook for asset sync
- `useSyncLocationsFromOracle()` - Mutation hook for location sync

#### Features:
- Automatic error handling with toast notifications
- Query invalidation for real-time updates
- Loading states and optimistic updates
- Proper TypeScript typing

### 3. Admin Panel Component (`frontend/src/components/admin/ERPScheduling.tsx`)

Replaced placeholder component with full ERP management interface:

#### Features:
- **Connection Testing**: Test Oracle database connectivity
- **Sync Configuration Overview**: Display current sync status and statistics
- **Manual Sync Actions**: 
  - Asset sync with force full sync option
  - Location sync
- **Sync History**: View recent sync operations with detailed status
- **Real-time Updates**: Automatic refresh of data after operations
- **Error Handling**: Comprehensive error display and user feedback

#### UI Components:
- Status badges and icons for different sync states
- Loading spinners for async operations
- Toast notifications for success/error feedback
- Responsive grid layout
- Date formatting using `date-fns`

## Backend Integration

The frontend integrates with these backend endpoints:

### ERP Endpoints:
- `GET /erp/test-connection` - Test Oracle connection
- `GET /erp/sync-config` - Get sync configuration
- `GET /erp/sync-history` - Get sync history
- `POST /erp/sync-assets` - Sync assets from Oracle
- `POST /erp/sync-locations` - Sync locations from Oracle
- `GET /erp/locations-mapping` - Get location mappings

### Authentication:
All ERP endpoints require admin role authentication.

## Usage

### Accessing ERP Sync
1. Navigate to the Admin Dashboard
2. Click on the "ERP Sync" tab
3. Use the interface to manage ERP synchronization

### Testing Connection
1. Click "Test Connection" button in the top-right
2. View the result in toast notification

### Syncing Assets
1. Optionally check "Force full sync" for complete sync
2. Click "Sync Assets" button
3. Monitor progress and view results

### Syncing Locations
1. Click "Sync Locations" button
2. Monitor progress and view results

### Viewing History
- Sync history is automatically displayed
- Shows detailed information about each sync operation
- Includes status, timestamps, and error details

## Configuration

### Environment Variables
The ERP integration uses these backend environment variables:
- `ORACLE_HOST` - Oracle database host
- `ORACLE_PORT` - Oracle database port
- `ORACLE_SERVICE` - Oracle service name
- `ORACLE_USERNAME` - Oracle username
- `ORACLE_PASSWORD` - Oracle password
- `ORACLE_SCHEMA` - Oracle schema
- `ORACLE_CLIENT_PATH` - Oracle client library path

### Frontend Configuration
The frontend uses the standard API configuration from `config.ts`.

## Error Handling

### Frontend Error Handling:
- Toast notifications for all operations
- Loading states during async operations
- Graceful handling of network errors
- User-friendly error messages

### Backend Error Handling:
- Comprehensive error logging
- Detailed error responses
- Connection timeout handling
- Oracle-specific error handling

## Testing

### Manual Testing:
1. Start the backend server
2. Start the frontend development server
3. Navigate to Admin Dashboard > ERP Sync
4. Test each operation manually

### Automated Testing:
Use the provided test script:
```bash
node test-erp-frontend-integration.js
```

## Future Enhancements

### Potential Improvements:
1. **Scheduled Syncs**: Add cron-based automatic sync scheduling
2. **Sync Filters**: Add filters for specific asset types or locations
3. **Progress Tracking**: Real-time progress bars for long-running syncs
4. **Email Notifications**: Send email alerts for sync failures
5. **Sync Reports**: Generate detailed sync reports and analytics
6. **Bulk Operations**: Support for bulk asset operations
7. **Sync Validation**: Pre-sync validation of data integrity

### Monitoring:
1. **Health Checks**: Regular health checks of Oracle connection
2. **Performance Metrics**: Track sync performance and timing
3. **Error Analytics**: Analyze common sync errors and patterns
4. **Usage Statistics**: Track sync usage and patterns

## Troubleshooting

### Common Issues:
1. **Connection Failures**: Check Oracle credentials and network connectivity
2. **Authentication Errors**: Ensure user has admin role
3. **Sync Failures**: Check Oracle data integrity and permissions
4. **Frontend Errors**: Check browser console for JavaScript errors

### Debug Steps:
1. Test Oracle connection first
2. Check backend logs for detailed error information
3. Verify environment variables are correctly set
4. Test individual endpoints using curl or Postman
5. Check frontend network tab for API call details 