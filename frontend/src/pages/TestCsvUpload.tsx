import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSyncLogs, useDataStats, useUploadRegionsCsv, useUploadLocationsCsv, useUploadAssetsCsv } from '@/hooks/useDataManagement';
import { Upload, Database, History, AlertCircle } from 'lucide-react';

export const TestCsvUpload = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const { toast } = useToast();
  
  // Hooks
  const { data: syncLogs, isLoading: logsLoading, refetch: refetchLogs } = useSyncLogs(10);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDataStats();
  
  const uploadRegionsMutation = useUploadRegionsCsv();
  const uploadLocationsMutation = useUploadLocationsCsv();
  const uploadAssetsMutation = useUploadAssetsCsv();

  const handleFileUpload = async (file: File, type: 'regions' | 'locations' | 'assets') => {
    try {
      let result;
      
      switch (type) {
        case 'regions':
          result = await uploadRegionsMutation.mutateAsync(file);
          break;
        case 'locations':
          result = await uploadLocationsMutation.mutateAsync(file);
          break;
        case 'assets':
          result = await uploadAssetsMutation.mutateAsync(file);
          break;
      }
      
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: result.message,
          variant: "default",
        });
        refetchLogs();
        refetchStats();
      } else {
        toast({
          title: "Upload Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'regions' | 'locations' | 'assets') => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CSV Upload Test</h1>
        <p className="text-muted-foreground">Test the CSV upload functionality</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Test
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Stats
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Sync Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Regions Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Test Regions Upload
                </CardTitle>
                <CardDescription>
                  Upload a regions CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Expected format:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    region-name,country-code,controller-email
                  </code>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => document.getElementById('regions-file')?.click()}
                  disabled={uploadRegionsMutation.isPending}
                >
                  {uploadRegionsMutation.isPending ? 'Uploading...' : 'Select Regions CSV'}
                </Button>
                <input
                  id="regions-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'regions')}
                />
              </CardContent>
            </Card>

            {/* Locations Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Test Locations Upload
                </CardTitle>
                <CardDescription>
                  Upload a locations CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Expected format:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    location-name,description,erp_location_id
                  </code>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => document.getElementById('locations-file')?.click()}
                  disabled={uploadLocationsMutation.isPending}
                >
                  {uploadLocationsMutation.isPending ? 'Uploading...' : 'Select Locations CSV'}
                </Button>
                <input
                  id="locations-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'locations')}
                />
              </CardContent>
            </Card>

            {/* Assets Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Test Assets Upload
                </CardTitle>
                <CardDescription>
                  Upload an assets CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Expected format:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    name,erp_asset_id,location-name,barcode
                  </code>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => document.getElementById('assets-file')?.click()}
                  disabled={uploadAssetsMutation.isPending}
                >
                  {uploadAssetsMutation.isPending ? 'Uploading...' : 'Select Assets CSV'}
                </Button>
                <input
                  id="assets-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'assets')}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Statistics
              </CardTitle>
              <CardDescription>
                Current system data statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.total_assets || 0}</div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.total_locations || 0}</div>
                    <p className="text-sm text-muted-foreground">Total Locations</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.successful_imports || 0}</div>
                    <p className="text-sm text-muted-foreground">Successful Imports</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Sync Logs
                  </CardTitle>
                  <CardDescription>
                    Latest import operation logs
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); refetchLogs(); }}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : syncLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sync logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syncLogs?.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{log.sync_type}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status === 'completed' ? 'bg-green-100 text-green-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>File: {log.file_name || 'N/A'}</p>
                        <p>Records: {log.records_processed || 0} | Errors: {log.errors_count || 0}</p>
                        <p>Started: {new Date(log.started_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 