import { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { Chrome } from 'lucide-react';
import { config } from "@/config";

const API_BASE_URL = config.api.url;

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  // useEffect(() => {
  //   if (user) {
  //     navigate('/dashboard');
  //   }
  // }, [user, navigate]);

  // Load custom OAuth providers
  // useEffect(() => {
  //   const loadCustomProviders = async () => {
  //     try {
  //       const { data: providers, error } = await supabase
  //         .from('oauth_providers')
  //         .select('*')
  //         .eq('is_active', true);

  //       if (error) {
  //         console.error('Error loading custom providers:', error);
  //         return;
  //       }

  //       setCustomProviders(providers || []);
  //     } catch (error) {
  //       console.error('Error loading custom providers:', error);
  //     }
  //   };

  //   loadCustomProviders();
  // }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const message = params.get('message');
    if (message) {
      toast({
        title: "Notice",
        description: message,
        variant: "default",
      });
    }
  }, [location, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced input validation
    // try {
    //   emailSchema.parse(email);
    // } catch (error: any) {
    //   toast({
    //     title: "Invalid Email",
    //     description: error.issues?.[0]?.message || "Please enter a valid email address.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

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
    // try {
    //   emailSchema.parse(email);
    // } catch (error: any) {
    //   toast({
    //     title: "Invalid Email",
    //     description: error.issues?.[0]?.message || "Please enter a valid email address.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // try {
    //   passwordSchema.parse(password);
    // } catch (error: any) {
    //   toast({
    //     title: "Invalid Password",
    //     description: error.issues?.[0]?.message || "Password must meet security requirements.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

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

  // const handleOAuthSignIn = async (provider: 'google' | 'github') => {
  //   setLoading(true);
  //   try {
  //     const { error } = await signInWithOAuth(provider);
      
  //     if (error) {
  //       toast({
  //         title: "OAuth Sign In Failed",
  //         description: error.message,
  //         variant: "destructive",
  //       });
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "An unexpected error occurred.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleCustomOAuthSignIn = async (provider: CustomOAuthProvider) => {
  //   setLoading(true);
  //   try {
  //     const config = {
  //       provider: provider.name.toLowerCase(),
  //       clientId: provider.client_id,
  //       redirectUri: `${window.location.origin}/auth/callback`,
  //       authUrl: provider.auth_url,
  //       tokenUrl: provider.token_url,
  //       userInfoUrl: provider.user_info_url,
  //       scopes: provider.scopes,
  //     };

  //     const { error } = await signInWithCustomOAuth(config);
      
  //     if (error) {
  //       toast({
  //         title: "OAuth Sign In Failed",
  //         description: error.message,
  //         variant: "destructive",
  //       });
  //     }
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "An unexpected error occurred.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Add this function for FastAPI OAuth login
  const handleFastAPIOAuthLogin = () => {
  //  window.location.href = 'http://localhost:8002/auth/login'; // Use your actual backend URL/port
    window.location.href = `${API_BASE_URL.replace(/\/$/, '')}/auth/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">Sign In</h2>
        {/* Email/Password Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-border" />
          <span className="mx-2 text-muted-foreground text-xs">or</span>
          <div className="flex-grow border-t border-border" />
        </div>
        {/* OAuth Login Button */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleFastAPIOAuthLogin}
        >
          <Chrome className="h-5 w-5" />
          Sign in with DexanPassport
        </Button>
      </Card>
    </div>
  );
};

export default Auth;