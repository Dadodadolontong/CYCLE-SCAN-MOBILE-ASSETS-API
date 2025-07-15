import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback, user } = useAuth();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Debug: Log all URL parameters
        console.log('Full callback URL:', window.location.href);
        console.log('All URL parameters:', Object.fromEntries(urlParams.entries()));

        // Get session ID from state parameter and retrieve config from database
        const state = urlParams.get('state');
        let config;

        if (!state) {
          console.error('No state parameter in callback URL');
          console.error('Available parameters:', Object.fromEntries(urlParams.entries()));
          throw new Error('No state parameter received from OAuth provider. This may be a configuration issue with the OAuth provider.');
        }

        console.log('Retrieving OAuth config from database with session ID:', state);

        // Retrieve configuration from database using session ID
        const { data: sessionData, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('config')
          .eq('id', state)
          .single();

        if (sessionError || !sessionData) {
          console.error('Failed to retrieve OAuth session:', sessionError);
          throw new Error(`OAuth session not found or expired: ${sessionError?.message}`);
        }

        config = sessionData.config;
        console.log('OAuth config retrieved from database for provider:', config?.provider || 'unknown');

        // Clean up the OAuth session from database
        try {
          await supabase
            .from('oauth_sessions')
            .delete()
            .eq('id', state);
          console.log('OAuth session cleaned up successfully');
        } catch (cleanupError) {
          console.warn('Failed to cleanup OAuth session:', cleanupError);
          // Continue anyway - this is not critical
        }

        console.log('Using OAuth config for provider:', config?.provider || 'unknown');

        // Handle the OAuth callback
        const { error: callbackError } = await handleOAuthCallback(code, config);

        if (callbackError) {
          throw callbackError;
        }

        // Wait a moment for auth state to update
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Authentication Failed",
          description: error.message,
          variant: "destructive",
        });
        navigate('/auth');
      }
    };

    // Only run once when component mounts
    handleCallback();
  }, []); // Empty dependency array to prevent multiple executions

  // Handle navigation after user and role are available
  useEffect(() => {
    if (!isProcessing && user && userRole !== undefined) {
      if (userRole === 'guest') {
        toast({
          title: "Account Created",
          description: "Your account is pending approval. An admin will assign you the appropriate role.",
          variant: "default",
        });
        navigate('/');
      } else {
        toast({
          title: "Authentication Successful",
          description: "You have been signed in successfully.",
        });
        navigate('/dashboard');
      }
    }
  }, [isProcessing, user, userRole, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;