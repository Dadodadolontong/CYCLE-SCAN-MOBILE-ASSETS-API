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

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch data
  const { data: tasksData = { items: [], total: 0 }, isLoading: tasksLoading, error: tasksError } = useCycleCountTasks(undefined, user?.id);
  const tasks = tasksData.items || [];
  const { data: assets = [], isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useLocations();
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: assetCount = { count: 0 }, isLoading: assetCountLoading, error: assetCountError } = useAssetCount();

  // Get user role
  const { data: userRole } = useUserRole();

  // Debug logging for role
  console.log('🔍 [Dashboard] User role data:', userRole);
  console.log('🔍 [Dashboard] User role type:', typeof userRole);
  console.log('🔍 [Dashboard] User role === admin:', userRole === 'admin');

  // Debug logging for user and tasks
  console.log('🔍 [Dashboard] User data:', user);
  console.log('🔍 [Dashboard] User ID:', user?.id);
  console.log('🔍 [Dashboard] Tasks data:', tasksData);
  console.log('🔍 [Dashboard] Tasks loading:', tasksLoading);
  console.log('🔍 [Dashboard] Tasks error:', tasksError);

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

  // Loading states
  const isLoading = tasksLoading || assetsLoading || locationsLoading || categoriesLoading || assetCountLoading;
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Button 
            onClick={() => navigate('/create-task')} 
            size="lg" 
            className="h-20 text-lg"
          >
            <CalendarDays className="mr-2 h-5 w-5" />
            Create Cycle Count Task
          </Button>
          {/* Create Asset Transfer button for managers */}
          {userRole === 'manager' && (
            <Button
              onClick={() => navigate('/asset-transfer/create')}
              size="lg"
              className="h-20 text-lg"
              variant="secondary"
            >
              <Package className="mr-2 h-5 w-5" />
              Create Asset Transfer
            </Button>
          )}
          <Button 
            size="lg" 
            className="h-20 text-lg"
            disabled
          >
            <Package className="mr-2 h-5 w-5" />
            Asset Reports
          </Button>
        </div>

        {/* Tasks Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cycle Count Tasks</CardTitle>
            <CardDescription>
              Overview of your cycle counting activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <label htmlFor="status-filter" className="text-sm font-medium">Task Status:</label>
              <Select value="all" onValueChange={value => { }}>
                <SelectTrigger className="w-40" id="status-filter">
                  <SelectValue>All</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Started {task.started_at ? new Date(task.started_at).toLocaleDateString() : 'Not started'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(task.status)}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/cycle-count/${task.id}`)}
                    >
                      {task.status === 'active' ? 'Resume Task' : 'View Task'}
                    </Button>
                  </div>
                </div>
              ))}
              <Pagination
                currentPage={1}
                totalItems={tasks.length}
                pageSize={20}
                onPageChange={() => {}}
              />
              {tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tasks found for this status</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;