import React, { createContext, useContext, useEffect, useState } from 'react';
import { fastapiClient, UserResponse, LoginRequest, RegisterRequest } from '@/integrations/fastapi/client';
import { useLocation } from 'react-router-dom';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: any }>;
  setUser: (user: UserResponse | null) => void;
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
  }, []);

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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 