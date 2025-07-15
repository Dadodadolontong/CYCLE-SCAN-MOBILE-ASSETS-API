import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateCsvFile, sanitizeFilename, generateSecureUploadPath, createSecurityAuditLog } from "@/lib/security-enhanced";
import { useAuth } from "@/contexts/FastAPIAuthContext";
import { useUploadRegionsCsv, useUploadLocationsCsv, useUploadAssetsCsv } from "@/hooks/useDataManagement";

interface CsvUploadProps {
  type: 'regions' | 'locations' | 'assets';
  onSuccess?: () => void;
}

const CsvUpload = ({ type, onSuccess }: CsvUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use the appropriate upload mutation based on type
  const uploadRegionsMutation = useUploadRegionsCsv();
  const uploadLocationsMutation = useUploadLocationsCsv();
  const uploadAssetsMutation = useUploadAssetsCsv();

  const getUploadMutation = () => {
    switch (type) {
      case 'regions':
        return uploadRegionsMutation;
      case 'locations':
        return uploadLocationsMutation;
      case 'assets':
        return uploadAssetsMutation;
      default:
        return uploadAssetsMutation;
    }
  };

  const expectedHeaders = type === 'regions'
    ? ['region-name', 'country-code', 'controller-email (optional)']
    : type === 'locations' 
    ? ['location-name', 'description', 'erp_location_id']
    : ['name', 'erp_asset_id', 'location-name', 'barcode', 'category', 'model', 'build', 'status'];

  const requiredHeaders = type === 'regions'
    ? ['region-name', 'country-code']
    : type === 'locations'
    ? ['location-name']
    : ['name', 'erp_asset_id'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Comprehensive file validation
      const validation = validateCsvFile(selectedFile);
      if (!validation.isValid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
      
      // Security audit log for file selection
      createSecurityAuditLog('csv_file_selected', 'storage', undefined, {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        type: type
      });
      
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    // Check authentication
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to upload files.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Get the appropriate upload mutation
      const uploadMutation = getUploadMutation();
      
      // Upload and process the file
      const result = await uploadMutation.mutateAsync(file);
      
      setUploadResult(result);
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
          variant: "default",
        });
        setFile(null);
        onSuccess?.();
      } else {
        toast({
          title: "Import Failed",
          description: result.message,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload {type === 'regions' ? 'Regions' : type === 'locations' ? 'Locations' : 'Assets'} CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* File Format Information */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Expected CSV format:</strong></p>
              <div className="text-sm font-mono bg-muted p-2 rounded">
                {expectedHeaders.join(', ')}
              </div>
              <p className="text-sm">
                <strong>Required fields:</strong> {requiredHeaders.join(', ')}
              </p>
              {type === 'regions' && (
                <p className="text-sm text-muted-foreground">
                  Note: The system accepts various column names (region-name, region_name, region, name) and (country-code, country_code, country, code). 
                  Controller email is optional. Column order doesn't matter.
                </p>
              )}
              {type === 'assets' && (
                <p className="text-sm text-muted-foreground">
                  Note: location-name must match existing locations exactly (case-insensitive)
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              <br />
              <span className="text-xs text-green-600">✓ File validated</span>
            </p>
          )}
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Process
            </>
          )}
        </Button>

        {/* Results */}
        {uploadResult && (
          <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className={uploadResult.success ? "text-green-800" : "text-red-800"}>
                  {uploadResult.message || uploadResult.error}
                </p>
                {uploadResult.details && (
                  <div className="text-sm">
                    <p>Successfully processed: {uploadResult.details.successCount}</p>
                    {uploadResult.details.errorCount > 0 && (
                      <>
                        <p>Errors: {uploadResult.details.errorCount}</p>
                        {uploadResult.details.errors?.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Sample errors:</p>
                            <ul className="list-disc list-inside text-xs space-y-1">
                              {uploadResult.details.errors.map((error: string, index: number) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CsvUpload;