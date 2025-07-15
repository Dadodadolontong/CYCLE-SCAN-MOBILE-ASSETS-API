import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { Github, Chrome, Lock, Mail, User, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { emailSchema, passwordSchema } from '@/lib/security-enhanced';
import { supabase } from '@/integrations/supabase/client';


interface CustomOAuthProvider {
  id: string;
  name: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  is_active: boolean;
}

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signInWithPassword, signUpWithPassword, signInWithOAuth, signInWithCustomOAuth } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [customProviders, setCustomProviders] = useState<CustomOAuthProvider[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load custom OAuth providers
  useEffect(() => {
    const loadCustomProviders = async () => {
      try {
        const { data: providers, error } = await supabase
          .from('oauth_providers')
          .select('*')
          .eq('is_active', true);

        if (error) {
          console.error('Error loading custom providers:', error);
          return;
        }

        setCustomProviders(providers || []);
      } catch (error) {
        console.error('Error loading custom providers:', error);
      }
    };

    loadCustomProviders();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced input validation
    try {
      emailSchema.parse(email);
    } catch (error: any) {
      toast({
        title: "Invalid Email",
        description: error.issues?.[0]?.message || "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Missing Password",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signInWithPassword(email, password);
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        navigate('/dashboard');
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced input validation
    try {
      emailSchema.parse(email);
    } catch (error: any) {
      toast({
        title: "Invalid Email",
        description: error.issues?.[0]?.message || "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (error: any) {
      toast({
        title: "Invalid Password",
        description: error.issues?.[0]?.message || "Password must meet security requirements.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUpWithPassword(email, password);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Try signing in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to confirm your account.",
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

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      
      if (error) {
        toast({
          title: "OAuth Sign In Failed",
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

  const handleCustomOAuthSignIn = async (provider: CustomOAuthProvider) => {
    setLoading(true);
    try {
      const config = {
        provider: provider.name.toLowerCase(),
        clientId: provider.client_id,
        redirectUri: `${window.location.origin}/auth/callback`,
        authUrl: provider.auth_url,
        tokenUrl: provider.token_url,
        userInfoUrl: provider.user_info_url,
        scopes: provider.scopes,
      };

      const { error } = await signInWithCustomOAuth(config);
      
      if (error) {
        toast({
          title: "OAuth Sign In Failed",
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Asset Cycle Count
          </h1>
          <p className="text-muted-foreground">
            Sign in to manage your asset counting tasks
          </p>
        </div>

        <Card className="p-6 bg-card">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                   <p className="text-xs text-muted-foreground">
                     Password must be at least 8 characters with uppercase, lowercase and number
                   </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Built-in providers
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
              >
                <Chrome className="w-4 h-4 mr-2" />
                Google
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn('github')}
                disabled={loading}
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>

            {customProviders.length > 0 && (
              <>
                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Custom providers
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {customProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCustomOAuthSignIn(provider)}
                      disabled={loading}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {provider.name}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>

        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;