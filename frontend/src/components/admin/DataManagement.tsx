import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CsvUpload from '@/components/CsvUpload';
import { Database, Upload, History, AlertCircle, Globe } from 'lucide-react';
import { ImportErrorViewer } from '@/components/admin/ImportErrorViewer';
import { useSyncLogs, useDataStats } from '@/hooks/useDataManagement';

export const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('import');

  const { data: syncLogs, isLoading } = useSyncLogs(20);
  const { data: stats } = useDataStats();

  const handleImportSuccess = () => {
    // Refresh data after successful import
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Data Management</h2>
        <p className="text-muted-foreground">Import and manage your asset and location data</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_assets || 0}</div>
            <p className="text-xs text-muted-foreground">Assets in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_locations || 0}</div>
            <p className="text-xs text-muted-foreground">Locations configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Imports</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successful_imports || 0}</div>
            <p className="text-xs text-muted-foreground">Completed operations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Import History
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Import Errors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Import Regions
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to import region data into the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Required CSV headers:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>country-code (required)</li>
                        <li>region-name (required)</li>
                        <li>branch-name (optional)</li>
                      </ul>
                    </div>
                  <CsvUpload 
                    type="regions" 
                    onSuccess={handleImportSuccess}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Locations</CardTitle>
                <CardDescription>
                  Upload a CSV file to import location data into the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Required CSV headers:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>name (required)</li>
                        <li>description (optional)</li>
                        <li>erp_location_id (optional)</li>
                        <li>branch-name (optional)</li>
                      </ul>
                    </div>
                  <CsvUpload 
                    type="locations" 
                    onSuccess={handleImportSuccess}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Assets</CardTitle>
                <CardDescription>
                  Upload a CSV file to import asset data into the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Required CSV headers:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>erp_asset_id (required)</li>
                      <li>name (required)</li>
                      <li>barcode (optional)</li>
                      <li>category (optional)</li>
                      <li>model (optional)</li>
                      <li>build (optional)</li>
                      <li>status (optional)</li>
                      <li>location (optional - location name)</li>
                    </ul>
                  </div>
                  <CsvUpload 
                    type="assets" 
                    onSuccess={handleImportSuccess}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Import History</span>
              </CardTitle>
              <CardDescription>
                View the history of all data import operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : syncLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No import history found</p>
                  <p className="text-sm">Import data using the forms above to see history here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.sync_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(log.status)} className="capitalize">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{log.records_processed || 0} processed</p>
                            {log.errors_count > 0 && (
                              <p className="text-red-600">{log.errors_count} errors</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {log.file_name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(log.started_at).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">
                              {new Date(log.started_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.completed_at ? (
                            <span className="text-sm">
                              {Math.round(
                                (new Date(log.completed_at).getTime() - 
                                 new Date(log.started_at).getTime()) / 1000
                              )}s
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ImportErrorViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};