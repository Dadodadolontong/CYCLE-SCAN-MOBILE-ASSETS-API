import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ERPAsset {
  id: string;
  name: string;
  barcode?: string;
  model?: string;
  build?: string;
  category?: string;
  location?: string;
  status?: string;
  lastSeen?: string;
}

interface SyncRequest {
  syncType: 'manual' | 'scheduled';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { syncType = 'manual' }: SyncRequest = await req.json()

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabaseClient
      .from('sync_logs')
      .insert({
        sync_type: syncType,
        status: 'running',
        initiated_by: user.id,
      })
      .select()
      .single()

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError)
      return new Response(JSON.stringify({ error: 'Failed to start sync' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Starting ${syncType} asset sync for user ${user.id}`)

    try {
      // Get ERP API configuration from environment
      const erpApiUrl = Deno.env.get('ERP_API_URL')
      const erpApiKey = Deno.env.get('ERP_API_KEY')

      if (!erpApiUrl || !erpApiKey) {
        throw new Error('ERP API configuration missing')
      }

      console.log('Fetching assets from ERP API...')
      
      // Call ERP API to get assets
      const erpResponse = await fetch(`${erpApiUrl}/assets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${erpApiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!erpResponse.ok) {
        throw new Error(`ERP API error: ${erpResponse.status} ${erpResponse.statusText}`)
      }

      const erpAssets: ERPAsset[] = await erpResponse.json()
      console.log(`Fetched ${erpAssets.length} assets from ERP`)

      let assetsProcessed = 0
      let errorsCount = 0
      const errors: string[] = []

      // Process assets in batches
      const batchSize = 100
      for (let i = 0; i < erpAssets.length; i += batchSize) {
        const batch = erpAssets.slice(i, i + batchSize)
        
        for (const erpAsset of batch) {
          try {
            // Upsert asset data
            const { error: upsertError } = await supabaseClient
              .from('assets')
              .upsert({
                erp_asset_id: erpAsset.id,
                name: erpAsset.name,
                barcode: erpAsset.barcode,
                model: erpAsset.model,
                build: erpAsset.build,
                category: erpAsset.category,
                location: erpAsset.location,
                status: erpAsset.status || 'active',
                last_seen: erpAsset.lastSeen ? new Date(erpAsset.lastSeen).toISOString() : null,
                synced_at: new Date().toISOString(),
              }, {
                onConflict: 'erp_asset_id'
              })

            if (upsertError) {
              console.error(`Error upserting asset ${erpAsset.id}:`, upsertError)
              errorsCount++
              errors.push(`Asset ${erpAsset.id}: ${upsertError.message}`)
            } else {
              assetsProcessed++
            }
          } catch (error) {
            console.error(`Error processing asset ${erpAsset.id}:`, error)
            errorsCount++
            errors.push(`Asset ${erpAsset.id}: ${error.message}`)
          }
        }
      }

      // Update sync log with completion status
      const syncStatus = errorsCount === 0 ? 'completed' : 'completed'
      await supabaseClient
        .from('sync_logs')
        .update({
          status: syncStatus,
          completed_at: new Date().toISOString(),
          assets_synced: assetsProcessed,
          errors_count: errorsCount,
          error_details: errors.length > 0 ? { errors: errors.slice(0, 10) } : null, // Limit error details
        })
        .eq('id', syncLog.id)

      console.log(`Sync completed: ${assetsProcessed} assets processed, ${errorsCount} errors`)

      return new Response(JSON.stringify({
        success: true,
        syncLogId: syncLog.id,
        assetsProcessed,
        errorsCount,
        status: syncStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('Sync failed:', error)
      
      // Update sync log with failure status
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors_count: 1,
          error_details: { error: error.message },
        })
        .eq('id', syncLog.id)

      return new Response(JSON.stringify({
        error: 'Sync failed',
        details: error.message,
        syncLogId: syncLog.id,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Error in sync-assets function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})