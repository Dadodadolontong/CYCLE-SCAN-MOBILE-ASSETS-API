import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { type TempAsset } from "@/hooks/useTempAssets";
import ScannedItemsList from "./ScannedItemsList";
import TempAssetsList from "./TempAssetsList";

interface CycleCountItemWithAsset {
  id: string;
  expected_location: string | null;
  actual_location: string | null;
  status: string;
  counted_at: string | null;
  notes: string | null;
  asset?: {
    id: string;
    name: string;
    barcode: string | null;
    category: string | null;
    location_info?: {
      name: string;
    } | null;
  };
}

interface CycleCountTabsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  scannedItems: CycleCountItemWithAsset[];
  tempAssets: TempAsset[];
}

const CycleCountTabs = ({ searchTerm, setSearchTerm, scannedItems, tempAssets }: CycleCountTabsProps) => {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="scanned" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scanned">
            Scanned Items ({scannedItems.length})
          </TabsTrigger>
          <TabsTrigger value="temporary">
            Temporary Assets ({tempAssets.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scanned" className="mt-4">
          <ScannedItemsList items={scannedItems} />
        </TabsContent>
        
        <TabsContent value="temporary" className="mt-4">
          <TempAssetsList assets={tempAssets} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CycleCountTabs;