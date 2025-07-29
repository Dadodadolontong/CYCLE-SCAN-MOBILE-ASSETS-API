import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Globe, MapPin, Building2, Plus, Trash2 } from 'lucide-react';
import { useCountries } from '@/hooks/useCountries';
import { useRegions } from '@/hooks/useRegions';
import { useBranches } from '@/hooks/useBranches';
import { 
  useUsersWithRoles,
  useAllCountryAssignments,
  useAllRegionAssignments,
  useAllBranchAssignments,
  useAssignUserToCountry, 
  useAssignUserToRegion, 
  useAssignUserToBranch,
  useRemoveUserAssignment 
} from '@/hooks/useUserAssignments';

export const UserAssignmentManagement = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCountryForAssignment, setSelectedCountryForAssignment] = useState<string>('');
  const [selectedRegionForAssignment, setSelectedRegionForAssignment] = useState<string>('');
  const [selectedBranchForAssignment, setSelectedBranchForAssignment] = useState<string>('');

  // Fetch all users with roles
  const { data: users, isLoading: usersLoading } = useUsersWithRoles();

  // Fetch location data
  const { data: countries } = useCountries();
  const { data: regions } = useRegions();
  const { data: branches } = useBranches();

  // Fetch current assignments
  const { data: countryAssignments, isLoading: countryAssignmentsLoading } = useAllCountryAssignments();
  const { data: regionAssignments, isLoading: regionAssignmentsLoading } = useAllRegionAssignments();
  const { data: branchAssignments, isLoading: branchAssignmentsLoading } = useAllBranchAssignments();

  // Mutations
  const assignUserToCountryMutation = useAssignUserToCountry();
  const assignUserToRegionMutation = useAssignUserToRegion();
  const assignUserToBranchMutation = useAssignUserToBranch();
  const removeUserAssignmentMutation = useRemoveUserAssignment();

  const handleAssignUserToCountry = async () => {
    if (!selectedUser || !selectedCountryForAssignment) return;
    
    try {
      await assignUserToCountryMutation.mutateAsync({
        user_id: selectedUser,
        country_id: selectedCountryForAssignment
      });
      setSelectedUser('');
      setSelectedCountryForAssignment('');
      toast({ title: 'Success', description: 'User assigned to country successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign user to country', variant: 'destructive' });
    }
  };

  const handleAssignUserToRegion = async () => {
    if (!selectedUser || !selectedRegionForAssignment) return;
    
    try {
      await assignUserToRegionMutation.mutateAsync({
        user_id: selectedUser,
        region_id: selectedRegionForAssignment
      });
      setSelectedUser('');
      setSelectedRegionForAssignment('');
      toast({ title: 'Success', description: 'User assigned to region successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign user to region', variant: 'destructive' });
    }
  };

  const handleAssignUserToBranch = async () => {
    if (!selectedUser || !selectedBranchForAssignment) return;
    
    try {
      await assignUserToBranchMutation.mutateAsync({
        user_id: selectedUser,
        branch_id: selectedBranchForAssignment
      });
      setSelectedUser('');
      setSelectedBranchForAssignment('');
      toast({ title: 'Success', description: 'User assigned to branch successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to assign user to branch', variant: 'destructive' });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'accounting_manager':
        return <Globe className="h-4 w-4" />;
      case 'controller':
        return <MapPin className="h-4 w-4" />;
      case 'manager':
      case 'user':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">User Geographic Assignments</h3>
          <p className="text-muted-foreground">Assign users to their geographic areas of responsibility</p>
        </div>
      </div>

      <Tabs defaultValue="country-assignments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="country-assignments">Country Assignments</TabsTrigger>
          <TabsTrigger value="region-assignments">Region Assignments</TabsTrigger>
          <TabsTrigger value="branch-assignments">Branch Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="country-assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Country Assignments
              </CardTitle>
              <CardDescription>Assign accounting managers to countries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Accounting Manager</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select accounting manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.role === 'accounting_manager').map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={selectedCountryForAssignment} onValueChange={setSelectedCountryForAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries?.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignUserToCountry} disabled={assignUserToCountryMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Accounting Manager</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryAssignmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading assignments...</p>
                      </TableCell>
                    </TableRow>
                  ) : countryAssignments && countryAssignments.length > 0 ? (
                    countryAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(assignment.user_role?.role || '')}
                            {assignment.user_role?.display_name || 'Unknown User'}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.country?.name}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeUserAssignmentMutation.mutate({ 
                              type: 'country', 
                              assignmentId: assignment.id 
                            })}
                            disabled={removeUserAssignmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <p className="text-muted-foreground">No country assignments found</p>
                        <p className="text-sm text-muted-foreground">Assign accounting managers to countries using the form above</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="region-assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Region Assignments
              </CardTitle>
              <CardDescription>Assign controllers to regions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Controller</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select controller" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.role === 'controller').map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Region</label>
                  <Select value={selectedRegionForAssignment} onValueChange={setSelectedRegionForAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name} ({region.country?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignUserToRegion} disabled={assignUserToRegionMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Controller</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionAssignmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading assignments...</p>
                      </TableCell>
                    </TableRow>
                  ) : regionAssignments && regionAssignments.length > 0 ? (
                    regionAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(assignment.user_role?.role || '')}
                            {assignment.user_role?.display_name || 'Unknown User'}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.region?.name}</TableCell>
                        <TableCell>{assignment.region?.country?.name}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeUserAssignmentMutation.mutate({ 
                              type: 'region', 
                              assignmentId: assignment.id 
                            })}
                            disabled={removeUserAssignmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <p className="text-muted-foreground">No region assignments found</p>
                        <p className="text-sm text-muted-foreground">Assign controllers to regions using the form above</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branch-assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branch Assignments
              </CardTitle>
              <CardDescription>Assign managers and users to branches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Manager/User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager or user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => ['manager', 'user'].includes(u.role)).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || 'Unknown User'} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Branch</label>
                  <Select value={selectedBranchForAssignment} onValueChange={setSelectedBranchForAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.region?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignUserToBranch} disabled={assignUserToBranchMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchAssignmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading assignments...</p>
                      </TableCell>
                    </TableRow>
                  ) : branchAssignments && branchAssignments.length > 0 ? (
                    branchAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(assignment.user_role?.role || '')}
                            {assignment.user_role?.display_name || 'Unknown User'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {assignment.user_role?.role?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.branch?.name}</TableCell>
                        <TableCell>{assignment.branch?.region?.name}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeUserAssignmentMutation.mutate({ 
                              type: 'branch', 
                              assignmentId: assignment.id 
                            })}
                            disabled={removeUserAssignmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">No branch assignments found</p>
                        <p className="text-sm text-muted-foreground">Assign managers and users to branches using the form above</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};