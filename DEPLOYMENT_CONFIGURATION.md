# Configurable Deployment Guide

## Overview

The frontend application has been updated to support configurable deployment paths, removing hardcoded references to `/assetmgmt` and making it easy to deploy to different environments and paths.

## Features

- **Configurable Base Path**: Deploy to root (`/`), subdirectory (`/assetmgmt/`), or custom path
- **Dynamic App Metadata**: Configurable app title, description, and short name
- **Environment-Based Configuration**: All settings controlled via environment variables
- **Template Processing**: Automatic generation of manifest.json and index.html at build time
- **Deployment Scripts**: Easy-to-use npm scripts for different deployment scenarios

## Environment Variables

### Required for Deployment

```bash
# Deployment Configuration
VITE_BASE_PATH=/assetmgmt          # Base path for the application
VITE_APP_TITLE=Asset Cycle Count   # Application title
VITE_APP_SHORT_NAME=Cycle Count    # Short name for PWA
VITE_APP_DESCRIPTION=Professional PWA for warehouse asset management with barcode scanning
```

### Complete Environment Configuration

```bash
# Deployment Configuration
VITE_BASE_PATH=/assetmgmt
VITE_APP_TITLE=Asset Cycle Count
VITE_APP_SHORT_NAME=Cycle Count
VITE_APP_DESCRIPTION=Professional PWA for warehouse asset management with barcode scanning

# API Configuration
VITE_API_URL=http://localhost:8002
VITE_API_TIMEOUT=30000

# Frontend Configuration
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

## Deployment Scenarios

### 1. Root Deployment (`/`)

Deploy the application to the root path of your domain.

```bash
# Generate configuration
npm run build:root

# Or manually set environment
VITE_BASE_PATH=/ npm run build
```

**Server Configuration:**
- Serve the `dist/` folder from your web root
- Configure fallback to `index.html` for SPA routing
- Example Nginx configuration:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

### 2. Subdirectory Deployment (`/assetmgmt/`)

Deploy the application to a subdirectory (default).

```bash
# Generate configuration
npm run build:subdir

# Or manually set environment
VITE_BASE_PATH=/assetmgmt/ npm run build
```

**Server Configuration:**
- Serve the `dist/` folder from `/assetmgmt/` path
- Example Nginx configuration:
  ```nginx
  location /assetmgmt/ {
      alias /path/to/your/dist/;
      try_files $uri $uri/ /assetmgmt/index.html;
  }
  ```

### 3. Custom Path Deployment

Deploy to any custom path.

```bash
# Set custom path
VITE_BASE_PATH=/my-app/ npm run build:custom

# Or manually set environment
VITE_BASE_PATH=/my-app/ npm run build
```

## Quick Start

### Using Deployment Scripts

1. **For Subdirectory Deployment (Recommended):**
   ```bash
   cd frontend
   npm run build:subdir
   ```

2. **For Root Deployment:**
   ```bash
   cd frontend
   npm run build:root
   ```

3. **For Custom Path:**
   ```bash
   cd frontend
   VITE_BASE_PATH=/my-custom-path/ npm run build:custom
   ```

### Manual Configuration

1. **Create Environment File:**
   ```bash
   cd frontend
   cp env.example .env
   ```

2. **Edit Configuration:**
   ```bash
   # Edit .env file
   VITE_BASE_PATH=/your-path/
   VITE_APP_TITLE=Your App Title
   VITE_APP_SHORT_NAME=Your App
   VITE_APP_DESCRIPTION=Your app description
   ```

3. **Build Application:**
   ```bash
   npm run build
   ```

## Files Modified for Configurability

### 1. `vite.config.ts`
- Uses `VITE_BASE_PATH` environment variable for base path
- Includes template processor plugin
- Validates required environment variables in production

### 2. `src/App.tsx`
- Dynamic router basename from environment variable
- Fallback to `/assetmgmt` if not configured

### 3. `index.template.html`
- Template with environment variable placeholders
- Processed at build time to generate `index.html`

### 4. `public/manifest.template.json`
- Template for PWA manifest
- Dynamic paths and metadata from environment variables

### 5. `deploy-config.js`
- Deployment configuration script
- Generates environment files for different scenarios

## Build Process

The build process now includes:

1. **Template Processing**: 
   - Processes `index.template.html` → `index.html`
   - Processes `public/manifest.template.json` → `public/manifest.json`

2. **Environment Validation**:
   - Validates required environment variables in production
   - Provides fallbacks for development

3. **Dynamic Configuration**:
   - All hardcoded paths replaced with environment variables
   - App metadata configurable via environment

## Server Configuration Examples

### Nginx Configuration

**Root Deployment:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Subdirectory Deployment:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;

    location /assetmgmt/ {
        alias /var/www/html/assetmgmt/;
        try_files $uri $uri/ /assetmgmt/index.html;
    }
}
```

### Apache Configuration

**Root Deployment:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

**Subdirectory Deployment:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html
    
    Alias /assetmgmt /var/www/html/assetmgmt
    
    <Directory /var/www/html/assetmgmt>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /assetmgmt/index.html [L]
    </Directory>
</VirtualHost>
```

## Docker Deployment

### Dockerfile Example

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:subdir

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/assetmgmt
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration for Docker

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;

        location /assetmgmt/ {
            alias /usr/share/nginx/html/assetmgmt/;
            try_files $uri $uri/ /assetmgmt/index.html;
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **404 Errors on Route Refresh**
   - Ensure server is configured to fallback to `index.html`
   - Check that `VITE_BASE_PATH` matches server configuration

2. **Assets Not Loading**
   - Verify `VITE_BASE_PATH` is correctly set
   - Check that manifest.json is being generated correctly

3. **Build Errors**
   - Ensure all required environment variables are set
   - Check that template files exist

### Debug Steps

1. **Check Generated Files:**
   ```bash
   # After build, check generated files
   cat dist/index.html
   cat dist/manifest.json
   ```

2. **Verify Environment Variables:**
   ```bash
   # Check environment variables
   echo $VITE_BASE_PATH
   echo $VITE_APP_TITLE
   ```

3. **Test Build Process:**
   ```bash
   # Run deployment config script
   npm run deploy:config subdir
   ```

## Migration from Hardcoded Configuration

If you're migrating from the previous hardcoded configuration:

1. **Backup Current Configuration:**
   ```bash
   cp .env .env.backup
   ```

2. **Generate New Configuration:**
   ```bash
   npm run deploy:config subdir
   ```

3. **Update Environment Variables:**
   - Review generated `.env` file
   - Update API URLs and other settings as needed

4. **Test Build:**
   ```bash
   npm run build
   ```

5. **Deploy and Test:**
   - Deploy the new build
   - Test all functionality
   - Verify routing works correctly

## Best Practices

1. **Environment-Specific Configuration:**
   - Use different `.env` files for different environments
   - Never commit `.env` files to version control

2. **Base Path Consistency:**
   - Ensure `VITE_BASE_PATH` matches server configuration
   - Always include leading and trailing slashes

3. **Testing:**
   - Test routing after deployment
   - Verify PWA functionality
   - Check asset loading

4. **Documentation:**
   - Document your deployment configuration
   - Keep server configuration examples handy

## Support

For issues or questions about the configurable deployment system:

1. Check the troubleshooting section above
2. Verify environment variable configuration
3. Test with the deployment scripts
4. Review server configuration examples 