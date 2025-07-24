# Configuration System

This project uses environment variables for configuration management across both frontend and backend components. **All required environment variables must be set or the application will fail to start.**

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```env
# API Configuration (REQUIRED)
VITE_API_URL=http://localhost:8002
VITE_API_TIMEOUT=30000

# Frontend Configuration (REQUIRED)
VITE_FRONTEND_URL=http://localhost:8080
VITE_FRONTEND_PORT=8080

# OAuth Configuration
VITE_OAUTH_CLIENT_ID=your_oauth_client_id
VITE_OAUTH_REDIRECT_URI=http://localhost:8080/auth/callback

# Environment
VITE_NODE_ENV=development

# Feature Flags
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
```

### Usage in Frontend Code

```typescript
import { config, getApiUrl, getFrontendUrl } from '@/config';

// Access configuration values
const apiUrl = config.api.url;
const frontendUrl = config.frontend.url;

// Use helper functions
const fullApiUrl = getApiUrl('/auth/login');
const fullFrontendUrl = getFrontendUrl('/dashboard');
```

## Backend Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration (REQUIRED)
# Either set DATABASE_URL or all individual components
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/asset
# DATABASE_HOST=localhost
# DATABASE_PORT=3306
# DATABASE_NAME=asset
# DATABASE_USER=username
# DATABASE_PASSWORD=password

# Server Configuration
HOST=0.0.0.0
PORT=8002
DEBUG=true

# CORS Configuration (REQUIRED)
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# OAuth Configuration
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_AUTH_URL=https://your-oauth-provider.com/oauth/authorize
OAUTH_TOKEN_URL=https://your-oauth-provider.com/oauth/token
OAUTH_USER_INFO_URL=https://your-oauth-provider.com/userinfo

# Security (REQUIRED)
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Swagger UI Configuration (REQUIRED)
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=admin123

# Testing Configuration (REQUIRED)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Environment
NODE_ENV=development
```

### Usage in Backend Code

```python
from config import config

# Access configuration values
database_url = config.get_database_url()
allowed_origins = config.ALLOWED_ORIGINS
secret_key = config.SECRET_KEY

# Check environment
if config.is_development():
    print("Running in development mode")
```

## Setup Instructions

1. **Copy example files:**
   ```bash
   # Frontend
   cp frontend/env.example frontend/.env
   
   # Backend
   cp backend/env.example backend/.env
   ```

2. **Update the `.env` files** with your actual values

3. **Restart your development servers** after making changes

## Required vs Optional Variables

### Frontend Required Variables
- `VITE_API_URL` - Backend API URL
- `VITE_FRONTEND_URL` - Frontend application URL
- `VITE_FRONTEND_PORT` - Frontend development server port

### Backend Required Variables
- Database configuration (either `DATABASE_URL` or all individual components)
- `SECRET_KEY` - JWT signing key
- `ALLOWED_ORIGINS` - CORS allowed origins
- `SWAGGER_USERNAME` - Swagger UI username
- `SWAGGER_PASSWORD` - Swagger UI password
- `ADMIN_EMAIL` - Admin user email for testing
- `ADMIN_PASSWORD` - Admin user password for testing

## Environment-Specific Configurations

### Development
- Use localhost URLs
- Enable debug mode
- Use development database

### Production
- Use production URLs
- Disable debug mode
- Use production database
- Set proper CORS origins
- Use strong secret keys
- Change default Swagger credentials

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secret keys in production
- Regularly rotate OAuth client secrets
- Use HTTPS in production environments
- Change default Swagger UI credentials in production
- Use strong passwords for admin accounts

## Troubleshooting

### Common Issues

1. **Missing required environment variables:**
   - The application will fail to start with clear error messages
   - Check the error message to identify which variables are missing
   - Ensure all required variables are set in your `.env` files

2. **Environment variables not loading:**
   - Ensure `.env` files are in the correct directories
   - Restart development servers after changes
   - Check file permissions

3. **CORS errors:**
   - Verify `ALLOWED_ORIGINS` includes your frontend URL
   - Check for trailing slashes in URLs

4. **Database connection issues:**
   - Verify database credentials in `.env`
   - Ensure database server is running
   - Check network connectivity

5. **Swagger UI access issues:**
   - Verify `SWAGGER_USERNAME` and `SWAGGER_PASSWORD` are set correctly
   - Check that the credentials match what you're entering in the browser 