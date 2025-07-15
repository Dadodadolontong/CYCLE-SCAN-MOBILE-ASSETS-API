import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Database, MapPin, Package, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CsvUpload from "@/components/CsvUpload";

const DataImport = () => {
  const navigate = useNavigate();

  const handleImportSuccess = () => {
    // Optionally refresh data or show additional feedback
    console.log('Import completed successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Data Import</h1>
              <p className="text-muted-foreground">
                Import regions, locations and assets from CSV files
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="regions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="regions" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regions
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Assets
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="regions" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Import Regions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file containing region data. Regions must be associated with existing countries.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Before importing:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Ensure your CSV has the correct headers: country-code, region-name, branch-name (optional)</li>
                        <li>Region names should be unique within each country</li>
                        <li>Country codes must match existing countries (e.g., US, ID, UK)</li>
                        <li>Branch names will be created under the region if provided</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">CSV Headers:</h4>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        country-code, region-name, branch-name
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required: country-code, region-name | Optional: branch-name
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <CsvUpload type="regions" onSuccess={handleImportSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="locations" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Import Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file containing location data. This will create new location records in the system.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Before importing:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Ensure your CSV has the correct headers: location-name, description, erp_location_id, branch-name</li>
                        <li>Location names should be unique</li>
                        <li>ERP Location IDs should match your external system if applicable</li>
                        <li>Branch names should match existing branches if provided</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <CsvUpload type="locations" onSuccess={handleImportSuccess} />
            </div>
          </TabsContent>
          
          <TabsContent value="assets" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Import Assets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file containing asset data. Assets will be linked to existing locations.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Before importing:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Import locations first if they don't exist yet</li>
                        <li>Ensure location-name values match existing locations exactly</li>
                        <li>Asset names and ERP Asset IDs should be unique</li>
                        <li>Status field can be: active, inactive, disposed (defaults to active)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">CSV Headers:</h4>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        name, erp_asset_id, location-name, barcode, category, model, build, status
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required: name, erp_asset_id | Optional: all others
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <CsvUpload type="assets" onSuccess={handleImportSuccess} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataImport;