import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Clock } from "lucide-react";

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

interface ScannedItemsListProps {
  items: CycleCountItemWithAsset[];
}

const ScannedItemsList = ({ items }: ScannedItemsListProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No items scanned yet. Start scanning to see items here.
      </div>
    );
  }

  const hasLocationMismatch = (item: CycleCountItemWithAsset) => {
    return item.expected_location !== item.actual_location;
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className={`${hasLocationMismatch(item) ? 'border-warning' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {item.asset?.name || 'Unknown Asset'}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {hasLocationMismatch(item) && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Location Mismatch
                  </Badge>
                )}
                <Badge variant="secondary">
                  {item.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Barcode</p>
                <p className="font-mono">{item.asset?.barcode || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Category</p>
                <p>{item.asset?.category || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Asset Location</p>
                  <p>{item.expected_location || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Scan Location</p>
                  <p>{item.actual_location || 'N/A'}</p>
                </div>
              </div>
            </div>

            {item.counted_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Scanned: {new Date(item.counted_at).toLocaleString()}
                </span>
              </div>
            )}

            {item.notes && (
              <div className="text-sm">
                <p className="text-muted-foreground">Notes</p>
                <p>{item.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScannedItemsList;