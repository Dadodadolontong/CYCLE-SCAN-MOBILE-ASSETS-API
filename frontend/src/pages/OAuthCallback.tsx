import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { fastapiClient } from '@/integrations/fastapi/client';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
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

        // Call FastAPI backend /auth/callback
        const resp = await fastapiClient.get(`/auth/callback?code=${encodeURIComponent(code)}`);
        if (resp.status === 'active') {
          // Set user info in global auth context
          setUser(resp.user);
          setIsProcessing(false);
          toast({
            title: "Authentication Successful",
            description: "You have been signed in successfully.",
          });
          navigate('/dashboard');
        } else if (resp.status === 'pending_review') {
          toast({
            title: "Account Pending Review",
            description: resp.message || "Your account is pending review by an administrator.",
            variant: "default",
          });
          navigate('/auth');
        } else {
          throw new Error('Unknown authentication status');
        }
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
    handleCallback();
  }, [navigate, toast, setUser]);

  // Handle navigation after user and role are available
  useEffect(() => {
    if (!isProcessing && userRole !== undefined) {
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
  }, [isProcessing, userRole, navigate, toast]);

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