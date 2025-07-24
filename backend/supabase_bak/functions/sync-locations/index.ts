import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SystemSetting {
  key: string;
  value: string;
}

interface ERPLocation {
  id: string;
  name: string;
  description?: string;
}

async function getSystemSetting(supabase: any, key: string): Promise<string> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    throw new Error(`System setting '${key}' is not configured. Please set up this parameter in system settings.`);
  }

  if (!data.value || data.value.trim() === '') {
    throw new Error(`System setting '${key}' is empty. Please configure this parameter with a valid value.`);
  }

  return data.value;
}

async function fetchERPLocations(apiUrl: string, apiKey: string): Promise<ERPLocation[]> {
  console.log('Fetching locations from ERP system...');
  
  const response = await fetch(`${apiUrl}/locations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ERP API request failed: ${response.status} ${response.statusText}`);
  }

  const locations = await response.json();
  
  if (!Array.isArray(locations)) {
    throw new Error('ERP API returned invalid data format. Expected array of locations.');
  }

  return locations;
}

async function syncLocations(supabase: any, erpLocations: ERPLocation[]) {
  console.log(`Syncing ${erpLocations.length} locations...`);
  
  for (const erpLocation of erpLocations) {
    // Check if location exists
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('id, name, description')
      .eq('erp_location_id', erpLocation.id)
      .single();

    if (existingLocation) {
      // Update existing location if data has changed
      if (existingLocation.name !== erpLocation.name || 
          existingLocation.description !== erpLocation.description) {
        
        const { error } = await supabase
          .from('locations')
          .update({
            name: erpLocation.name,
            description: erpLocation.description || null,
            updated_at: new Date().toISOString(),
            last_sync_date: new Date().toISOString(),
          })
          .eq('erp_location_id', erpLocation.id);

        if (error) {
          console.error(`Failed to update location ${erpLocation.id}:`, error);
          throw new Error(`Failed to update location ${erpLocation.id}: ${error.message}`);
        }
        
        console.log(`Updated location: ${erpLocation.name}`);
      } else {
        // Just update sync date
        await supabase
          .from('locations')
          .update({ last_sync_date: new Date().toISOString() })
          .eq('erp_location_id', erpLocation.id);
      }
    } else {
      // Create new location
      const { error } = await supabase
        .from('locations')
        .insert({
          erp_location_id: erpLocation.id,
          name: erpLocation.name,
          description: erpLocation.description || null,
          last_sync_date: new Date().toISOString(),
        });

      if (error) {
        console.error(`Failed to create location ${erpLocation.id}:`, error);
        throw new Error(`Failed to create location ${erpLocation.id}: ${error.message}`);
      }
      
      console.log(`Created new location: ${erpLocation.name}`);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate required system settings
    console.log('Validating system configuration...');
    
    const erpApiUrl = await getSystemSetting(supabase, 'erp_api_url');
    const erpApiKey = await getSystemSetting(supabase, 'erp_api_key');
    const syncEnabled = await getSystemSetting(supabase, 'location_sync_enabled');

    // Check if sync is enabled
    if (syncEnabled.toLowerCase() !== 'true') {
      console.log('Location sync is disabled');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Location sync is disabled in system settings' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'locations',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let syncResult;
    try {
      // Fetch locations from ERP
      const erpLocations = await fetchERPLocations(erpApiUrl, erpApiKey);
      
      // Sync locations to database
      await syncLocations(supabase, erpLocations);

      // Update sync log with success
      if (syncLog) {
        await supabase
          .from('sync_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            assets_synced: erpLocations.length,
            errors_count: 0,
          })
          .eq('id', syncLog.id);
      }

      syncResult = {
        success: true,
        message: `Successfully synced ${erpLocations.length} locations`,
        locations_synced: erpLocations.length,
      };

      console.log(`Sync completed successfully: ${erpLocations.length} locations processed`);

    } catch (syncError) {
      console.error('Sync failed:', syncError);

      // Update sync log with error
      if (syncLog) {
        await supabase
          .from('sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            errors_count: 1,
            error_details: { error: syncError.message },
          })
          .eq('id', syncLog.id);
      }

      throw syncError;
    }

    return new Response(
      JSON.stringify(syncResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Location sync error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});