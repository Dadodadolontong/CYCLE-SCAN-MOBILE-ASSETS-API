import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
}

export const SystemSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await fetch('/api/system-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      const data: SystemSetting[] = await response.json();

      const settingsMap: Record<string, any> = {};
      data.forEach((setting: SystemSetting) => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      
      setSettings(settingsMap);
      return data as SystemSetting[];
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Record<string, any>) => {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }

      await fetch('/api/log-admin-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _action: 'update_system_settings',
          _resource_type: 'system_settings',
          _details: { updated_keys: Object.keys(updatedSettings) }
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setHasChanges(false);
      toast({
        title: 'Settings Updated',
        description: 'System settings have been saved successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update system settings',
        variant: 'destructive',
      });
    }
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

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
          <h2 className="text-3xl font-bold text-foreground">System Settings</h2>
          <p className="text-muted-foreground">Configure global application settings</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {hasChanges && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700">
                You have unsaved changes. Click "Save Changes" to apply them.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Application Settings</span>
            </CardTitle>
            <CardDescription>
              Basic application configuration and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="app_name">Application Name</Label>
              <Input
                id="app_name"
                value={settings.app_name || ''}
                onChange={(e) => handleSettingChange('app_name', e.target.value)}
                placeholder="Asset Management System"
              />
              <p className="text-sm text-muted-foreground">
                The display name for your application
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to register for accounts
                </p>
              </div>
              <Switch
                checked={settings.allow_registration || false}
                onCheckedChange={(checked) => handleSettingChange('allow_registration', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & Performance</CardTitle>
            <CardDescription>
              Configure security policies and performance limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="session_timeout">Session Timeout (seconds)</Label>
              <Input
                id="session_timeout"
                type="number"
                value={settings.session_timeout || 3600}
                onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                min="300"
                max="86400"
              />
              <p className="text-sm text-muted-foreground">
                How long user sessions remain active (300 seconds to 24 hours)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_upload_size">Max Upload Size (bytes)</Label>
              <Input
                id="max_upload_size"
                type="number"
                value={settings.max_upload_size || 10485760}
                onChange={(e) => handleSettingChange('max_upload_size', parseInt(e.target.value))}
                min="1048576"
                max="104857600"
              />
              <p className="text-sm text-muted-foreground">
                Maximum file upload size in bytes (1MB to 100MB)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ERP Integration</CardTitle>
            <CardDescription>
              Configure external system integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="erp_api_url">ERP API URL</Label>
              <Input
                id="erp_api_url"
                value={settings.erp_api_url || ''}
                onChange={(e) => handleSettingChange('erp_api_url', e.target.value)}
                placeholder="https://your-erp-system.com/api"
              />
              <p className="text-sm text-muted-foreground">
                Base URL for your ERP system's API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="erp_api_key">ERP API Key</Label>
              <Input
                id="erp_api_key"
                type="password"
                value={settings.erp_api_key || ''}
                onChange={(e) => handleSettingChange('erp_api_key', e.target.value)}
                placeholder="Enter your ERP API key"
              />
              <p className="text-sm text-muted-foreground">
                API key for authenticating with your ERP system
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync_interval">Auto Sync Interval (minutes)</Label>
              <Input
                id="sync_interval"
                type="number"
                value={settings.sync_interval || 60}
                onChange={(e) => handleSettingChange('sync_interval', parseInt(e.target.value))}
                min="5"
                max="1440"
              />
              <p className="text-sm text-muted-foreground">
                How often to automatically sync with ERP (5 minutes to 24 hours)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto Sync Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync data with ERP system
                </p>
              </div>
              <Switch
                checked={settings.auto_sync_enabled || false}
                onCheckedChange={(checked) => handleSettingChange('auto_sync_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure system email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={settings.smtp_host || ''}
                onChange={(e) => handleSettingChange('smtp_host', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={settings.smtp_port || 587}
                  onChange={(e) => handleSettingChange('smtp_port', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_user">SMTP Username</Label>
                <Input
                  id="smtp_user"
                  value={settings.smtp_user || ''}
                  onChange={(e) => handleSettingChange('smtp_user', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">SMTP Password</Label>
              <Input
                id="smtp_password"
                type="password"
                value={settings.smtp_password || ''}
                onChange={(e) => handleSettingChange('smtp_password', e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for system events
                </p>
              </div>
              <Switch
                checked={settings.email_notifications_enabled || false}
                onCheckedChange={(checked) => handleSettingChange('email_notifications_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};