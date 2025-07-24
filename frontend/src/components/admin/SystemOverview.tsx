import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fastapiClient } from '@/integrations/fastapi/client';
import { Users, Database, GitBranch, AlertCircle } from 'lucide-react';

interface UserStats {
  total_users: number;
  admin_count: number;
  manager_count: number;
  user_count: number;
  guest_count: number;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  error_message?: string;
}

interface DataStats {
  total_assets: number;
  total_locations: number;
  recent_syncs: SyncLog[];
}

export const SystemOverview = () => {
  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const data = await fastapiClient.get<any>('/admin/stats/users');
      return data;
    }
  });

  const { data: dataStats } = useQuery({
    queryKey: ['admin-data-stats'],
    queryFn: async () => {
      const data = await fastapiClient.get<DataStats>('/admin/stats/data');
      return {
        totalAssets: data.total_assets,
        totalLocations: data.total_locations,
        recentSyncs: data.recent_syncs || []
      };
    }
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const data = await fastapiClient.get<{ roles: string[] }>('/admin/roles');
      return data.roles;
    }
  });

  // Map role name to display label
  const roleLabels: Record<string, string> = {
    admin: 'Administrators',
    manager: 'Managers',
    user: 'Users',
    guest: 'Guests',
    accounting_manager: 'Accounting Managers',
    controller: 'Controllers',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">System Overview</h2>
        <p className="text-muted-foreground">Monitor your system's health and activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.adminCount || 0} admins, {userStats?.managerCount || 0} managers, {userStats?.userCount || 0} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataStats?.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Assets in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataStats?.totalLocations || 0}</div>
            <p className="text-xs text-muted-foreground">Locations configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Syncs</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataStats?.recentSyncs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 5 sync operations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
            <CardDescription>Latest ERP synchronization operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dataStats?.recentSyncs?.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      sync.status === 'completed' ? 'bg-green-500' :
                      sync.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{sync.sync_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sync.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{sync.records_processed || 0} records</p>
                    <p className={`text-xs capitalize ${
                      sync.status === 'completed' ? 'text-green-600' :
                      sync.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {sync.status}
                    </p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent sync activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
            <CardDescription>Breakdown of user roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rolesData?.length ? (
                rolesData.map((role) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm">{roleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    <span className="text-sm font-medium">{userStats?.[`${role}_count`] ?? 0}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">No roles found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};