import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Globe, MapPin, Building, Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { useCountries, useCreateCountry, useUpdateCountry, useDeleteCountry } from '@/hooks/useCountries';
import { useRegions, useCreateRegion, useUpdateRegion, useDeleteRegion } from '@/hooks/useRegions';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '@/hooks/useBranches';

export const LocationHierarchyManagement = () => {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

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

  // Branches
  const { data: branches, isLoading: branchesLoading } = useBranches(selectedRegion === 'all' ? undefined : selectedRegion);
  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranch();
  const deleteBranchMutation = useDeleteBranch();

  const [newCountry, setNewCountry] = useState({ name: '', code: '' });
  const [newRegion, setNewRegion] = useState({ name: '', country_id: '' });
  const [newBranch, setNewBranch] = useState({ name: '', region_id: '' });
  const [editingCountry, setEditingCountry] = useState<{ id: string; name: string; code: string } | null>(null);

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
      toast({ title: 'Success', description: 'Branch created successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create branch', variant: 'destructive' });
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
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
                    <TableHead>Assigned Users</TableHead>
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
                        {country.assigned_users && country.assigned_users.length > 0 ? (
                          <div className="space-y-1">
                            {country.assigned_users.map((user) => (
                              <div key={user.assignment_id} className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs">
                                  {user.role.replace('_', ' ')}
                                </Badge>
                                <span>{user.display_name || 'Unknown User'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No users assigned</span>
                        )}
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
                    <TableHead>Assigned Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions?.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>{region.country?.name}</TableCell>
                      <TableCell>
                        {region.assigned_users && region.assigned_users.length > 0 ? (
                          <div className="space-y-1">
                            {region.assigned_users.map((user) => (
                              <div key={user.assignment_id} className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs">
                                  {user.role.replace('_', ' ')}
                                </Badge>
                                <span>{user.display_name || 'Unknown User'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No users assigned</span>
                        )}
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
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Assigned Users</TableHead>
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
                        {branch.assigned_users && branch.assigned_users.length > 0 ? (
                          <div className="space-y-1">
                            {branch.assigned_users.map((user) => (
                              <div key={user.assignment_id} className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs">
                                  {user.role.replace('_', ' ')}
                                </Badge>
                                <span>{user.display_name || 'Unknown User'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No users assigned</span>
                        )}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};