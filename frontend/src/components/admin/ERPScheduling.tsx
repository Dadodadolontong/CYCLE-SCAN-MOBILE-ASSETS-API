import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GitBranch, Plus, Settings, Play, Calendar, Clock } from 'lucide-react';

export const ERPScheduling = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    sync_type: '',
    schedule_type: '',
    schedule_time: ''
  });

  const { data: syncLogs, isLoading } = useQuery({
    queryKey: ['erp-sync-logs'],
    queryFn: async () => {
      const response = await fetch('/api/erp/sync-logs');
      if (!response.ok) {
        throw new Error('Failed to fetch sync logs');
      }
      return response.json();
    }
  });

  const { data: scheduledSyncs } = useQuery({
    queryKey: ['scheduled-syncs'],
    queryFn: async () => {
      const response = await fetch('/api/erp/scheduled-syncs');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled syncs');
      }
      return response.json();
    }
  });

  const manualSyncMutation = useMutation({
    mutationFn: async (syncType: string) => {
      const response = await fetch(`/api/erp/sync/${syncType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manual: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to start manual sync');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, syncType) => {
      queryClient.invalidateQueries({ queryKey: ['erp-sync-logs'] });
      toast({
        title: 'Sync Started',
        description: `Manual ${syncType} sync has been initiated`,
      });
    },
    onError: (error, syncType) => {
      toast({
        title: 'Sync Failed',
        description: `Failed to start ${syncType} sync`,
        variant: 'destructive',
      });
    }
  });

  const scheduleSync = async () => {
    try {
      // Calculate next run time based on schedule type
      const now = new Date();
      let nextRun = new Date();
      
      switch (scheduleForm.schedule_type) {
        case 'daily':
          nextRun.setDate(now.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(now.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(now.getMonth() + 1);
          break;
      }

      // Set specific time if provided
      if (scheduleForm.schedule_time) {
        const [hours, minutes] = scheduleForm.schedule_time.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const response = await fetch('/api/erp/schedule-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sync_type: scheduleForm.sync_type,
          schedule_type: scheduleForm.schedule_type,
          next_run_at: nextRun.toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule sync');
      }

      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['scheduled-syncs'] });
      setIsScheduleDialogOpen(false);
      setScheduleForm({ sync_type: '', schedule_type: '', schedule_time: '' });
      
      toast({
        title: 'Sync Scheduled',
        description: `${scheduleForm.sync_type} sync scheduled for ${scheduleForm.schedule_type} runs`,
      });
    } catch (error) {
      toast({
        title: 'Scheduling Failed',
        description: 'Failed to schedule sync operation',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">ERP Sync Scheduling</h2>
          <p className="text-muted-foreground">Manage automated ERP data synchronization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => manualSyncMutation.mutate('assets')}
            disabled={manualSyncMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Sync Assets
          </Button>
          <Button
            variant="outline"
            onClick={() => manualSyncMutation.mutate('locations')}
            disabled={manualSyncMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Sync Locations
          </Button>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Sync
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule ERP Sync</DialogTitle>
                <DialogDescription>
                  Set up automated synchronization with your ERP system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sync_type">Sync Type</Label>
                  <Select value={scheduleForm.sync_type} onValueChange={(value) => 
                    setScheduleForm({ ...scheduleForm, sync_type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sync type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">Assets</SelectItem>
                      <SelectItem value="locations">Locations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="schedule_type">Frequency</Label>
                  <Select value={scheduleForm.schedule_type} onValueChange={(value) => 
                    setScheduleForm({ ...scheduleForm, schedule_type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="schedule_time">Time (optional)</Label>
                  <Input
                    id="schedule_time"
                    type="time"
                    value={scheduleForm.schedule_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_time: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={scheduleSync} disabled={!scheduleForm.sync_type || !scheduleForm.schedule_type}>
                  Schedule Sync
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Scheduled Syncs</span>
            </CardTitle>
            <CardDescription>Active sync schedules and their next run times</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledSyncs?.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No scheduled syncs</p>
                <p className="text-sm">Create a schedule to automate ERP synchronization</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledSyncs?.map((sync) => (
                  <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{sync.sync_type}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {sync.schedule_type} sync
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {sync.next_run_at ? new Date(sync.next_run_at).toLocaleDateString() : 'No schedule'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sync.next_run_at ? new Date(sync.next_run_at).toLocaleTimeString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>ERP Configuration</span>
            </CardTitle>
            <CardDescription>Configure ERP connection settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">
                  ERP integration is handled via edge functions. Configure your ERP endpoints and credentials 
                  in the system settings or edge function environment variables.
                </p>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure ERP Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Recent Sync History</span>
          </CardTitle>
          <CardDescription>Monitor ERP synchronization operations and their results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.sync_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(log.status)} className="capitalize">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{log.records_processed || 0} processed</p>
                        {log.errors_count > 0 && (
                          <p className="text-red-600">{log.errors_count} errors</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(log.started_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(log.started_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.completed_at ? (
                        <span className="text-sm">
                          {Math.round(
                            (new Date(log.completed_at).getTime() - 
                             new Date(log.started_at).getTime()) / 1000
                          )}s
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.schedule_type ? (
                        <Badge variant="outline" className="capitalize">
                          {log.schedule_type}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Manual</span>
                      )}
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