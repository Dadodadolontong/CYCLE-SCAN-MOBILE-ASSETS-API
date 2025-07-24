import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useSyncLogs, SyncLog } from '@/hooks/useDataManagement';

export const ImportErrorViewer = () => {
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const { data: syncLogs, isLoading, refetch } = useSyncLogs(50);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const downloadErrorReport = (log: SyncLog) => {
    const errorData = {
      fileName: log.file_name,
      syncType: log.sync_type,
      startedAt: log.started_at,
      completedAt: log.completed_at,
      recordsProcessed: log.records_processed,
      errorsCount: log.errors_count,
      errorDetails: log.error_details
    };

    const blob = new Blob([JSON.stringify(errorData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${log.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Import Error Viewer
            </CardTitle>
            <CardDescription>
              View detailed error logs for CSV import operations
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sync Logs List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Import Logs</h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {syncLogs?.map((log) => (
                  <Card 
                    key={log.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedLog?.id === log.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.started_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{log.sync_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.file_name || 'No file'}
                        </p>
                        <div className="flex justify-between text-sm">
                          <span>Records: {log.records_processed || 0}</span>
                          <span className="text-destructive">
                            Errors: {log.errors_count || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Error Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Error Details</h3>
            {selectedLog ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {selectedLog.file_name || 'Unknown File'}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadErrorReport(selectedLog)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <CardDescription>
                    {selectedLog.sync_type} • {format(new Date(selectedLog.started_at), 'PPpp')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2" variant={getStatusColor(selectedLog.status)}>
                        {selectedLog.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Records Processed:</span>
                      <span className="ml-2">{selectedLog.records_processed || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium">Errors Count:</span>
                      <span className="ml-2 text-destructive">{selectedLog.errors_count || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <span className="ml-2">
                        {selectedLog.completed_at 
                          ? `${Math.round((new Date(selectedLog.completed_at).getTime() - new Date(selectedLog.started_at).getTime()) / 1000)}s`
                          : 'In progress'
                        }
                      </span>
                    </div>
                  </div>

                  {selectedLog.error_details && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Error Details:</h4>
                        <ScrollArea className="h-[200px] w-full rounded border p-3">
                          <pre className="text-xs whitespace-pre-wrap break-words">
                            {typeof selectedLog.error_details === 'string' 
                              ? selectedLog.error_details 
                              : JSON.stringify(selectedLog.error_details, null, 2)
                            }
                          </pre>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Select a log entry to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};