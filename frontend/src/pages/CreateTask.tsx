import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Users, Calendar, Target, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocations } from "@/hooks/useLocations";
import { useCategories } from "@/hooks/useCategories";
import { useCreateCycleCountTask, useCycleCountTaskById, useUpdateCycleCountTask } from "@/hooks/useCycleCountTasks";
import { useAssets } from "@/hooks/useAssets";
import { useAuth } from "@/contexts/FastAPIAuthContext";
import { useProfiles } from "@/hooks/useProfiles";
import { useUserRole } from "@/hooks/useUserRole";
import { useAllBranchAssignments, useAllRegionAssignments, useAllCountryAssignments, useUsersWithRoles } from "@/hooks/useUserAssignments";
import { useBranches } from "@/hooks/useBranches";
import { useRegions } from "@/hooks/useRegions";

const CreateTask = () => {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: userRole, isLoading: userRoleLoading } = useUserRole();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const createTask = useCreateCycleCountTask();
  const updateTask = useUpdateCycleCountTask();
  const { data: existingTask } = useCycleCountTaskById(taskId);
  // Add these hooks at the top
  const { data: branches = [], isLoading: branchesLoading } = useBranches();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();
  const { data: branchAssignments = [], isLoading: branchAssignmentsLoading } = useAllBranchAssignments();
  const { data: regionAssignments = [], isLoading: regionAssignmentsLoading } = useAllRegionAssignments();
  const { data: countryAssignments = [], isLoading: countryAssignmentsLoading } = useAllCountryAssignments();
  const { data: usersWithRoles = [] } = useUsersWithRoles();
  
  const isEditMode = !!taskId;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationFilter: '',
    assignedTo: user?.id || '',
  });

  // Set default assigned user when user loads, or populate with existing task data
  useEffect(() => {
    if (existingTask) {
      const taskLocation = existingTask.location_filter 
        ? locations.find(loc => loc.id === existingTask.location_filter)?.name || ''
        : '';
      // Only update if values are different
      if (
        formData.name !== existingTask.name ||
        formData.description !== (existingTask.description || '') ||
        formData.locationFilter !== taskLocation ||
        formData.assignedTo !== (existingTask.assigned_to || user?.id || '')
      ) {
        setFormData({
          name: existingTask.name,
          description: existingTask.description || '',
          locationFilter: taskLocation,
          assignedTo: existingTask.assigned_to || user?.id || '',
        });
      }
    } else if (user?.id && formData.assignedTo !== user.id) {
      setFormData(prev => ({ ...prev, assignedTo: user.id }));
    }
    // eslint-disable-next-line
  }, [existingTask, user?.id, locations]);

  // Restrict access to managers only
  useEffect(() => {
    if (!userRoleLoading && userRole !== 'manager') {
      toast({
        title: "Access Denied",
        description: "Only managers can create and assign tasks.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [userRole, userRoleLoading, navigate, toast]);

  if (userRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (branchesLoading || locationsLoading || branchAssignmentsLoading || regionAssignmentsLoading || countryAssignmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!branches.length) {
    console.log('Branches not loaded yet, skipping assignment logic');
  }

  const getEstimatedAssetCount = () => {
    let filteredAssets = assets;
    
    if (formData.locationFilter && formData.locationFilter !== 'all') {
      // Find the location ID for the selected location name
      const selectedLocation = locations.find(loc => loc.name === formData.locationFilter);
      if (selectedLocation) {
        filteredAssets = filteredAssets.filter(asset => 
          asset.location === selectedLocation.id
        );
      }
    }
    
    return filteredAssets.length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a task name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.locationFilter || formData.locationFilter === 'all') {
      toast({
        title: "Location Required",
        description: "Please select a specific location for this task.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignedTo || formData.assignedTo === 'unassigned' || formData.assignedTo === '') {
      toast({
        title: "Assignment Required",
        description: "Please assign this task to a user.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert location name to location ID
      const selectedLocation = locations.find(loc => loc.name === formData.locationFilter);
      const locationId = selectedLocation?.id || null;

      if (isEditMode && taskId) {
        await updateTask.mutateAsync({
          id: taskId,
          updates: {
            name: formData.name,
            description: formData.description || null,
            location_filter: locationId,
            assigned_to: formData.assignedTo,
          },
        });

        toast({
          title: "Task Updated Successfully",
          description: "Cycle count task has been updated.",
          variant: "default",
        });
      } else {
        await createTask.mutateAsync({
          name: formData.name,
          description: formData.description || null,
          location_filter: locationId,
          assigned_to: formData.assignedTo,
          status: 'draft',
          created_by: user?.id || '',
        });

        toast({
          title: "Task Created Successfully",
          description: "Cycle count task has been created as a draft.",
          variant: "default",
        });
      }
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: isEditMode ? "Error Updating Task" : "Error Creating Task",
        description: `There was an error ${isEditMode ? 'updating' : 'creating'} the task. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Remove all assignment/role filtering. Just use all profiles for assignable users.
  const selectedLocation = locations.find(loc => loc.name === formData.locationFilter);
  let assignableUsers = usersWithRoles;

  const selectedUser = profiles.find(profile => profile.id === formData.assignedTo);
  const estimatedAssets = getEstimatedAssetCount();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isEditMode ? 'Edit Cycle Count Task' : 'Create Cycle Count Task'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Modify the cycle count task details' : 'Create a new cycle count task for asset verification'}
          </p>
        </div>

        <Card className="p-6 bg-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Task Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Q1 2024 Electronics Count"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and scope of this cycle count..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Location Filter *
              </Label>
              <Select 
                value={formData.locationFilter} 
                onValueChange={(value) => setFormData({...formData, locationFilter: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a specific location for this task" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name} - {location.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedLocation && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div><strong>Location:</strong> {selectedLocation.name}</div>
                    <div><strong>Description:</strong> {selectedLocation.description}</div>
                    <div><strong>ERP ID:</strong> {(selectedLocation as any).erp_location_id || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>


            {/* Assign To */}
            <div className="space-y-2">
              <Label htmlFor="assignTo" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Assign To *
              </Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={(value) => setFormData({...formData, assignedTo: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to assign this task to" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name || user.email || 'Unnamed User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignableUsers.length === 0 && (
                <div className="text-xs text-warning mt-2">No users found</div>
              )}
              
              {selectedUser && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    <div><strong>Assigned to:</strong> {selectedUser.display_name || 'Unnamed User'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Asset Count */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Estimated Asset Count
              </Label>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Based on current filters: <strong className="text-primary">{estimatedAssets}</strong> assets
                </p>
                {estimatedAssets === 0 && (
                  <p className="text-xs text-warning mt-1">
                    No assets match the current filters. Consider adjusting your criteria.
                  </p>
                )}
              </div>
            </div>

            {/* Summary Card */}
            {formData.name && (
              <Card className="p-4 bg-primary/5 border border-primary/20">
                <h3 className="font-semibold text-foreground mb-2">Task Summary</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div><strong>Name:</strong> {formData.name}</div>
                  {formData.description && <div><strong>Description:</strong> {formData.description}</div>}
                  <div><strong>Location Filter:</strong> {formData.locationFilter || 'None selected'}</div>
                  <div><strong>Assigned To:</strong> {selectedUser?.display_name || 'Unassigned'}</div>
                  <div><strong>Estimated Assets:</strong> {estimatedAssets}</div>
                  <div><strong>Status:</strong> Draft (can be activated later)</div>
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit}
                disabled={createTask.isPending || updateTask.isPending || isEditMode}
                className="flex-1"
                style={{ display: isEditMode ? 'none' : 'block' }}
              >
                {createTask.isPending ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={createTask.isPending || updateTask.isPending}
              >
                {(createTask.isPending || updateTask.isPending) ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Task' : 'Create Task')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateTask;