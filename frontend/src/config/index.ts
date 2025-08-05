// Configuration interface
interface Config {
  api: {
    url: string;
    timeout: number;
  };
  frontend: {
    url: string;
    port: number;
    host: string;
    allowedHosts?: string[];
  };
  auth: {
    tokenKey: string;
    sessionKey: string;
  };
  features: {
    enableDebugMode: boolean;
    enableAnalytics: boolean;
  };
}

const isDevMode = import.meta.env.DEV;

// Validate required environment variables in production
if (!isDevMode) {
  const requiredEnvVars = [
    'VITE_API_URL',
    'VITE_FRONTEND_URL',
    'VITE_FRONTEND_PORT'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export const config: Config = {
  api: {
    url: import.meta.env.VITE_API_URL || (isDevMode ? 'http://localhost:8002' : ''),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  },
  frontend: {
    url: import.meta.env.VITE_FRONTEND_URL || (isDevMode ? 'http://localhost:8080' : ''),
    port: parseInt(import.meta.env.VITE_FRONTEND_PORT || (isDevMode ? '8080' : '3000')),
    host: import.meta.env.VITE_FRONTEND_HOST || 'localhost',
    allowedHosts: import.meta.env.VITE_ALLOWED_HOSTS ? 
      import.meta.env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean) : 
      undefined,
  },
  auth: {
    tokenKey: import.meta.env.VITE_AUTH_TOKEN_KEY || 'fastapi_token',
    sessionKey: import.meta.env.VITE_AUTH_SESSION_KEY || 'fastapi_session',
  },
  features: {
    enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  },
};

// Helper functions
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = config.api.url.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

export const getFrontendUrl = (path: string = ''): string => {
  const baseUrl = config.frontend.url.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

export const isDevelopment = (): boolean => import.meta.env.DEV;
export const isProduction = (): boolean => !import.meta.env.DEV;

export default config; 