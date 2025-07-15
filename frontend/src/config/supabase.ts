// Supabase Configuration
// Change USE_LOCALHOST to true when you want to use local Supabase
const USE_LOCALHOST = false;

// Production Supabase configuration
const PRODUCTION_CONFIG = {
  url: "https://bkrxxvnjivvzwslvvwun.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcnh4dm5qaXZ2endzbHZ2d3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NjU5NzgsImV4cCI6MjA2NzA0MTk3OH0.oTKoJeex5kmCju4kMakepvAZ1m2MqinV2UCqIeOWj6k"
};

// Localhost Supabase configuration (update these when running supabase locally)
const LOCALHOST_CONFIG = {
  url: "http://localhost:54321",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1MTkyODI0LCJleHAiOjE5NjA3Njg4MjR9.M9jrxyvPLkUxWgOYSf5dNdJ8v_eWrqwgWMxkDuNTOQA"
};

// Auto-detect localhost in development
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Export the configuration based on settings
export const getSupabaseConfig = () => {
  if (USE_LOCALHOST || (isLocalhost && USE_LOCALHOST !== false)) {
    console.log('🔧 Using Localhost Supabase configuration');
    return LOCALHOST_CONFIG;
  }
  
  console.log('🌐 Using Production Supabase configuration');
  return PRODUCTION_CONFIG;
};

export const supabaseConfig = getSupabaseConfig();