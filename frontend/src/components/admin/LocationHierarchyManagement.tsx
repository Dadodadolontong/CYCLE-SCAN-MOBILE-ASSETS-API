import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { Globe, MapPin, Building, Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { useCountries, useCreateCountry, useUpdateCountry, useDeleteCountry } from '@/hooks/useCountries';
import { useRegions, useCreateRegion, useUpdateRegion, useDeleteRegion } from '@/hooks/useRegions';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '@/hooks/useBranches';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/useLocations';
import { useUsersWithRoles } from '@/hooks/useUserAssignments';
import { useCategories } from '@/hooks/useCategories';
import { fastapiClient } from '@/integrations/fastapi/client';
import { useLocationsByBranch } from '@/hooks/useLocations';

export const LocationHierarchyManagement = () => {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  
  // Search state
  const [branchSearch, setBranchSearch] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  
  // Pagination state
  const [branchesPage, setBranchesPage] = useState(1);
  const [locationsPage, setLocationsPage] = useState(1);
  const itemsPerPage = 20;

  // Countries
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const createCountryMutation = useCreateCountry();
  const updateCountryMutation = useUpdateCountry();
  const deleteCountryMutation = useDeleteCountry();

  // Regions
  const { data: regions, isLoading: regionsLoading } = useRegions(selectedCountry === 'all' ? undefined : selectedCountry);
  const createRegionMutation = useCreateRegion();
  const updateRegionMutation = useUpdateRegion();
  const deleteRegionMutation = useDeleteRegion();

  // Branches with pagination
  const { data: branchesData, isLoading: branchesLoading } = useBranches(
    selectedRegion === 'all' ? undefined : selectedRegion,
    branchSearch || undefined,
    (branchesPage - 1) * itemsPerPage,
    itemsPerPage
  );
  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranch();
  const deleteBranchMutation = useDeleteBranch();

  // Locations with pagination
  const { data: allLocationsData, isLoading: allLocationsLoading } = useLocations(
    locationSearch || undefined,
    (locationsPage - 1) * itemsPerPage,
    itemsPerPage
  );
  const { data: branchLocationsData, isLoading: branchLocationsLoading } = useLocationsByBranch(
    selectedBranch === 'all' ? undefined : selectedBranch,
    locationSearch || undefined,
    (locationsPage - 1) * itemsPerPage,
    itemsPerPage
  );
  
  // Use appropriate data based on filter
  const locationsData = selectedBranch === 'all' ? allLocationsData : branchLocationsData;
  const locationsLoading = selectedBranch === 'all' ? allLocationsLoading : branchLocationsLoading;
  
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();

  // Extract items from paginated data
  const branches = branchesData?.items || [];
  const locations = locationsData?.items || [];

  const [newCountry, setNewCountry] = useState({ name: '', code: '' });
  const [newRegion, setNewRegion] = useState({ name: '', country_id: '' });
  const [newBranch, setNewBranch] = useState({ name: '', region_id: '' });
  const [newLocation, setNewLocation] = useState({ name: '', description: '', erp_location_id: '', branch_id: '' });
  const [editingCountry, setEditingCountry] = useState<{ id: string; name: string; code: string } | null>(null);
  const [editingRegion, setEditingRegion] = useState<{ id: string; name: string; country_id: string } | null>(null);
  const [editingBranch, setEditingBranch] = useState<{ id: string; name: string; region_id: string } | null>(null);
  const [editingLocation, setEditingLocation] = useState<{ id: string; name: string; description: string; erp_location_id: string; branch_id: string } | null>(null);

  // Assignment dialogs state
  const { data: usersWithRoles = [] } = useUsersWithRoles();
  const { data: categories = [] } = useCategories();
  const [userSearch, setUserSearch] = useState('');
  const filteredUsers = usersWithRoles
    .filter((u: any) => u.role === 'user')
    .filter((u: any) => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  const [countryAssign, setCountryAssign] = useState<{ open: boolean; countryId: string | null; accountingManagerId: string | null; categoryId: string | null; recommendatorId: string | null }>({ open: false, countryId: null, accountingManagerId: null, categoryId: null, recommendatorId: null });
  const [regionAssign, setRegionAssign] = useState<{ open: boolean; regionId: string | null; controllerId: string | null }>({ open: false, regionId: null, controllerId: null });
  const [branchAssign, setBranchAssign] = useState<{ open: boolean; branchId: string | null; branchManagerId: string | null; financeManagerId: string | null }>({ open: false, branchId: null, branchManagerId: null, financeManagerId: null });
  const [branchUserIds, setBranchUserIds] = useState<string[]>([]);
  const [savingUsers, setSavingUsers] = useState(false);

  const handleCreateCountry = async () => {
    if (!newCountry.name || !newCountry.code) return;
    
    try {
      await createCountryMutation.mutateAsync(newCountry);
      setNewCountry({ name: '', code: '' });
      toast({ title: 'Success', description: 'Country created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create country', variant: 'destructive' });
    }
  };

  const handleCreateRegion = async () => {
    if (!newRegion.name || !newRegion.country_id) return;
    
    try {
      await createRegionMutation.mutateAsync(newRegion);
      setNewRegion({ name: '', country_id: '' });
      toast({ title: 'Success', description: 'Region created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create region', variant: 'destructive' });
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranch.name || !newBranch.region_id) return;
    
    try {
      await createBranchMutation.mutateAsync(newBranch);
      setNewBranch({ name: '', region_id: '' });
      setBranchesPage(1); // Reset to first page
      toast({ title: 'Success', description: 'Branch created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create branch', variant: 'destructive' });
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocation.name || !newLocation.branch_id) return;
    
    try {
      await createLocationMutation.mutateAsync(newLocation);
      setNewLocation({ name: '', description: '', erp_location_id: '', branch_id: '' });
      setLocationsPage(1); // Reset to first page
      toast({ title: 'Success', description: 'Location created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create location', variant: 'destructive' });
    }
  };

  const handleEditCountry = async () => {
    if (!editingCountry) return;
    
    try {
      await updateCountryMutation.mutateAsync({
        id: editingCountry.id,
        updates: { name: editingCountry.name, code: editingCountry.code }
      });
      setEditingCountry(null);
      toast({ title: 'Success', description: 'Country updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update country', variant: 'destructive' });
    }
  };

  const handleEditLocation = async () => {
    if (!editingLocation) return;
    
    try {
      await updateLocationMutation.mutateAsync({
        id: editingLocation.id,
        updates: { 
          name: editingLocation.name, 
          description: editingLocation.description,
          erp_location_id: editingLocation.erp_location_id,
          branch_id: editingLocation.branch_id
        }
      });
      setEditingLocation(null);
      toast({ title: 'Success', description: 'Location updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update location', variant: 'destructive' });
    }
  };

  const handleEditRegion = async () => {
    if (!editingRegion) return;
    
    try {
      await updateRegionMutation.mutateAsync({
        id: editingRegion.id,
        updates: { name: editingRegion.name, country_id: editingRegion.country_id }
      });
      setEditingRegion(null);
      toast({ title: 'Success', description: 'Region updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update region', variant: 'destructive' });
    }
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;
    
    try {
      await updateBranchMutation.mutateAsync({
        id: editingBranch.id,
        updates: { name: editingBranch.name, region_id: editingBranch.region_id }
      });
      setEditingBranch(null);
      toast({ title: 'Success', description: 'Branch updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update branch', variant: 'destructive' });
    }
  };

  // Handle filter changes
  const handleRegionFilterChange = (regionId: string) => {
    setSelectedRegion(regionId);
    setBranchesPage(1); // Reset to first page when filter changes
    setBranchSearch(''); // Reset search when filter changes
  };

  const handleBranchFilterChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setLocationsPage(1); // Reset to first page when filter changes
    setLocationSearch(''); // Reset search when filter changes
  };

  if (countriesLoading) {
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
          <h3 className="text-2xl font-bold">Location Hierarchy</h3>
          <p className="text-muted-foreground">Manage countries, regions, branches, and locations</p>
        </div>
      </div>

      <Tabs defaultValue="countries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Countries
              </CardTitle>
              <CardDescription>Manage country-level locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="country-name">Country Name</Label>
                  <Input
                    id="country-name"
                    value={newCountry.name}
                    onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                    placeholder="Enter country name"
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor="country-code">Code</Label>
                  <Input
                    id="country-code"
                    value={newCountry.code}
                    onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                    placeholder="US, CA, etc."
                    maxLength={3}
                  />
                </div>
                <Button onClick={handleCreateCountry} disabled={createCountryMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries?.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{country.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCountryAssign({ open: true, countryId: country.id, accountingManagerId: null, categoryId: null, recommendatorId: null })}
                          >
                            Manage Assignments
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditingCountry({ id: country.id, name: country.name, code: country.code })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Country</DialogTitle>
                                <DialogDescription>
                                  Update the country information below.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-country-name">Country Name</Label>
                                  <Input
                                    id="edit-country-name"
                                    value={editingCountry?.name || ''}
                                    onChange={(e) => setEditingCountry(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="Enter country name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-country-code">Country Code</Label>
                                  <Input
                                    id="edit-country-code"
                                    value={editingCountry?.code || ''}
                                    onChange={(e) => setEditingCountry(prev => prev ? { ...prev, code: e.target.value.toUpperCase() } : null)}
                                    placeholder="US, CA, etc."
                                    maxLength={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingCountry(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEditCountry} disabled={updateCountryMutation.isPending}>
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteCountryMutation.mutate(country.id)}
                            disabled={deleteCountryMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Country assignments dialog */}
              <Dialog open={countryAssign.open} onOpenChange={(open) => setCountryAssign(prev => ({ ...prev, open }))}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Country Assignments</DialogTitle>
                    <DialogDescription>Set accounting manager and recommendators</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Accounting Manager</Label>
                      <select
                        className="border rounded p-2 w-full"
                        value={countryAssign.accountingManagerId || ''}
                        onChange={(e) => setCountryAssign(prev => ({ ...prev, accountingManagerId: e.target.value || null }))}
                      >
                        <option value="">Select accounting manager</option>
                        {usersWithRoles.filter((u: any) => u.role === 'accounting_manager').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.display_name}</option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!countryAssign.countryId) return;
                            await fastapiClient.put(`/locations/countries/${countryAssign.countryId}`, { accounting_manager_id: countryAssign.accountingManagerId });
                          }}
                        >Save Accounting Manager</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <Label>Category (optional)</Label>
                        <select
                          className="border rounded p-2 w-full"
                          value={countryAssign.categoryId || ''}
                          onChange={(e) => setCountryAssign(prev => ({ ...prev, categoryId: e.target.value || null }))}
                        >
                          <option value="">All categories (default)</option>
                          {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Recommendator</Label>
                        <select
                          className="border rounded p-2 w-full"
                          value={countryAssign.recommendatorId || ''}
                          onChange={(e) => setCountryAssign(prev => ({ ...prev, recommendatorId: e.target.value || null }))}
                        >
                          <option value="">Select recommendator</option>
                          {usersWithRoles.filter((u: any) => u.role === 'recommendator').map((u: any) => (
                            <option key={u.id} value={u.id}>{u.display_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Button
                          onClick={async () => {
                            if (!countryAssign.countryId || !countryAssign.recommendatorId) return;
                            await fastapiClient.post('/user-assignments/country-recommendators', {
                              country_id: countryAssign.countryId,
                              category_id: countryAssign.categoryId || null,
                              user_id: countryAssign.recommendatorId,
                              active: true,
                            });
                          }}
                        >Save Recommendator</Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCountryAssign({ open: false, countryId: null, accountingManagerId: null, categoryId: null, recommendatorId: null })}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Regions
              </CardTitle>
              <CardDescription>Manage regions within countries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="region-name">Region Name</Label>
                  <Input
                    id="region-name"
                    value={newRegion.name}
                    onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                    placeholder="Enter region name"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="region-country">Country</Label>
                  <Select 
                    value={newRegion.country_id} 
                    onValueChange={(value) => setNewRegion({ ...newRegion, country_id: value })}
                  >
                    <SelectTrigger id="region-country">
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
                <Button onClick={handleCreateRegion} disabled={createRegionMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Region
                </Button>
              </div>

              <div className="mb-4">
                <Label htmlFor="filter-country">Filter by Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries?.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions?.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>{region.country?.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRegionAssign({ open: true, regionId: region.id, controllerId: (region as any).controller_id || null })}
                          >
                            Manage Assignments
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteRegionMutation.mutate(region.id)}
                            disabled={deleteRegionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Region assignments dialog */}
              <Dialog open={regionAssign.open} onOpenChange={(open) => setRegionAssign(prev => ({ ...prev, open }))}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Region Assignments</DialogTitle>
                    <DialogDescription>Set region controller</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Controller</Label>
                      <select
                        className="border rounded p-2 w-full"
                        value={regionAssign.controllerId || ''}
                        onChange={(e) => setRegionAssign(prev => ({ ...prev, controllerId: e.target.value || null }))}
                      >
                        <option value="">Unassigned</option>
                        {usersWithRoles.filter((u: any) => u.role === 'controller').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.display_name}</option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!regionAssign.regionId) return;
                            await fastapiClient.put(`/locations/regions/${regionAssign.regionId}`, { controller_id: regionAssign.controllerId });
                          }}
                        >Save Controller</Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRegionAssign({ open: false, regionId: null, controllerId: null })}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branches
              </CardTitle>
              <CardDescription>Manage branches within regions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <Input
                    id="branch-name"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    placeholder="Enter branch name"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="branch-region">Region</Label>
                  <Select 
                    value={newBranch.region_id} 
                    onValueChange={(value) => setNewBranch({ ...newBranch, region_id: value })}
                  >
                    <SelectTrigger id="branch-region">
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
                <Button onClick={handleCreateBranch} disabled={createBranchMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </div>

              <div className="mb-4">
                <Label htmlFor="filter-region">Filter by Region</Label>
                <Select value={selectedRegion} onValueChange={handleRegionFilterChange}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name} ({region.country?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="branch-search">Search Branches</Label>
                <Input
                  id="branch-search"
                  value={branchSearch}
                  onChange={(e) => {
                    setBranchSearch(e.target.value);
                    setBranchesPage(1); // Reset to first page when searching
                  }}
                  placeholder="Search branch names (supports wildcards)"
                  className="w-64"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Managers & Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches?.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.region?.name}</TableCell>
                      <TableCell>{branch.country?.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentUserIds = (branch.assigned_users || []).map((u: any) => u.user_id);
                              setBranchUserIds(currentUserIds);
                              setBranchAssign({ open: true, branchId: branch.id, branchManagerId: (branch as any).branch_manager_id || null, financeManagerId: (branch as any).manager_id || null });
                            }}
                          >
                            Manage Managers / Users
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteBranchMutation.mutate(branch.id)}
                            disabled={deleteBranchMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Branch assignments dialog */}
              <Dialog open={branchAssign.open} onOpenChange={(open) => setBranchAssign(prev => ({ ...prev, open }))}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Branch Assignments</DialogTitle>
                    <DialogDescription>Set branch and finance managers</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Branch Manager</Label>
                      <select
                        className="border rounded p-2 w-full"
                        value={branchAssign.branchManagerId || ''}
                        onChange={(e) => setBranchAssign(prev => ({ ...prev, branchManagerId: e.target.value || null }))}
                      >
                        <option value="">Unassigned</option>
                        {usersWithRoles.filter((u: any) => u.role === 'branch_manager').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.display_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Finance Manager</Label>
                      <select
                        className="border rounded p-2 w-full"
                        value={branchAssign.financeManagerId || ''}
                        onChange={(e) => setBranchAssign(prev => ({ ...prev, financeManagerId: e.target.value || null }))}
                      >
                        <option value="">Unassigned</option>
                        {usersWithRoles.filter((u: any) => u.role === 'manager').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.display_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          if (!branchAssign.branchId) return;
                          await fastapiClient.put(`/locations/branches/${branchAssign.branchId}`, { branch_manager_id: branchAssign.branchManagerId });
                        }}
                      >Save Branch Manager</Button>
                      <Button
                        onClick={async () => {
                          if (!branchAssign.branchId) return;
                          await fastapiClient.put(`/locations/branches/${branchAssign.branchId}`, { manager_id: branchAssign.financeManagerId });
                        }}
                      >Save Finance Manager</Button>
                    </div>
                    <div>
                      <Label>Users Assigned to Branch</Label>
                      <div className="border rounded p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Search users by name or role"
                            className="border rounded p-2 w-full"
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const filtered = filteredUsers.map(u => u.id);
                              setBranchUserIds(prev => Array.from(new Set([...prev, ...filtered])));
                            }}
                          >Select All</Button>
                          <Button size="sm" variant="ghost" onClick={() => setBranchUserIds([])}>Clear</Button>
                        </div>
                        <div className="max-h-60 overflow-auto border rounded p-2 space-y-1">
                          {filteredUsers.slice(0, 200).map((u: any) => (
                            <label key={u.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={branchUserIds.includes(u.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setBranchUserIds(prev => checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                                }}
                              />
                              <span className="px-2 py-0.5 border rounded min-w-[10rem]">{u.display_name}</span>
                              <span className="text-muted-foreground">({u.role})</span>
                            </label>
                          ))}
                          {filteredUsers.length > 200 && (
                            <div className="text-xs text-muted-foreground">Showing first 200 results, refine your search…</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {branchUserIds.map(id => {
                            const u = usersWithRoles.find((x: any) => x.id === id);
                            if (!u) return null;
                            return (
                              <span key={id} className="text-xs border rounded px-2 py-1 flex items-center gap-2">
                                {u.display_name} <em className="text-muted-foreground">({u.role})</em>
                                <button className="text-red-500" onClick={() => setBranchUserIds(prev => prev.filter(x => x !== id))}>×</button>
                              </span>
                            );
                          })}
                        </div>
                        <div>
                          <Button
                            size="sm"
                            disabled={savingUsers}
                            onClick={async () => {
                              if (!branchAssign.branchId) return;
                              setSavingUsers(true);
                              try {
                                const currentIds = (branches.find(b => b.id === branchAssign.branchId)?.assigned_users || []).map((u: any) => u.user_id);
                                const toAdd = branchUserIds.filter(id => !currentIds.includes(id));
                                const toRemove = currentIds.filter((id: string) => !branchUserIds.includes(id));
                                for (const id of toAdd) {
                                  await fastapiClient.post('/user-assignments/branch-assignments', { user_id: id, branch_id: branchAssign.branchId });
                                }
                                const currentAssignments = (branches.find(b => b.id === branchAssign.branchId)?.assigned_users || []);
                                for (const id of toRemove) {
                                  const assignment = currentAssignments.find((a: any) => a.user_id === id);
                                  if (assignment) {
                                    await fastapiClient.delete(`/user-assignments/branch-assignments/${assignment.assignment_id}`);
                                  }
                                }
                              } finally {
                                setSavingUsers(false);
                              }
                            }}
                          >Save Users</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBranchAssign({ open: false, branchId: null, branchManagerId: null, financeManagerId: null })}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {branchesData && (
                <Pagination
                  currentPage={branchesPage}
                  totalPages={Math.ceil(branchesData.total / itemsPerPage)}
                  onPageChange={setBranchesPage}
                  totalItems={branchesData.total}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
              <CardDescription>Manage locations and assign them to branches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="location-name">Location Name</Label>
                  <Input
                    id="location-name"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="Enter location name"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="location-description">Description</Label>
                  <Input
                    id="location-description"
                    value={newLocation.description}
                    onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="location-erp-id">ERP Location ID</Label>
                  <Input
                    id="location-erp-id"
                    value={newLocation.erp_location_id}
                    onChange={(e) => setNewLocation({ ...newLocation, erp_location_id: e.target.value })}
                    placeholder="ERP location ID"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="location-branch">Branch</Label>
                  <Select 
                    value={newLocation.branch_id} 
                    onValueChange={(value) => setNewLocation({ ...newLocation, branch_id: value })}
                  >
                    <SelectTrigger id="location-branch">
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
                <Button onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>

              <div className="mb-4">
                <Label htmlFor="filter-branch">Filter by Branch</Label>
                <Select value={selectedBranch} onValueChange={handleBranchFilterChange}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.region?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="location-search">Search Locations</Label>
                <Input
                  id="location-search"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setLocationsPage(1); // Reset to first page when searching
                  }}
                  placeholder="Search location names (supports wildcards)"
                  className="w-64"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>ERP Location ID</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations?.map((location) => {
                    const branch = branches?.find(b => b.id === location.branch_id);
                    return (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>{location.description || '-'}</TableCell>
                        <TableCell>
                          {location.erp_location_id ? (
                            <Badge variant="outline">{location.erp_location_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not mapped</span>
                          )}
                        </TableCell>
                        <TableCell>{branch?.name || '-'}</TableCell>
                        <TableCell>{branch?.region?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setEditingLocation({ 
                                    id: location.id, 
                                    name: location.name, 
                                    description: location.description || '',
                                    erp_location_id: location.erp_location_id || '',
                                    branch_id: location.branch_id || ''
                                  })}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Location</DialogTitle>
                                  <DialogDescription>Update location details</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="edit-location-name">Location Name</Label>
                                    <Input
                                      id="edit-location-name"
                                      value={editingLocation?.name || ''}
                                      onChange={(e) => setEditingLocation(editingLocation ? { ...editingLocation, name: e.target.value } : null)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-location-description">Description</Label>
                                    <Input
                                      id="edit-location-description"
                                      value={editingLocation?.description || ''}
                                      onChange={(e) => setEditingLocation(editingLocation ? { ...editingLocation, description: e.target.value } : null)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-location-erp-id">ERP Location ID</Label>
                                    <Input
                                      id="edit-location-erp-id"
                                      value={editingLocation?.erp_location_id || ''}
                                      onChange={(e) => setEditingLocation(editingLocation ? { ...editingLocation, erp_location_id: e.target.value } : null)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-location-branch">Branch</Label>
                                    <Select 
                                      value={editingLocation?.branch_id || ''} 
                                      onValueChange={(value) => setEditingLocation(editingLocation ? { ...editingLocation, branch_id: value } : null)}
                                    >
                                      <SelectTrigger id="edit-location-branch">
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
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingLocation(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleEditLocation} disabled={updateLocationMutation.isPending}>
                                    Update Location
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteLocationMutation.mutate(location.id)}
                              disabled={deleteLocationMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {locationsData && (
                <Pagination
                  currentPage={locationsPage}
                  totalPages={Math.ceil(locationsData.total / itemsPerPage)}
                  onPageChange={setLocationsPage}
                  totalItems={locationsData.total}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};