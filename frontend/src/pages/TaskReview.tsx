import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, User, CheckCircle, Clock, Package } from "lucide-react";
import { useCycleCountTaskById, useCycleCountItems } from "@/hooks/useCycleCountTasks";
import { useProfiles } from "@/hooks/useProfiles";
import { useAssets } from "@/hooks/useAssets";
import AssetList from "@/components/AssetList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TaskReview = () => {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { data: task, isLoading: taskLoading } = useCycleCountTaskById(taskId);
  const { data: countItems = [], isLoading: itemsLoading } = useCycleCountItems(taskId);
  const { data: profiles = [] } = useProfiles();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();

  if (taskLoading || itemsLoading || assetsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading task review...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Task Not Found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const assignedUser = profiles.find(p => p.id === task.assigned_to);
  const createdUser = profiles.find(p => p.id === task.created_by);
  
  // Calculate asset statuses based on count items and task scope
  const currentTaskLocation = task.location_filter || 'All locations';
  
  // Filter assets that were in scope for this task
  let scopedAssets = assets;
  if (task.location_filter) {
    scopedAssets = assets.filter(asset => 
      asset.location?.includes(task.location_filter!)
    );
  }
  
  // Get counted assets - those with count items having 'counted' status
  const countedAssetIds = countItems
    .filter(item => item.status === 'counted')
    .map(item => item.asset_id);
  const countedAssets = scopedAssets
    .filter(asset => countedAssetIds.includes(asset.id))
    .map(asset => ({ ...asset, status: 'counted' as const }));
  
  // Get missing assets - those in scope but not counted
  const missingAssets = scopedAssets
    .filter(asset => !countedAssetIds.includes(asset.id))
    .map(asset => ({ ...asset, status: 'pending' as const }));
    
  // Get temporary assets created during this task
  const tempAssets = assets
    .filter(a => a.category === 'Temporary' && a.location === currentTaskLocation)
    .map(asset => ({ ...asset, status: 'counted' as const }));

  const totalItems = scopedAssets.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 text-white">Active</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Task Review
              </h1>
              <p className="text-muted-foreground">
                Review completed cycle count task details and results
              </p>
            </div>
            {getStatusBadge(task.status)}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Task Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                {task.name}
              </CardTitle>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span className="ml-2">{task.location_filter || 'All locations'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Assigned to:</span>
                    <span className="ml-2">{assignedUser?.display_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Created by:</span>
                    <span className="ml-2">{createdUser?.display_name || 'Unknown'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Created:</span>
                    <span className="ml-2">{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  {task.started_at && (
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Started:</span>
                      <span className="ml-2">{new Date(task.started_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.completed_at && (
                    <div className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Completed:</span>
                      <span className="ml-2">{new Date(task.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Count Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems}</div>
                <p className="text-xs text-muted-foreground">Assets in task scope</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Counted</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{countedAssets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {totalItems > 0 ? Math.round((countedAssets.length / totalItems) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missing</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{missingAssets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {totalItems > 0 ? Math.round((missingAssets.length / totalItems) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Asset Details Tabs */}
          <Tabs defaultValue="counted" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="counted">Counted ({countedAssets.length})</TabsTrigger>
              <TabsTrigger value="missing">Missing ({missingAssets.length})</TabsTrigger>
              <TabsTrigger value="temporary">Temporary ({tempAssets.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="counted" className="mt-4">
              <AssetList assets={countedAssets} onAssetToggle={() => {}} />
            </TabsContent>
            <TabsContent value="missing" className="mt-4">
              <AssetList assets={missingAssets} onAssetToggle={() => {}} />
            </TabsContent>
            <TabsContent value="temporary" className="mt-4">
              <AssetList assets={tempAssets} onAssetToggle={() => {}} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TaskReview;