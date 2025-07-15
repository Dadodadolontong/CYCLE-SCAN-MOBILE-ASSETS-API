import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { ExternalLink, Settings } from 'lucide-react';

interface CustomOAuthProviderProps {
  providerName: string;
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  icon?: React.ReactNode;
}

const CustomOAuthProvider = ({
  providerName,
  clientId,
  authUrl,
  tokenUrl,
  userInfoUrl,
  scopes,
  icon,
}: CustomOAuthProviderProps) => {
  const { signInWithCustomOAuth } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const config = {
        provider: providerName.toLowerCase(),
        clientId,
        redirectUri: `${window.location.origin}/auth/callback`,
        authUrl,
        tokenUrl,
        userInfoUrl,
        scopes,
      };

      const { error } = await signInWithCustomOAuth(config);
      
      if (error) {
        toast({
          title: "Authentication Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleSignIn}
      disabled={loading}
    >
      {icon || <ExternalLink className="w-4 h-4 mr-2" />}
      {loading ? `Connecting to ${providerName}...` : `Sign in with ${providerName}`}
    </Button>
  );
};

export const CustomOAuthSetup = () => {
  const [providerName, setProviderName] = useState('');
  const [clientId, setClientId] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [userInfoUrl, setUserInfoUrl] = useState('');
  const [scopes, setScopes] = useState('');
  const [savedProviders, setSavedProviders] = useState<CustomOAuthProviderProps[]>([]);

  const handleSaveProvider = () => {
    if (!providerName || !clientId || !authUrl || !tokenUrl || !userInfoUrl) {
      return;
    }

    const newProvider: CustomOAuthProviderProps = {
      providerName,
      clientId,
      authUrl,
      tokenUrl,
      userInfoUrl,
      scopes: scopes.split(',').map(s => s.trim()),
    };

    setSavedProviders([...savedProviders, newProvider]);
    
    // Clear form
    setProviderName('');
    setClientId('');
    setAuthUrl('');
    setTokenUrl('');
    setUserInfoUrl('');
    setScopes('');

    // Save to localStorage for persistence
    localStorage.setItem('custom_oauth_providers', JSON.stringify([...savedProviders, newProvider]));
  };

  // Load saved providers on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('custom_oauth_providers');
    if (saved) {
      setSavedProviders(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Custom OAuth2 Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Provider Name</Label>
              <Input
                id="provider-name"
                placeholder="e.g., Okta, Azure AD, Custom"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                placeholder="Your OAuth2 client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-url">Authorization URL</Label>
            <Input
              id="auth-url"
              placeholder="https://your-provider.com/oauth/authorize"
              value={authUrl}
              onChange={(e) => setAuthUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-url">Token URL</Label>
            <Input
              id="token-url"
              placeholder="https://your-provider.com/oauth/token"
              value={tokenUrl}
              onChange={(e) => setTokenUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-info-url">User Info URL</Label>
            <Input
              id="user-info-url"
              placeholder="https://your-provider.com/oauth/userinfo"
              value={userInfoUrl}
              onChange={(e) => setUserInfoUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopes">Scopes (comma-separated)</Label>
            <Input
              id="scopes"
              placeholder="openid, profile, email"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
            />
          </div>

          <Button onClick={handleSaveProvider} className="w-full">
            Save Provider Configuration
          </Button>
        </CardContent>
      </Card>

      {savedProviders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available OAuth2 Providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedProviders.map((provider, index) => (
              <CustomOAuthProvider key={index} {...provider} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong>Setup Instructions:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Register your application with your OAuth2 provider</li>
          <li>Set the redirect URI to: <code className="bg-muted px-1 rounded">{window.location.origin}/auth/callback</code></li>
          <li>Copy the client ID and URLs from your provider's documentation</li>
          <li>Configure the client secret in your Supabase edge function environment</li>
        </ol>
      </div>
    </div>
  );
};

export { CustomOAuthProvider };