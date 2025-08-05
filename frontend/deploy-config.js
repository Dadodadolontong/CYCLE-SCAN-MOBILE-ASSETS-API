#!/usr/bin/env node

/**
 * Deployment Configuration Script
 * 
 * This script helps configure the frontend for different deployment scenarios.
 * 
 * Usage:
 *   node deploy-config.js [scenario]
 * 
 * Scenarios:
 *   - root: Deploy to root path (/)
 *   - subdir: Deploy to subdirectory (/assetmgmt/)
 *   - custom: Use custom path from VITE_BASE_PATH env var
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenarios = {
  root: {
    VITE_BASE_PATH: '/',
    VITE_APP_TITLE: 'Asset Cycle Count',
    VITE_APP_SHORT_NAME: 'Cycle Count',
    VITE_APP_DESCRIPTION: 'Professional PWA for warehouse asset management with barcode scanning',
    VITE_API_URL: 'http://localhost:8002',
    VITE_FRONTEND_URL: 'http://localhost:8080',
    VITE_NODE_ENV: 'development',
    VITE_ENABLE_DEBUG: 'true',
    VITE_ENABLE_ANALYTICS: 'false'
  },
  custom: {
    // Uses environment variables
    VITE_BASE_PATH: process.env.VITE_BASE_PATH || '/',
    VITE_APP_TITLE: process.env.VITE_APP_TITLE || 'Asset Cycle Count',
    VITE_APP_SHORT_NAME: process.env.VITE_APP_SHORT_NAME || 'Cycle Count',
    VITE_APP_DESCRIPTION: process.env.VITE_APP_DESCRIPTION || 'Professional PWA for warehouse asset management with barcode scanning',
    VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:8002',
    VITE_FRONTEND_URL: process.env.VITE_FRONTEND_URL || 'http://localhost:8080',
    VITE_NODE_ENV: process.env.VITE_NODE_ENV || 'development',
    VITE_ENABLE_DEBUG: process.env.VITE_ENABLE_DEBUG || 'true',
    VITE_ENABLE_ANALYTICS: process.env.VITE_ENABLE_ANALYTICS || 'false'
  }
};

function generateEnvFile(config, outputPath = '.env') {
  const envContent = `# Deployment Configuration
VITE_BASE_PATH=${config.VITE_BASE_PATH}
VITE_APP_TITLE=${config.VITE_APP_TITLE}
VITE_APP_SHORT_NAME=${config.VITE_APP_SHORT_NAME}
VITE_APP_DESCRIPTION=${config.VITE_APP_DESCRIPTION}

# API Configuration (REQUIRED)
VITE_API_URL=${config.VITE_API_URL}
VITE_API_TIMEOUT=30000

# Frontend Configuration (REQUIRED)
VITE_FRONTEND_URL=${config.VITE_FRONTEND_URL}
VITE_FRONTEND_PORT=8080
VITE_FRONTEND_HOST=localhost

# Environment
VITE_NODE_ENV=${config.VITE_NODE_ENV}

# Feature Flags
VITE_ENABLE_DEBUG=${config.VITE_ENABLE_DEBUG}
VITE_ENABLE_ANALYTICS=${config.VITE_ENABLE_ANALYTICS}
`;

  fs.writeFileSync(outputPath, envContent);
  console.log(`✅ Generated ${outputPath} with configuration:`);
  console.log(`   Base Path: ${config.VITE_BASE_PATH}`);
  console.log(`   App Title: ${config.VITE_APP_TITLE}`);
  console.log(`   Short Name: ${config.VITE_APP_SHORT_NAME}`);
}

function main() {
  const scenario = process.argv[2] || 'root';
  
  if (!scenarios[scenario]) {
    console.error(`❌ Unknown scenario: ${scenario}`);
    console.log('Available scenarios:');
    Object.keys(scenarios).forEach(s => console.log(`  - ${s}`));
    process.exit(1);
  }

  const config = scenarios[scenario];
  
  console.log(`🚀 Configuring deployment for scenario: ${scenario}`);
  console.log('');
  
  generateEnvFile(config);
  
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Review the generated .env file');
  console.log('2. Update API URLs and other settings as needed');
  console.log('3. Run: npm run build');
  console.log('4. Deploy the dist/ folder to your web server');
  
  if (scenario === 'root') {
    console.log('');
    console.log('⚠️  Note: Root deployment requires proper server configuration');
    console.log('   - Configure your web server to serve the app from root');
    console.log('   - Ensure all routes fall back to index.html for SPA routing');
  } else if (scenario === 'custom') {
    console.log('');
    console.log('⚠️  Note: Subdirectory deployment requires:');
    console.log(`   - Configure your web server to serve the app from ${config.VITE_BASE_PATH}`);
    console.log('   - Update your reverse proxy configuration');
    console.log('   - Ensure the base path is correctly set in your deployment');
  }
}

// Run the script
main(); 