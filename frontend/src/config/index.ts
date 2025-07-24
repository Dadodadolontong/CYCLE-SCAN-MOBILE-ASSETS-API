// Configuration interface
interface Config {
  api: {
    url: string;
    timeout: number;
  };
  frontend: {
    url: string;
    port: number;
  };
  oauth: {
    clientId: string;
    redirectUri: string;
  };
  environment: string;
  features: {
    debug: boolean;
    analytics: boolean;
  };
}

// Check if we're in development mode
const isDevMode = import.meta.env.DEV;

// Validate required environment variables only in production
if (!isDevMode) {
  const requiredEnvVars = [
    'VITE_API_URL',
    'VITE_FRONTEND_URL',
    'VITE_FRONTEND_PORT'
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

// Configuration object with fallbacks for development
export const config: Config = {
  api: {
    url: import.meta.env.VITE_API_URL || (isDevMode ? 'http://localhost:8002' : ''),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  },
  frontend: {
    url: import.meta.env.VITE_FRONTEND_URL || (isDevMode ? 'http://localhost:8080' : ''),
    port: parseInt(import.meta.env.VITE_FRONTEND_PORT || (isDevMode ? '8080' : '3000')),
  },
  oauth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || '',
  },
  environment: import.meta.env.VITE_NODE_ENV || 'development',
  features: {
    debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
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

export const isDevelopment = (): boolean => config.environment === 'development';
export const isProduction = (): boolean => config.environment === 'production';

export default config; 