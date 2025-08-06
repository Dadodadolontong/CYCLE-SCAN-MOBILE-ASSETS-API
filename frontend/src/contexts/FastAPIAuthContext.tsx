import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fastapiClient, UserResponse, LoginRequest, RegisterRequest } from '@/integrations/fastapi/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  setUser: (user: UserResponse | null) => void;
  handleSessionTimeout: () => void;
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
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSessionTimeout = useCallback(() => {
    setUser(null);
    // Show session expired notification
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    });
    // Only redirect if not already on auth page
    if (location.pathname !== '/auth') {
      navigate('/auth', { replace: true });
    }
  }, [navigate, location.pathname, toast]);

  useEffect(() => {
    // Check for token in URL
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      fastapiClient.setToken(token);
      fastapiClient.getCurrentUser().then(setUser);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  useEffect(() => {
    // Set up session timeout handler
    fastapiClient.setSessionTimeoutCallback(handleSessionTimeout);

    // Check for existing authentication on app load
    const checkAuth = async () => {
      try {
        if (fastapiClient.isAuthenticated()) {
          const userData = await fastapiClient.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid token
        fastapiClient.clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [handleSessionTimeout]);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const credentials: LoginRequest = {
        username: email, // FastAPI OAuth2 expects 'username' field
        password,
      };

      await fastapiClient.login(credentials);
      const userData = await fastapiClient.getCurrentUser();
      setUser(userData);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    try {
      const userData: RegisterRequest = {
        email,
        password,
      };

      const newUser = await fastapiClient.register(userData);
      
      // After successful registration, automatically sign in
      await signInWithPassword(email, password);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      fastapiClient.clearToken();
      setUser(null);
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    signInWithPassword,
    signUpWithPassword,
    setUser,
    handleSessionTimeout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 