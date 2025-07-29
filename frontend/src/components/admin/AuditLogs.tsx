import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Activity, Clock, AlertTriangle } from 'lucide-react';

export const AuditLogs = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">Monitor system activity and security events</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest system events and user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Activity Logs Coming Soon</h3>
              <p className="text-sm mb-4">
                System activity monitoring and logging features are under development.
              </p>
              <p className="text-xs">
                This will include user actions, system events, and activity tracking.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Events</span>
            </CardTitle>
            <CardDescription>Monitor security-related events and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Security Monitoring Coming Soon</h3>
              <p className="text-sm mb-4">
                Security event monitoring and alerting features are under development.
              </p>
              <p className="text-xs">
                This will include login attempts, permission changes, and security alerts.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Audit History</span>
            </CardTitle>
            <CardDescription>Historical audit trail and compliance reporting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Audit History Coming Soon</h3>
              <p className="text-sm mb-4">
                Historical audit trail and compliance reporting features are under development.
              </p>
              <p className="text-xs">
                This will include data retention, compliance reports, and audit exports.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alerts & Notifications</span>
            </CardTitle>
            <CardDescription>Configure audit alerts and notification settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Alert System Coming Soon</h3>
              <p className="text-sm mb-4">
                Audit alert and notification configuration features are under development.
              </p>
              <p className="text-xs">
                This will include alert rules, notification channels, and escalation policies.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};