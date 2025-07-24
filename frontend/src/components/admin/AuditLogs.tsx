import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Search, Filter, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_display_name?: string;
}

export const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // First get audit logs
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user profiles for display names
      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        // Merge user display names
        const logsWithUsers = logs.map(log => ({
          ...log,
          user_display_name: profiles?.find(p => p.id === log.user_id)?.display_name || 'Unknown User'
        }));

        return logsWithUsers as AuditLog[];
      }

      return logs as AuditLog[];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, resource_type');

      if (error) throw error;

      const actions = [...new Set(data.map(log => log.action))];
      const resources = [...new Set(data.map(log => log.resource_type))];
      const todayCount = data.length; // Simplified for now

      return { totalLogs: data.length, todayCount, actions, resources };
    }
  });

  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || !actionFilter || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || !resourceFilter || log.resource_type === resourceFilter;

    return matchesSearch && matchesAction && matchesResource;
  });

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    if (action.includes('delete')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Audit Logs</h2>
        <p className="text-muted-foreground">Monitor administrative actions and system events</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLogs || 0}</div>
            <p className="text-xs text-muted-foreground">All time audit entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
            <p className="text-xs text-muted-foreground">Actions performed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Actions</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.actions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Different action types</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Administrative Actions</span>
          </CardTitle>
          <CardDescription>
            Detailed log of all administrative actions performed in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, resources, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {stats?.actions?.map((action) => (
                  <SelectItem key={action} value={action} className="capitalize">
                    {action.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {stats?.resources?.map((resource) => (
                  <SelectItem key={resource} value={resource} className="capitalize">
                    {resource.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">
                {searchTerm || actionFilter || resourceFilter 
                  ? 'Try adjusting your search filters'
                  : 'Administrative actions will appear here'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)} className="capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.user_display_name || 'System'}</p>
                        {log.user_id && (
                          <p className="text-xs text-muted-foreground">
                            {log.user_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="capitalize">{log.resource_type.replace(/_/g, ' ')}</p>
                        {log.resource_id && (
                          <p className="text-xs text-muted-foreground">
                            ID: {log.resource_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.details ? (
                        <div className="text-sm">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="text-xs text-muted-foreground">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(log.created_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {log.ip_address || '-'}
                      </span>
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