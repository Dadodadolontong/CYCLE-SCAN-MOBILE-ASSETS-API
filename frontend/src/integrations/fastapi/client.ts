import { config } from '@/config';

// FastAPI client configuration
const API_BASE_URL = config.api.url;

export interface LoginRequest {
  username: string; // FastAPI OAuth2 expects 'username' field
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  roles: string[];
}

export interface ApiError {
  detail: string;
}

export interface ERPSyncResponse {
  success: boolean;
  message: string;
  assets_processed: number;
  assets_created: number;
  assets_updated: number;
  locations_synced: number;
  errors: string[];
  details?: any;
}

export interface ERPTaskResponse {
  success: boolean;
  message: string;
  task_id: string;
  status: string;
  force_full_sync?: boolean;
}

export interface ERPTaskStatus {
  task_id: string;
  status: string;
  result?: any;
  error?: string;
  progress?: {
    message?: string;
    progress?: string;
    assets_processed?: number;
    assets_created?: number;
    assets_updated?: number;
    total_records?: number;
    locations_synced?: number;
  };
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string;
  assets_synced: number;
  errors_count: number;
  initiated_by: string;
  error_details?: string | any; // Allow both string and object for flexibility
}

export interface SyncHistoryResponse {
  sync_logs: SyncLog[];
  total: number;
}

export interface ERPSyncConfig {
  last_asset_sync: string;
  last_location_sync: string;
  total_assets_synced: number;
  total_locations_synced: number;
}

export interface OracleConnectionTest {
  success: boolean;
  message: string;
  details?: any;
}

class FastAPIClient {
  private baseURL: string;
  private token: string | null = null;
  private onSessionTimeout: (() => void) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  // Set session timeout callback
  setSessionTimeoutCallback(callback: () => void) {
    this.onSessionTimeout = callback;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
      },
    };

    // Only set Content-Type for JSON requests if not already set
    if (!(options.body instanceof FormData) && !options.headers?.['Content-Type']) {
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }

    if (this.token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle 401 Unauthorized (session timeout)
        if (response.status === 401) {
          this.clearToken();
          if (this.onSessionTimeout) {
            this.onSessionTimeout();
          }
          throw new Error('Session expired. Please log in again.');
        }
        
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // OAuth2PasswordRequestForm expects URL-encoded form data, not FormData
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const data: LoginResponse = await this.request<LoginResponse>('/auth/token', {
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: RegisterRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me');
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Generic API methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers: Record<string, string> = {};
    
    // Don't set Content-Type for FormData (browser will set it automatically with boundary)
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      headers,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ERP Integration methods
  async syncAssetsFromOracle(forceFullSync: boolean = false): Promise<ERPTaskResponse> {
    return this.post<ERPTaskResponse>(`/erp/sync-assets?force_full_sync=${forceFullSync}`);
  }

  async syncLocationsFromOracle(): Promise<ERPTaskResponse> {
    return this.post<ERPTaskResponse>('/erp/sync-locations');
  }

  async getTaskStatus(taskId: string): Promise<ERPTaskStatus> {
    return this.get<ERPTaskStatus>(`/erp/task-status/${taskId}`);
  }

  async getSyncHistory(limit: number = 50): Promise<SyncHistoryResponse> {
    return this.get<SyncHistoryResponse>(`/erp/sync-history?limit=${limit}`);
  }

  async testOracleConnection(): Promise<OracleConnectionTest> {
    return this.get<OracleConnectionTest>('/erp/test-connection');
  }

  async getSyncConfig(): Promise<ERPSyncConfig> {
    return this.get<ERPSyncConfig>('/erp/sync-config');
  }

  async getLocationsMapping(): Promise<any> {
    return this.get('/erp/locations-mapping');
  }

  // Test method to simulate session timeout (for development/testing)
  async testSessionTimeout(): Promise<void> {
    // This endpoint should return 401 to test session timeout handling
    return this.get('/auth/test-timeout');
  }
}

// Lazy initialization of client instance
let _fastapiClient: FastAPIClient | null = null;
export const fastapiClient = (() => {
  if (!_fastapiClient) {
    _fastapiClient = new FastAPIClient(API_BASE_URL);
  }
  return _fastapiClient;
})();