import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get port with fallback for development
  const port = env.VITE_FRONTEND_PORT || (mode === 'development' ? '8080' : '3000');
  const host = env.VITE_FRONTEND_HOST || (mode === 'development' ? 'dev-frontend.local' : 'localhost');

  // Get allowed hosts from env (comma-separated)
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
    : undefined;
  
  // Validate required environment variables only in production
  if (mode === 'production') {
    const requiredEnvVars = ['VITE_FRONTEND_PORT'];
    for (const envVar of requiredEnvVars) {
      if (!env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }
  
  return {
    base: '/assetmgmt/', // <--- This is critical for subdirectory deployment
    server: {
      host: "::",
      port: parseInt(port),
      ...(allowedHosts ? { allowedHosts } : {}),
      strictPort: true,
      https: false,
      hmr: {
        host: host,
        port: 8001,
      },
    },
    plugins: [
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
