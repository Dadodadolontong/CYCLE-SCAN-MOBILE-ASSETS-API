import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Plugin to process template files
function templateProcessor() {
  return {
    name: 'template-processor',
    buildStart() {
      const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
      
      // Process manifest template
      if (fs.existsSync('public/manifest.template.json')) {
        const manifestTemplate = fs.readFileSync('public/manifest.template.json', 'utf-8');
        
        const processedManifest = manifestTemplate
          .replace(/<%- VITE_APP_TITLE \|\| '([^']+)' %>/g, env.VITE_APP_TITLE || '$1')
          .replace(/<%- VITE_APP_SHORT_NAME \|\| '([^']+)' %>/g, env.VITE_APP_SHORT_NAME || '$1')
          .replace(/<%- VITE_APP_DESCRIPTION \|\| '([^']+)' %>/g, env.VITE_APP_DESCRIPTION || '$1')
          .replace(/<%- VITE_BASE_PATH \|\| '([^']+)' %>/g, env.VITE_BASE_PATH || '$1');
        
        fs.writeFileSync('public/manifest.json', processedManifest);
      }
      
      // Process index.html template if it exists
      if (fs.existsSync('index.template.html')) {
        const indexTemplate = fs.readFileSync('index.template.html', 'utf-8');
        
        const processedIndex = indexTemplate
          .replace(/<%- VITE_APP_TITLE \|\| '([^']+)' %>/g, env.VITE_APP_TITLE || '$1')
          .replace(/<%- VITE_APP_SHORT_NAME \|\| '([^']+)' %>/g, env.VITE_APP_SHORT_NAME || '$1')
          .replace(/<%- VITE_APP_DESCRIPTION \|\| '([^']+)' %>/g, env.VITE_APP_DESCRIPTION || '$1')
          .replace(/<%- VITE_BASE_PATH \|\| '([^']+)' %>/g, env.VITE_BASE_PATH || '$1');
        
        fs.writeFileSync('index.html', processedIndex);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get port with fallback for development
  const port = env.VITE_FRONTEND_PORT || (mode === 'development' ? '8080' : '3000');
  const host = env.VITE_FRONTEND_HOST || (mode === 'development' ? 'dev-frontend.local' : 'localhost');

  // Get base path from environment with fallback
  const basePath = env.VITE_BASE_PATH || '/';

  // Get allowed hosts from env (comma-separated)
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
    : undefined;
  
  // Validate required environment variables only in production
  if (mode === 'production') {
    const requiredEnvVars = ['VITE_FRONTEND_PORT', 'VITE_BASE_PATH'];
    for (const envVar of requiredEnvVars) {
      if (!env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }
  
  return {
    base: basePath, // Use environment variable for configurable deployment
    server: {
      host: "::",
      port: parseInt(port),
      ...(allowedHosts ? { allowedHosts } : {}),
      strictPort: true,
      hmr: {
        host: host,
        port: 8001,
      },
    },
    plugins: [
      templateProcessor(),
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Expose env variables to the client
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});
