import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AssetList, { Asset } from "@/components/AssetList";

interface CycleCountAssetListProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  assets: Asset[];
  onAssetToggle: (assetId: string) => void;
}

const CycleCountAssetList = ({ searchTerm, setSearchTerm, assets, onAssetToggle }: CycleCountAssetListProps) => {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search counted assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Counted Assets ({assets.length})</h3>
        <AssetList assets={assets} onAssetToggle={onAssetToggle} />
      </div>
    </div>
  );
};

export default CycleCountAssetList;