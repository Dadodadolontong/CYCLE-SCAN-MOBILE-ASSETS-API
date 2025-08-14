import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, MapPin, Package, Users, Activity, CheckCircle, Clock, AlertTriangle, Barcode, Database } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/FastAPIAuthContext";
import { fastapiClient } from "@/integrations/fastapi/client";
import { UserMenu } from "@/components/UserMenu";
import { useCycleCountTasks } from "@/hooks/useCycleCountTasks";
import { useAssets, useAssetCount } from "@/hooks/useAssets";
import { useLocations } from "@/hooks/useLocations";
import { useCategories } from "@/hooks/useCategories";
import { useUserRole } from "@/hooks/useUserRole";
import Pagination from "@/components/Pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssetTransfers } from "@/hooks/useAssetTransfers";
import { useWorkflowInbox } from "@/hooks/useWorkflowInbox";

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch data
  const { data: tasksData = { items: [], total: 0 }, isLoading: tasksLoading, error: tasksError } = useCycleCountTasks(undefined, user?.id);
  const tasks = tasksData.items || [];
  const { data: assets = [], isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: locationsData = { items: [], total: 0 }, isLoading: locationsLoading, error: locationsError } = useLocations();
  const locations = locationsData.items || [];
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: assetCount = { count: 0 }, isLoading: assetCountLoading, error: assetCountError } = useAssetCount();

  // Get user role
  const { data: userRole } = useUserRole();

  // Handle token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      try {
        fastapiClient.setToken(token);
        fastapiClient.getCurrentUser().then(userData => {
          setUser(userData);
        }).catch(error => {
          console.error("Error fetching user data:", error);
        });
        window.history.replaceState({}, document.title, location.pathname);
      } catch (error) {
        console.error("Error in token handling:", error);
      }
    }
  }, [location, setUser]);

  // Asset transfers and approvals data
  const { data: transfers = [], isLoading: transfersLoading } = useAssetTransfers();
  const { data: inbox = [], isLoading: inboxLoading } = useWorkflowInbox();

  // Loading states
  const isLoading = tasksLoading || assetsLoading || locationsLoading || categoriesLoading || assetCountLoading || transfersLoading || inboxLoading;
  const hasErrors = tasksError || assetsError || locationsError || categoriesError || assetCountError;

  // Computed values
  const activeTasks = tasks.filter(task => task.status === 'active');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const draftTasks = tasks.filter(task => task.status === 'draft');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500 text-white">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeTasksCount = activeTasks.length;
  const completedTasksCount = completedTasks.length;
  const totalLocations = locations.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tasks: {tasksLoading ? 'Loading' : 'Ready'} | 
            Assets: {assetsLoading ? 'Loading' : 'Ready'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b border-border/40">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Barcode className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">Asset Cycle Count</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            {userRole === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin')}
              >
                Admin Panel
              </Button>
            )}
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
       {/* <div className="mb-8 flex flex-wrap gap-4">
          <Button
            variant="default"
            onClick={() => navigate('/create-task')}
          >
            Create Task
          </Button> */}
          {/* Show Create Asset Transfer only for managers */}
          {/*{userRole === 'manager' && (
            <Button
              variant="secondary"
              onClick={() => navigate('/asset-transfer/create')}
            >
              Create Asset Transfer
            </Button>
          )}
        </div>*/}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Asset Management Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitor and manage your asset cycle counting operations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTasksCount}</div>
              <p className="text-xs text-muted-foreground">
                Currently running cycle counts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assetCountLoading ? (
                  <span className="animate-spin inline-block w-5 h-5 border-b-2 border-primary rounded-full"></span>
                ) : (
                  assetCount?.count ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Assets in your assigned branch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLocations}</div>
              <p className="text-xs text-muted-foreground">
                Asset locations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Domain tabs */}
        <Tabs defaultValue="cycle">
          <TabsList className="mb-4">
            <TabsTrigger value="cycle">Cycle Count</TabsTrigger>
            <TabsTrigger value="transfer">Asset Transfers</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="cycle">
            <div className="mb-4">
              <Button onClick={() => navigate('/create-task')} size="sm">
                <CalendarDays className="mr-2 h-4 w-4" /> Create Cycle Count Task
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Cycle Count Tasks</CardTitle>
                <CardDescription>Overview of your cycle counting activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(task.status)}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/cycle-count/${task.id}`)}>
                          {task.status === 'active' ? 'Resume Task' : 'View Task'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No tasks found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer">
            <div className="mb-4">
              <Button onClick={() => navigate('/asset-transfer/create')} size="sm" variant="secondary">
                <Package className="mr-2 h-4 w-4" /> Create Asset Transfer
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Asset Transfers</CardTitle>
                <CardDescription>Transfers you created or need to act on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transfers.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{t.transfer_number}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(t.status)}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/approvals/${t.instance_id || t.id}`)}>View</Button>
                      </div>
                    </div>
                  ))}
                  {transfers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No transfers</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Items awaiting your action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inbox.map((i: any) => (
                    <div key={i.instance_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{i.business_ref}</h4>
                        <p className="text-xs text-muted-foreground">
                          {i.source_branch_name || '-'} → {i.destination_branch_name || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {i.created_at ? new Date(i.created_at).toLocaleString() : '-'} • Status: {i.workflow_status}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/approvals/${i.instance_id}`)}>Open</Button>
                      </div>
                    </div>
                  ))}
                  {inbox.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No pending approvals</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Asset Reports</CardTitle>
                <CardDescription>Available reports</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 text-sm text-muted-foreground">
                  <li>Count Summary (coming soon)</li>
                  <li>Transfer History (coming soon)</li>
                  <li>Discrepancy Report (coming soon)</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Development Test Section - Only show in development */}
        {/* {import.meta.env.DEV && (
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">Development Tests</CardTitle>
              <CardDescription>Test functionality (only visible in development)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await fastapiClient.testSessionTimeout();
                    } catch (error) {
                      console.log('Session timeout test triggered:', error);
                    }
                  }}
                  className="text-orange-700 border-orange-300"
                >
                  Test Session Timeout
                </Button>
                <p className="text-xs text-orange-600">
                  This will trigger a session timeout and redirect to login page
                </p>
              </div>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
};

export default Dashboard;