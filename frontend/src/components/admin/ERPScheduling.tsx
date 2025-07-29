import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitBranch, Settings, Play, Calendar, Clock } from 'lucide-react';

export const ERPScheduling = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">ERP Sync Scheduling</h2>
          <p className="text-muted-foreground">Manage automated ERP data synchronization</p>
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
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">ERP Sync Coming Soon</h3>
              <p className="text-sm mb-4">
                Automated ERP synchronization features are currently under development.
              </p>
              <p className="text-xs">
                This will include scheduled syncs, manual sync triggers, and sync history monitoring.
              </p>
            </div>
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
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Configuration Coming Soon</h3>
              <p className="text-sm mb-4">
                ERP connection settings and configuration will be available here.
              </p>
              <p className="text-xs">
                You'll be able to configure endpoints, credentials, and sync parameters.
              </p>
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
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Sync History Coming Soon</h3>
            <p className="text-sm mb-4">
              Track and monitor all ERP synchronization operations.
            </p>
            <p className="text-xs">
              View sync logs, success rates, error details, and performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};