import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/auth-cleanup';
import { checkServerRateLimit, createSecurityAuditLog, trackUserSession } from '@/lib/security-enhanced';

interface CustomOAuthConfig {
  provider: string;
  clientId: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error?: any }>;
  signInWithCustomOAuth: (config: CustomOAuthConfig) => Promise<{ error?: any }>;
  handleOAuthCallback: (code: string, config: CustomOAuthConfig) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer profile creation to avoid deadlocks
          setTimeout(() => {
            ensureProfile(session.user);
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfile = async (user: User) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Profile should be created by trigger, but fallback just in case
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: user.user_metadata?.display_name || user.user_metadata?.name || user.email,
          });
      }
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      // Rate limiting check
      const canProceed = await checkServerRateLimit(email, 'sign_in', 5, 15);
      if (!canProceed) {
        throw new Error('Too many sign-in attempts. Please try again later.');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed sign-in attempt
        await createSecurityAuditLog('sign_in_failed', 'auth', undefined, { 
          email, 
          error: error.message 
        });
        throw error;
      }

      // Log successful sign-in and track session
      await createSecurityAuditLog('sign_in_success', 'auth', data.user?.id);
      await trackUserSession('start');
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    try {
      // Rate limiting check for sign-up
      const canProceed = await checkServerRateLimit(email, 'sign_up', 3, 60);
      if (!canProceed) {
        throw new Error('Too many sign-up attempts. Please try again later.');
      }
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        // Log failed sign-up attempt
        await createSecurityAuditLog('sign_up_failed', 'auth', undefined, { 
          email, 
          error: error.message 
        });
        throw error;
      }

      // Log successful sign-up
      await createSecurityAuditLog('sign_up_success', 'auth', data.user?.id);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signInWithCustomOAuth = async (config: CustomOAuthConfig) => {
    try {
      // Store OAuth configuration in database and get session ID
      const { data: session, error: sessionError } = await supabase
        .from('oauth_sessions')
        .insert({
          config: config as any // Cast to Json type for Supabase
        })
        .select('id')
        .single();

      if (sessionError || !session) {
        throw new Error(`Failed to create OAuth session: ${sessionError?.message}`);
      }

      console.log('Created OAuth session:', session.id);

      // Parse the existing auth URL to check for custom provider handling
      const authUrlObj = new URL(config.authUrl);
      
      // Check if this is a custom provider that already has its own parameters
      const hasCustomParams = authUrlObj.searchParams.size > 0;
      
      let authUrl: string;
      
      if (hasCustomParams) {
        // For custom providers (like DexanPassport), preserve existing parameters
        // but add all required OAuth parameters
        console.log('Detected custom OAuth provider with existing parameters');
        console.log('Original auth URL:', config.authUrl);
        
        // Add all required OAuth parameters that don't conflict
        if (!authUrlObj.searchParams.has('client_id')) {
          authUrlObj.searchParams.set('client_id', config.clientId);
        }
        if (!authUrlObj.searchParams.has('redirect_uri')) {
          authUrlObj.searchParams.set('redirect_uri', config.redirectUri);
        }
        if (!authUrlObj.searchParams.has('state')) {
          authUrlObj.searchParams.set('state', session.id);
        }
        if (!authUrlObj.searchParams.has('response_type')) {
          authUrlObj.searchParams.set('response_type', 'code');
        }
        
        authUrl = authUrlObj.toString();
        console.log('Final auth URL for custom provider:', authUrl);
      } else {
        // Standard OAuth2 flow - add all required parameters
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(' '),
          state: session.id,
        });

        authUrl = `${config.authUrl}?${params.toString()}`;
      }
      
      console.log('Starting OAuth flow with session ID:', session.id);
      console.log('Full authorization URL:', authUrl);
      console.log('State parameter being sent:', session.id);
      
      // Validate the final URL before redirecting
      try {
        new URL(authUrl);
      } catch (urlError) {
        throw new Error(`Invalid authorization URL constructed: ${authUrl}`);
      }
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
      return { error: null };
    } catch (error) {
      console.error('Custom OAuth error:', error);
      return { error };
    }
  };

  const handleOAuthCallback = async (code: string, config: CustomOAuthConfig) => {
    try {
      console.log('OAuth callback started with config:', config?.provider || 'unknown');
      
      // Config is already retrieved by the caller, just use it directly
      console.log('Calling custom OAuth exchange edge function...');
      console.log('Code:', code ? 'present' : 'missing');
      console.log('Config:', config);
      
      // Exchange authorization code for tokens via edge function
      const { data, error } = await supabase.functions.invoke('custom-oauth-exchange', {
        body: {
          code,
          config: {
            clientId: config.clientId,
            clientSecret: '', // OAuth provider should handle this differently
            redirectUri: config.redirectUri,
            tokenUrl: config.tokenUrl,
            userInfoUrl: config.userInfoUrl,
          }
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        // Try to get the response body for more details
        if (error.context && error.context.text) {
          try {
            const errorText = await error.context.text();
            console.error('Error response body:', errorText);
          } catch (e) {
            console.error('Could not read error response body');
          }
        }
        throw error;
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        console.error('Error details:', data.details);
        throw new Error(data.error);
      }

      // Sign in user with the received JWT
      const { error: signInError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (signInError) {
        throw signInError;
      }

      // Log successful OAuth sign-in
      await createSecurityAuditLog('oauth_sign_in_success', 'auth', user?.id, {
        provider: config.provider
      });
      await trackUserSession('start');

      return { error: null };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting logout process...');
      
      // Track session end and log sign-out
      await trackUserSession('end');
      await createSecurityAuditLog('sign_out', 'auth', user?.id);
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out (fallback if it fails)
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('Supabase signOut completed');
      } catch (err) {
        console.error('Supabase signOut error (continuing anyway):', err);
        // Continue even if this fails
      }
      
      // Force page reload for a completely clean state
      console.log('Redirecting to auth page...');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during signOut:', error);
      // Fallback: still redirect even if there's an error
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    signInWithCustomOAuth,
    handleOAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};