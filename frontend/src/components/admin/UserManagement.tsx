import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fastapiClient } from '@/integrations/fastapi/client';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCog, Shield, User, Crown, Building2, Eye, Plus, Edit, Eye as ViewIcon } from 'lucide-react';
import { LocationHierarchyManagement } from './LocationHierarchyManagement';
import { UserAssignmentManagement } from './UserAssignmentManagement';

interface UserWithRole {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  role: string;
  is_active: boolean;
}

export const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  // Form states
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'user'
  });
  
  const [editUserData, setEditUserData] = useState({
    email: '',
    display_name: '',
    role: 'user',
    new_password: ''
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      return await fastapiClient.get<UserWithRole[]>('/admin/users');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await fastapiClient.put(`/admin/users/${userId}/role`, { new_role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  });

  const lockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await fastapiClient.post(`/admin/users/${userId}/lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User locked successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to lock user',
        variant: 'destructive',
      });
    }
  });

  const unlockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await fastapiClient.post(`/admin/users/${userId}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User unlocked successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to unlock user',
        variant: 'destructive',
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await fastapiClient.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const handleLockUser = (userId: string) => {
    lockUserMutation.mutate(userId);
  };

  const handleUnlockUser = (userId: string) => {
    unlockUserMutation.mutate(userId);
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await fastapiClient.post('/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setIsAddUserOpen(false);
      setNewUserData({ email: '', password: '', display_name: '', role: 'user' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: Partial<typeof editUserData> }) => {
      return await fastapiClient.put(`/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      setEditUserData({ email: '', display_name: '', role: 'user', new_password: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleAddUser = () => {
    createUserMutation.mutate(newUserData);
  };

  const handleEditUser = () => {
    if (selectedUser) {
      const updateData: any = {};
      if (editUserData.email) updateData.email = editUserData.email;
      if (editUserData.display_name !== undefined) updateData.display_name = editUserData.display_name;
      if (editUserData.role) updateData.role = editUserData.role;
      if (editUserData.new_password) updateData.password = editUserData.new_password;
      
      updateUserMutation.mutate({ userId: selectedUser.id, userData: updateData });
    }
  };

  const handleViewUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsViewUserOpen(true);
  };

  const handleEditUserClick = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditUserData({
      email: user.email,
      display_name: user.display_name || '',
      role: user.role,
      new_password: ''
    });
    setIsEditUserOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'accounting_manager':
        return <Crown className="h-4 w-4" />;
      case 'controller':
        return <Building2 className="h-4 w-4" />;
      case 'manager':
        return <UserCog className="h-4 w-4" />;
      case 'guest':
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'accounting_manager':
        return 'destructive';
      case 'controller':
        return 'default';
      case 'manager':
        return 'default';
      case 'guest':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filteredUsers = selectedRole === 'all' || !selectedRole 
    ? users
    : users?.filter(user => user.role === selectedRole);

  if (isLoading) {
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
          <h2 className="text-3xl font-bold text-foreground">User & Location Management</h2>
          <p className="text-muted-foreground">Manage user accounts, roles, and geographic assignments</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Roles</TabsTrigger>
          <TabsTrigger value="locations">Location Hierarchy</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center space-x-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="accounting_manager">Accounting Managers</SelectItem>
                <SelectItem value="controller">Controllers</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="guest">Guests</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>View and manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="flex justify-end mb-1">
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with role and permissions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid gap-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          placeholder="Enter password"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={newUserData.display_name}
                          onChange={(e) => setNewUserData({ ...newUserData, display_name: e.target.value })}
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="role">Role</Label>
                        <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="controller">Controller</SelectItem>
                            <SelectItem value="accounting_manager">Accounting Manager</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button variant="outline" onClick={() => setIsAddUserOpen(false)} size="sm">
                        Cancel
                      </Button>
                      <Button onClick={handleAddUser} disabled={createUserMutation.isPending} size="sm">
                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Member Since</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <span>{user.display_name || user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? "Active" : "Locked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            <ViewIcon className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUserClick(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Change role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="accounting_manager">Accounting Manager</SelectItem>
                              <SelectItem value="controller">Controller</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="guest">Guest</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {user.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLockUser(user.id)}
                              disabled={lockUserMutation.isPending}
                            >
                              Lock
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlockUser(user.id)}
                              disabled={unlockUserMutation.isPending}
                            >
                              Unlock
                            </Button>
                          )}
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'admin').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accounting Managers</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'accounting_manager').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Controllers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'controller').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Guests</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'guest').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <LocationHierarchyManagement />
        </TabsContent>

        <TabsContent value="assignments">
          <UserAssignmentManagement />
        </TabsContent>
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View user information and account details.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="p-2 bg-muted rounded">{selectedUser.email}</div>
              </div>
              <div className="grid gap-2">
                <Label>Display Name</Label>
                <div className="p-2 bg-muted rounded">{selectedUser.display_name || 'Not set'}</div>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <div className="p-2 bg-muted rounded">
                  <Badge variant={getRoleVariant(selectedUser.role)}>{selectedUser.role}</Badge>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="p-2 bg-muted rounded">
                  <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
                    {selectedUser.is_active ? "Active" : "Locked"}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Member Since</Label>
                <div className="p-2 bg-muted rounded">
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewUserOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and change password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-display_name">Display Name</Label>
              <Input
                id="edit-display_name"
                value={editUserData.display_name}
                onChange={(e) => setEditUserData({ ...editUserData, display_name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editUserData.role} onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="controller">Controller</SelectItem>
                  <SelectItem value="accounting_manager">Accounting Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editUserData.new_password}
                onChange={(e) => setEditUserData({ ...editUserData, new_password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};