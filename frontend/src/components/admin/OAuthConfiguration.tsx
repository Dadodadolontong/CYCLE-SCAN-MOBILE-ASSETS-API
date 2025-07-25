import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Shield, Edit, Trash2 } from 'lucide-react';

interface OAuthProvider {
  id: string;
  name: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
}

export const OAuthConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<OAuthProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    auth_url: '',
    token_url: '',
    user_info_url: '',
    scopes: '',
    is_active: true
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oauth_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OAuthProvider[];
    }
  });

  const createProviderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('oauth_providers')
        .insert({
          name: data.name,
          client_id: data.client_id,
          auth_url: data.auth_url,
          token_url: data.token_url,
          user_info_url: data.user_info_url,
          scopes: data.scopes.split(',').map(s => s.trim()),
          is_active: data.is_active
        });

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'create_oauth_provider',
        _resource_type: 'oauth_provider',
        _details: { provider_name: data.name }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'OAuth provider created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create OAuth provider',
        variant: 'destructive',
      });
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('oauth_providers')
        .update({
          name: data.name,
          client_id: data.client_id,
          auth_url: data.auth_url,
          token_url: data.token_url,
          user_info_url: data.user_info_url,
          scopes: data.scopes.split(',').map(s => s.trim()),
          is_active: data.is_active
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'update_oauth_provider',
        _resource_type: 'oauth_provider',
        _resource_id: id,
        _details: { provider_name: data.name }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
      setIsDialogOpen(false);
      setEditingProvider(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'OAuth provider updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update OAuth provider',
        variant: 'destructive',
      });
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('oauth_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'delete_oauth_provider',
        _resource_type: 'oauth_provider',
        _resource_id: id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-providers'] });
      toast({
        title: 'Success',
        description: 'OAuth provider deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete OAuth provider',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      client_id: '',
      auth_url: '',
      token_url: '',
      user_info_url: '',
      scopes: '',
      is_active: true
    });
  };

  const handleEdit = (provider: OAuthProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      client_id: provider.client_id,
      auth_url: provider.auth_url,
      token_url: provider.token_url,
      user_info_url: provider.user_info_url,
      scopes: provider.scopes.join(', '),
      is_active: provider.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, data: formData });
    } else {
      createProviderMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">OAuth Configuration</h2>
          <p className="text-muted-foreground">Manage custom OAuth2 authentication providers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProvider(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Edit OAuth Provider' : 'Add OAuth Provider'}
              </DialogTitle>
              <DialogDescription>
                Configure a custom OAuth2 authentication provider
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Provider Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Company LDAP"
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_id">Client ID</Label>
                <Input
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="auth_url">Authorization URL</Label>
                <Input
                  id="auth_url"
                  value={formData.auth_url}
                  onChange={(e) => setFormData({ ...formData, auth_url: e.target.value })}
                  placeholder="https://provider.com/oauth/authorize"
                  required
                />
              </div>
              <div>
                <Label htmlFor="token_url">Token URL</Label>
                <Input
                  id="token_url"
                  value={formData.token_url}
                  onChange={(e) => setFormData({ ...formData, token_url: e.target.value })}
                  placeholder="https://provider.com/oauth/token"
                  required
                />
              </div>
              <div>
                <Label htmlFor="user_info_url">User Info URL</Label>
                <Input
                  id="user_info_url"
                  value={formData.user_info_url}
                  onChange={(e) => setFormData({ ...formData, user_info_url: e.target.value })}
                  placeholder="https://provider.com/oauth/userinfo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="scopes">Scopes (comma-separated)</Label>
                <Input
                  id="scopes"
                  value={formData.scopes}
                  onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                  placeholder="read, write, profile"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createProviderMutation.isPending || updateProviderMutation.isPending}>
                  {editingProvider ? 'Update' : 'Create'} Provider
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>OAuth Providers</span>
          </CardTitle>
          <CardDescription>
            Manage custom OAuth2 authentication providers for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : providers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No OAuth providers configured</p>
              <p className="text-sm">Add your first custom OAuth provider to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers?.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Client ID: {provider.client_id.slice(0, 12)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {provider.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {provider.scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{provider.scopes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(provider.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
                          disabled={deleteProviderMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};