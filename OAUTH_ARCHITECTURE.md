# OAuth Architecture Documentation

## Overview

The OAuth implementation in this application uses a **backend-centric approach** where all OAuth configuration and token handling is managed by the FastAPI backend, while the frontend only handles the user interface and redirects.

## Architecture

### **Backend-Centric OAuth Flow**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   FastAPI   │    │ OAuth       │    │   Database  │
│             │    │   Backend   │    │ Provider    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. User clicks    │                   │                   │
       │ "Sign in with     │                   │                   │
       │ OAuth"            │                   │                   │
       ├──────────────────►│                   │                   │
       │                   │ 2. Redirect to    │                   │
       │                   │ OAuth provider    │                   │
       │                   ├──────────────────►│                   │
       │                   │                   │ 3. User           │
       │                   │                   │ authenticates     │
       │                   │                   │                   │
       │                   │                   │ 4. Redirect back  │
       │                   │                   │ with auth code    │
       │                   │◄──────────────────┤                   │
       │                   │ 5. Exchange code  │                   │
       │                   │ for tokens        │                   │
       │                   ├──────────────────►│                   │
       │                   │                   │ 6. Return tokens  │
       │                   │◄──────────────────┤                   │
       │                   │ 7. Get user info  │                   │
       │                   │ from provider     │                   │
       │                   ├──────────────────►│                   │
       │                   │                   │ 8. Return user    │
       │                   │                   │ profile           │
       │                   │◄──────────────────┤                   │
       │                   │ 9. Create/update  │                   │
       │                   │ user in database  │                   │
       │                   ├──────────────────►│                   │
       │                   │                   │ 10. Return user   │
       │                   │                   │ data              │
       │                   │◄──────────────────┤                   │
       │ 11. Redirect to   │                   │                   │
       │ frontend with     │                   │                   │
       │ user data         │                   │                   │
       │◄──────────────────┤                   │                   │
       │                   │                   │                   │
```

## Frontend Role

### **What the Frontend Does:**

1. **OAuth Login Button**: Redirects user to FastAPI's `/auth/login` endpoint
2. **OAuth Callback**: Handles the redirect from FastAPI after OAuth completion
3. **User Interface**: Displays login forms and handles user interactions

### **What the Frontend Does NOT Do:**

- ❌ **OAuth Configuration**: No client IDs, redirect URIs, or scopes
- ❌ **Token Exchange**: No direct communication with OAuth providers
- ❌ **User Profile Fetching**: No direct API calls to OAuth providers
- ❌ **Token Storage**: No OAuth token management

## Backend Role

### **What the Backend Does:**

1. **OAuth Configuration**: Manages all OAuth provider settings
2. **Token Exchange**: Handles authorization code to token exchange
3. **User Profile Fetching**: Retrieves user information from OAuth providers
4. **User Management**: Creates/updates users in the database
5. **Session Management**: Creates JWT tokens for frontend authentication

### **Backend OAuth Configuration:**

```python
# backend/config.py
OAUTH_CLIENT_ID: str = os.getenv("OAUTH2_CLIENT_ID", "")
OAUTH_CLIENT_SECRET: str = os.getenv("OAUTH2_CLIENT_SECRET", "")
OAUTH_AUTH_URL: str = os.getenv("OAUTH2_AUTH_URL", "")
OAUTH_TOKEN_URL: str = os.getenv("OAUTH2_TOKEN_URL", "")
OAUTH_USER_INFO_URL: str = os.getenv("OAUTH2_USER_INFO_URL", "")
OAUTH_REDIRECT_URI: str = os.getenv("OAUTH2_REDIRECT_URI", "")
OAUTH_SCOPES: str = os.getenv("OAUTH2_SCOPES", "openid email profile")
```

## Environment Variables

### **Frontend Environment Variables (OAuth-related):**

❌ **NOT NEEDED** - These variables are not used in the frontend:

```bash
# These are NOT used in frontend code
VITE_OAUTH_CLIENT_ID=your_oauth_client_id
VITE_OAUTH_REDIRECT_URI=http://localhost:8080/auth/callback
```

### **Backend Environment Variables (OAuth-related):**

✅ **REQUIRED** - These variables are used in the backend:

```bash
# OAuth Configuration (Backend)
OAUTH2_CLIENT_ID=your_oauth_client_id
OAUTH2_CLIENT_SECRET=your_oauth_client_secret
OAUTH2_AUTH_URL=https://your-oauth-provider.com/oauth/authorize
OAUTH2_TOKEN_URL=https://your-oauth-provider.com/oauth/token
OAUTH2_USER_INFO_URL=https://your-oauth-provider.com/userinfo
OAUTH2_REDIRECT_URI=http://localhost:8002/auth/callback
OAUTH2_SCOPES=openid email profile
OAUTH2_API_KEY=your_api_key
```

## Code Implementation

### **Frontend OAuth Login (Auth.tsx):**

```typescript
const handleFastAPIOAuthLogin = () => {
  window.location.href = `${API_BASE_URL.replace(/\/$/, '')}/auth/login`;
};
```

**Key Points:**
- No OAuth configuration needed
- Simply redirects to backend endpoint
- Backend handles all OAuth setup

### **Frontend OAuth Callback (OAuthCallback.tsx):**

```typescript
const resp = await fastapiClient.get(`/auth/callback?code=${encodeURIComponent(code)}`);
```

**Key Points:**
- Receives authorization code from backend
- Calls backend callback endpoint
- Backend handles token exchange and user creation

### **Backend OAuth Login (routes_auth.py):**

```python
@router.get("/login")
def login():
    # Construct OAuth authorization URL with all necessary parameters
    params = {
        "client_id": config.OAUTH_CLIENT_ID,
        "redirect_uri": config.OAUTH_REDIRECT_URI,
        "scope": config.OAUTH_SCOPES,
        "response_type": "code",
        "state": state,
        "api-key": config.OAUTH_API_KEY
    }
    # Redirect to OAuth provider
```

### **Backend OAuth Callback (routes_auth.py):**

```python
@router.get("/callback")
def callback(code: str = Query(...), state: str = Query(None)):
    # Exchange authorization code for tokens
    # Fetch user profile from OAuth provider
    # Create/update user in database
    # Return user data to frontend
```

## Benefits of This Architecture

### **Security Benefits:**

1. **Client Secret Protection**: OAuth client secrets stay on the backend
2. **Token Security**: OAuth tokens never exposed to frontend
3. **Centralized Control**: All OAuth logic in one place
4. **Reduced Attack Surface**: Frontend has minimal OAuth exposure

### **Maintenance Benefits:**

1. **Single Configuration**: OAuth settings only in backend
2. **Easier Updates**: OAuth changes only require backend updates
3. **Consistent Behavior**: All OAuth flows go through same backend logic
4. **Better Testing**: OAuth logic can be tested independently

### **Flexibility Benefits:**

1. **Multiple Frontends**: Same backend can serve multiple frontend applications
2. **API Access**: Other applications can use the same OAuth endpoints
3. **Custom Logic**: Easy to add custom user creation/update logic
4. **Audit Trail**: All OAuth activities logged on backend

## Migration from Frontend OAuth

If you're migrating from a frontend-centric OAuth implementation:

### **Remove from Frontend:**
- ❌ OAuth client configuration
- ❌ Token exchange logic
- ❌ User profile fetching
- ❌ OAuth environment variables

### **Add to Backend:**
- ✅ OAuth provider configuration
- ✅ Token exchange endpoints
- ✅ User profile handling
- ✅ OAuth environment variables

### **Update Frontend:**
- ✅ Simple redirect to backend OAuth endpoint
- ✅ Handle callback from backend
- ✅ Use backend user data

## Troubleshooting

### **Common Issues:**

1. **"OAuth client not found"**
   - Check backend `OAUTH2_CLIENT_ID` configuration
   - Verify OAuth provider settings

2. **"Invalid redirect URI"**
   - Check backend `OAUTH2_REDIRECT_URI` matches OAuth provider settings
   - Ensure URI is registered with OAuth provider

3. **"Authorization code expired"**
   - Check backend token exchange timing
   - Verify OAuth provider token endpoint

4. **"User not created"**
   - Check backend user creation logic
   - Verify database connection and permissions

### **Debug Steps:**

1. **Check Backend Logs**: All OAuth activity is logged
2. **Verify Environment Variables**: Ensure all OAuth variables are set
3. **Test OAuth Provider**: Verify provider endpoints are accessible
4. **Check Database**: Ensure user creation/update is working

## Conclusion

This backend-centric OAuth architecture provides better security, maintainability, and flexibility compared to frontend OAuth implementations. The frontend remains simple and focused on user interface, while the backend handles all complex OAuth logic and security concerns. 