import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationRow {
  'name': string;
  'description': string;
  'erp_location_id': string;
  'branch-name': string;
}

// Security helpers
const sanitizeCsvCell = (value: string): string => {
  if (!value) return '';
  const sanitized = value.toString().trim();
  
  // Prevent CSV injection
  if (sanitized.startsWith('=') || sanitized.startsWith('+') || 
      sanitized.startsWith('-') || sanitized.startsWith('@')) {
    return `'${sanitized}`;
  }
  
  return sanitized;
};

const validateLocationName = (name: string): boolean => {
  return /^[a-zA-Z0-9\s\-_.]+$/.test(name) && name.length > 0 && name.length <= 100;
};

const validateBranchName = (name: string): boolean => {
  return /^[a-zA-Z0-9\s\-_.]+$/.test(name) && name.length > 0 && name.length <= 100;
};

const createSecurityLog = async (supabase: any, action: string, details: any) => {
  try {
    await supabase.from('sync_logs').insert({
      sync_type: 'security_event',
      status: 'completed',
      file_name: `security_${Date.now()}.log`,
      error_details: { action, details, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Failed to create security log:', error);
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let fileName = '';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT token for authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      await createSecurityLog(supabase, 'unauthorized_access_attempt', { endpoint: 'process-locations-csv' });
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      await createSecurityLog(supabase, 'invalid_auth_token', { error: authError?.message });
      throw new Error('Invalid authentication token');
    }

    // Check user role authorization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'manager'].includes(userRole.role)) {
      await createSecurityLog(supabase, 'unauthorized_role_access', { 
        userId: user.id, 
        role: userRole?.role || 'none',
        endpoint: 'process-locations-csv'
      });
      throw new Error('Insufficient permissions');
    }

    const body = await req.json();
    fileName = body.fileName;
    
    if (!fileName) {
      throw new Error('File name is required');
    }

    // Validate filename for security (extract base filename from path)
    const actualFileName = fileName.split('/').pop() || fileName;
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(actualFileName)) {
      await createSecurityLog(supabase, 'suspicious_filename', { fileName, actualFileName, userId: user.id });
      throw new Error('Invalid filename format');
    }

    
    await createSecurityLog(supabase, 'csv_processing_started', { 
      fileName, 
      userId: user.id, 
      type: 'locations' 
    });

    // Get the file from storage with timeout
    const filePromise = supabase.storage
      .from('csv-uploads')
      .download(fileName);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('File download timeout')), 30000)
    );

    const { data: fileData, error: fileError } = await Promise.race([filePromise, timeoutPromise]) as any;

    if (fileError) {
      throw new Error(`Failed to download file: ${fileError.message}`);
    }

    // Validate file size
    const maxFileSize = 20 * 1024 * 1024; // 20MB
    if (fileData.size > maxFileSize) {
      await createSecurityLog(supabase, 'oversized_file_attempt', { 
        fileName, 
        size: fileData.size, 
        userId: user.id 
      });
      throw new Error('File size exceeds maximum limit (20MB)');
    }

    // Get all branches for lookup if needed
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name');

    if (branchesError) {
      throw new Error(`Failed to fetch branches: ${branchesError.message}`);
    }

    const branchMap = new Map(branches.map(branch => [branch.name.toLowerCase(), branch.id]));
    
    // Parse CSV content with streaming for large files
    const csvText = await fileData.text();
    
    if (csvText.length > 10 * 1024 * 1024) { // 10MB text limit
      throw new Error('CSV content too large to process (max 10MB)');
    }

    const lines = csvText.trim().split('\n');
    
    if (lines.length > 100000) { // Row limit - increased to 100k
      throw new Error('CSV contains too many rows (max 100,000)');
    }

    const headers = lines[0].split(',').map(h => sanitizeCsvCell(h.trim().replace(/"/g, '')));
    
    
    // Validate headers - only 'name' is required
    const requiredHeaders = ['name'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const locations: LocationRow[] = [];
    const errors: string[] = [];

    // Process each row with enhanced validation
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => sanitizeCsvCell(v.trim().replace(/"/g, '')));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Enhanced validation
        if (!row['name']) {
          errors.push(`Row ${i + 1}: name is required`);
          continue;
        }

        if (!validateLocationName(row['name'])) {
          errors.push(`Row ${i + 1}: name contains invalid characters or is too long`);
          continue;
        }

        // Validate description length
        if (row['description'] && row['description'].length > 500) {
          errors.push(`Row ${i + 1}: description is too long (max 500 characters)`);
          continue;
        }

        // Validate ERP ID format (allow periods, forward slashes, and common ERP characters)
        if (row['erp_location_id'] && !/^[a-zA-Z0-9\-_.\/\\]+$/.test(row['erp_location_id'])) {
          errors.push(`Row ${i + 1}: erp_location_id contains invalid characters`);
          continue;
        }

        // Validate branch name if provided
        if (row['branch-name'] && !validateBranchName(row['branch-name'])) {
          errors.push(`Row ${i + 1}: branch-name contains invalid characters or is too long`);
          continue;
        }

        locations.push(row as LocationRow);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    
    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'locations_csv_import',
        status: 'in_progress',
        file_name: fileName,
        records_processed: 0,
        initiated_by: user.id,
      })
      .select()
      .single();

    if (syncLogError) {
      throw new Error(`Failed to create sync log: ${syncLogError.message}`);
    }

    let successCount = 0;
    let errorCount = errors.length;

    // Insert locations into database with batch processing (reduced for large files)
    const batchSize = 50;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      for (const location of batch) {
        try {
          // Look up branch ID if provided
          let branchId = null;
          if (location['branch-name']) {
            branchId = branchMap.get(location['branch-name'].toLowerCase());
            if (!branchId) {
              errors.push(`Failed to insert location "${location['name']}": Branch "${location['branch-name']}" not found`);
              errorCount++;
              continue;
            }
          }

          const { error: insertError } = await supabase
            .from('locations')
            .insert({
              name: location['name'],
              description: location['description'] || null,
              erp_location_id: location['erp_location_id'] || null,
              branch_id: branchId,
            });

          if (insertError) {
            errors.push(`Failed to insert location "${location['name']}": ${insertError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Failed to insert location "${location['name']}": ${error.message}`);
          errorCount++;
        }
      }
    }

    // Update sync log
    const processingTime = Date.now() - startTime;
    const { error: updateLogError } = await supabase
      .from('sync_logs')
      .update({
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        records_processed: successCount,
        errors_count: errorCount,
        error_details: errors.length > 0 ? { 
          errors: errors.slice(0, 100), // Limit stored errors
          processingTimeMs: processingTime,
          userId: user.id
        } : null,
      })
      .eq('id', syncLog.id);

    if (updateLogError) {
      console.error('Failed to update sync log:', updateLogError);
    }

    // Clean up uploaded file
    const { error: deleteError } = await supabase.storage
      .from('csv-uploads')
      .remove([fileName]);

    if (deleteError) {
      console.error('Failed to delete uploaded file:', deleteError);
    }

    // Security log for completion
    await createSecurityLog(supabase, 'csv_processing_completed', {
      fileName,
      userId: user.id,
      type: 'locations',
      successCount,
      errorCount,
      processingTimeMs: processingTime
    });

    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${successCount} locations imported successfully`,
        details: {
          successCount,
          errorCount,
          errors: errors.slice(0, 10), // Return first 10 errors
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing locations CSV:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await createSecurityLog(supabase, 'csv_processing_error', {
      fileName,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Processing failed. Please check your file format and try again.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});