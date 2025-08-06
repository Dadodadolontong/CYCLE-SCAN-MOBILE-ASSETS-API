import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  GitBranch, 
  Settings, 
  Play, 
  Calendar, 
  Clock, 
  Database, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  useERPSyncHistory, 
  useERPSyncConfig, 
  useTestOracleConnection, 
  useSyncAssetsFromOracle, 
  useSyncLocationsFromOracle,
  useTaskStatus
} from '@/hooks/useERPIntegration';
import { format } from 'date-fns';

export const ERPScheduling = () => {
  const [forceFullSync, setForceFullSync] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Hooks
  const { data: syncHistory, isLoading: historyLoading } = useERPSyncHistory(20);
  const { data: syncConfig, isLoading: configLoading } = useERPSyncConfig();
  const testConnection = useTestOracleConnection();
  const syncAssets = useSyncAssetsFromOracle();
  const syncLocations = useSyncLocationsFromOracle();
  const { data: taskStatus } = useTaskStatus(currentTaskId);

  const handleAssetSync = () => {
    syncAssets.mutate({ forceFullSync }, {
      onSuccess: (data) => {
        setCurrentTaskId(data.task_id);
      }
    });
  };

  const handleLocationSync = () => {
    syncLocations.mutate(undefined, {
      onSuccess: (data) => {
        setCurrentTaskId(data.task_id);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
      case 'progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTaskProgress = () => {
    if (!currentTaskId || !taskStatus) return null;

    const { status, progress, result, error } = taskStatus;

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Background Task Progress</span>
          </CardTitle>
          <CardDescription>Task ID: {currentTaskId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              {getStatusBadge(status)}
            </div>
            
            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Message:</span>
                  <span className="text-muted-foreground">{progress.message}</span>
                </div>
                
                {progress.total_records !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Assets from Oracle:</span>
                    <span className="text-muted-foreground font-medium">{progress.total_records}</span>
                  </div>
                )}
                
                {progress.progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress:</span>
                      <span className="text-muted-foreground">{progress.progress}</span>
                    </div>
                    {progress.total_records && progress.assets_processed !== undefined && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((progress.assets_processed / progress.total_records) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
                
                {progress.assets_processed !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Assets Processed:</span>
                    <span className="text-muted-foreground">{progress.assets_processed}</span>
                  </div>
                )}
                
                {progress.assets_created !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Assets Created:</span>
                    <span className="text-muted-foreground text-green-600">{progress.assets_created}</span>
                  </div>
                )}
                
                {progress.assets_updated !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Assets Updated:</span>
                    <span className="text-muted-foreground text-blue-600">{progress.assets_updated}</span>
                  </div>
                )}
                
                {progress.locations_synced !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Locations Synced:</span>
                    <span className="text-muted-foreground">{progress.locations_synced}</span>
                  </div>
                )}
              </div>
            )}
            
            {status === 'SUCCESS' && result && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
                <div className="text-sm text-green-800">
                  <div className="font-medium">Task completed successfully!</div>
                  <div>{result.message}</div>
                  {result.assets_processed !== undefined && (
                    <div>Assets processed: {result.assets_processed}</div>
                  )}
                  {result.assets_created !== undefined && (
                    <div>Assets created: <span className="font-medium">{result.assets_created}</span></div>
                  )}
                  {result.assets_updated !== undefined && (
                    <div>Assets updated: <span className="font-medium">{result.assets_updated}</span></div>
                  )}
                  {result.locations_synced !== undefined && (
                    <div>Locations synced: <span className="font-medium">{result.locations_synced}</span></div>
                  )}
                  {result.details?.total_records && (
                    <div>Total records from Oracle: <span className="font-medium">{result.details.total_records}</span></div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setCurrentTaskId(null)}
                >
                  Close
                </Button>
              </div>
            )}
            
            {status === 'FAILURE' && error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded">
                <div className="text-sm text-red-800">
                  <div className="font-medium">Task failed!</div>
                  <div>{error}</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setCurrentTaskId(null)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">ERP Sync Management</h2>
          <p className="text-muted-foreground">Manage Oracle ERP data synchronization</p>
        </div>
        <Button
          onClick={() => testConnection.mutate()}
          disabled={testConnection.isPending}
          variant="outline"
          size="sm"
        >
          {testConnection.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Test Connection
        </Button>
      </div>

      {/* Task Progress */}
      {renderTaskProgress()}

      {/* Sync Configuration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Sync Configuration</span>
          </CardTitle>
          <CardDescription>Current ERP sync status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : syncConfig ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {syncConfig.total_assets_synced || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Assets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {syncConfig.total_locations_synced || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Locations</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {syncConfig.last_asset_sync ? 
                    (() => {
                      try {
                        return format(new Date(syncConfig.last_asset_sync), 'MMM dd, yyyy HH:mm');
                      } catch {
                        return 'Invalid Date';
                      }
                    })() : 
                    'Never'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Asset Sync</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {syncConfig.last_location_sync ? 
                    (() => {
                      try {
                        return format(new Date(syncConfig.last_location_sync), 'MMM dd, yyyy HH:mm');
                      } catch {
                        return 'Invalid Date';
                      }
                    })() : 
                    'Never'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Location Sync</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No sync configuration available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Sync Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Asset Sync</span>
            </CardTitle>
            <CardDescription>Synchronize assets from Oracle ERP (Background Task)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceFullSync"
                checked={forceFullSync}
                onChange={(e) => setForceFullSync(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="forceFullSync" className="text-sm">
                Force full sync (ignore last sync date)
              </label>
            </div>
            <Button
              onClick={handleAssetSync}
              disabled={syncAssets.isPending || (currentTaskId && taskStatus?.status === 'PENDING')}
              className="w-full"
            >
              {syncAssets.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Asset Sync
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Location Sync</span>
            </CardTitle>
            <CardDescription>Synchronize locations from Oracle ERP (Background Task)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLocationSync}
              disabled={syncLocations.isPending || (currentTaskId && taskStatus?.status === 'PENDING')}
              className="w-full"
            >
              {syncLocations.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Start Location Sync
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Sync History</span>
          </CardTitle>
          <CardDescription>Monitor ERP synchronization operations and their results</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : syncHistory?.sync_logs && syncHistory.sync_logs.length > 0 ? (
            <div className="space-y-4">
              {syncHistory.sync_logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium capitalize">
                        {log.sync_type ? log.sync_type.replace('_', ' ') : 'Unknown'} Sync
                      </span>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Started:</span>
                      <br />
                      {log.started_at ? 
                        (() => {
                          try {
                            return format(new Date(log.started_at), 'MMM dd, yyyy HH:mm');
                          } catch {
                            return 'Invalid Date';
                          }
                        })() : 
                        'Unknown'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Completed:</span>
                      <br />
                      {log.completed_at ? 
                        (() => {
                          try {
                            return format(new Date(log.completed_at), 'MMM dd, yyyy HH:mm');
                          } catch {
                            return 'Invalid Date';
                          }
                        })() : 
                        'In Progress'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Assets Synced:</span>
                      <br />
                      {log.assets_synced || 0}
                    </div>
                    <div>
                      <span className="font-medium">Errors:</span>
                      <br />
                      {log.errors_count || 0}
                    </div>
                  </div>
                  {log.error_details && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <span className="font-medium">Error:</span> {typeof log.error_details === 'string' ? log.error_details : JSON.stringify(log.error_details)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Sync History</h3>
              <p className="text-sm">
                No ERP synchronization operations have been performed yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};