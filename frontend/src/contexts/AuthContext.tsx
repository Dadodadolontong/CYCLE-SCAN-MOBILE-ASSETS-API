import React, { createContext, useContext } from 'react';

// This context is deprecated. Use FastAPIAuthContext instead.
const AuthContext = createContext(undefined);

export const useAuth = () => {
  throw new Error('useAuth is deprecated. Use useFastAPIAuth instead.');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This provider is deprecated. Use FastAPIAuthProvider instead.
  return <>{children}</>;
};