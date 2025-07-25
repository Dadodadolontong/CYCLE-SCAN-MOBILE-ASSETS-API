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

class FastAPIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log("🔍 [FastAPIClient] Making request:", {
      method: options.method || 'GET',
      url,
      baseURL: this.baseURL,
      endpoint,
      hasToken: !!this.token
    });
    
    const headers: Record<string, string> = {};

    // Add default Content-Type if not provided and not FormData
    if (!options.headers && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Merge with provided headers
    const finalHeaders = {
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    };

    const config: RequestInit = {
      ...options,
      headers: finalHeaders,
    };

    try {
      console.log("🔍 [FastAPIClient] Sending request to:", url);
      const response = await fetch(url, config);
      console.log("🔍 [FastAPIClient] Response received:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      
      if (response.status === 401) {
        console.error("🔍 [FastAPIClient] 401 Unauthorized - redirecting to login");
        // Force logout on unauthorized
        this.clearToken();
        window.location.href = '/auth';
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        console.error("🔍 [FastAPIClient] Request failed:", {
          status: response.status,
          statusText: response.statusText
        });
        const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      // Handle empty responses
      if (response.status === 204) {
        console.log("🔍 [FastAPIClient] Empty response (204)");
        return {} as T;
      }

      const data = await response.json();
      console.log("🔍 [FastAPIClient] Request successful:", {
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : 'N/A'
      });
      return data;
    } catch (error) {
      console.error("🔍 [FastAPIClient] Request error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const data: LoginResponse = await this.request<LoginResponse>('/auth/token', {
      method: 'POST',
      body: formData,
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
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export the client instance
let _fastapiClient: FastAPIClient | null = null;

export const fastapiClient = (() => {
  if (!_fastapiClient) {
    _fastapiClient = new FastAPIClient(config.api.url);
  }
  return _fastapiClient;
})();