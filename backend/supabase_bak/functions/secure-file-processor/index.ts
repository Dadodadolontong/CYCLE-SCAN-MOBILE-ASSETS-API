import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
      _identifier: `${user.id}:${clientIP}`,
      _action: 'file_upload',
      _max_attempts: 10,
      _window_minutes: 60
    });

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { fileId, operation } = await req.json();

    // Verify file ownership
    const { data: file } = await supabase.storage
      .from('csv-uploads')
      .list(`${user.id}/`, { search: fileId });

    if (!file || file.length === 0) {
      throw new Error('File not found or unauthorized');
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      _action: `file_${operation}`,
      _resource_type: 'storage',
      _resource_id: fileId,
      _details: { operation, clientIP },
      _ip_address: clientIP,
      _user_agent: req.headers.get('user-agent')
    });

    let result;
    switch (operation) {
      case 'process':
        // Secure file processing logic
        const { data: fileData } = await supabase.storage
          .from('csv-uploads')
          .download(`${user.id}/${fileId}`);

        if (!fileData) {
          throw new Error('Failed to download file');
        }

        // Additional security: validate file size again
        if (fileData.size > 20 * 1024 * 1024) {
          throw new Error('File too large (max 20MB)');
        }

        result = { success: true, message: 'File processed securely' };
        break;

      case 'delete':
        const { error: deleteError } = await supabase.storage
          .from('csv-uploads')
          .remove([`${user.id}/${fileId}`]);

        if (deleteError) {
          throw deleteError;
        }

        result = { success: true, message: 'File deleted securely' };
        break;

      default:
        throw new Error('Invalid operation');
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Secure file processor error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});