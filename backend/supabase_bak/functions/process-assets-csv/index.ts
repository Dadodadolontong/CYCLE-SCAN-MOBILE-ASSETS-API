import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssetRow {
  'name': string;
  'barcode': string;
  'category': string;
  'model': string;
  'build': string;
  'location-name': string;
  'erp_asset_id': string;
  'status': string;
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

const validateAssetName = (name: string): boolean => {
  if (!name || name.length === 0 || name.length > 200) return false;
  // Allow any printable characters except control characters
  // Prevent CSV injection by checking for leading dangerous characters
  const trimmed = name.trim();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || 
      trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return false;
  }
  // Allow any printable ASCII and Unicode characters
  return /^[\x20-\x7E\u00A0-\uFFFF]+$/.test(trimmed);
};

const validateErpId = (id: string): boolean => {
  if (!id || id.length === 0 || id.length > 50) return false;
  // Allow letters, numbers, and common symbols but not spaces
  // Prevent CSV injection
  const trimmed = id.trim();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || 
      trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return false;
  }
  // Allow most printable characters except spaces and control characters
  return /^[a-zA-Z0-9\-_.#\/()$&@!%*+=<>?|\\]+$/.test(trimmed);
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
  let syncLogId: string | undefined;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT token for authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      await createSecurityLog(supabase, 'unauthorized_access_attempt', { endpoint: 'process-assets-csv' });
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
        endpoint: 'process-assets-csv'
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
      type: 'assets' 
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

    // Get all locations for lookup
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name');

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    const locationMap = new Map(locations.map(loc => [loc.name.toLowerCase(), loc.id]));
    

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
    
    

    // Validate headers
    const expectedHeaders = ['name', 'erp_asset_id', 'location-name'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const assets: AssetRow[] = [];
    const errors: string[] = [];

    // Process each row with enhanced validation and detailed logging
    
    
    for (let i = 1; i < lines.length; i++) {
      try {
    
        
        const line = lines[i].trim();
    
        
        // Enhanced CSV parsing to handle quoted fields and commas within fields
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        let charIndex = 0;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(sanitizeCsvCell(currentValue.trim()));
            currentValue = '';
          } else {
            currentValue += char;
          }
          charIndex++;
        }
        values.push(sanitizeCsvCell(currentValue.trim()));
        
        // Check if we have the right number of columns
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}. Line content: "${line.substring(0, 100)}..."`);
          continue;
        }
        
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Enhanced validation with detailed logging
        if (!row['name']) {
          errors.push(`Row ${i + 1}: name is required`);
          continue;
        }
        if (!row['erp_asset_id']) {
          errors.push(`Row ${i + 1}: erp_asset_id is required`);
          continue;
        }

        if (!validateAssetName(row['name'])) {
          errors.push(`Row ${i + 1}: asset name "${row['name']}" contains invalid characters or is too long (max 200 chars)`);
          continue;
        }

        if (!validateErpId(row['erp_asset_id'])) {
          errors.push(`Row ${i + 1}: erp_asset_id "${row['erp_asset_id']}" contains invalid characters or is too long (max 50 chars)`);
          continue;
        }

        // Validate other fields with detailed messages
        if (row['barcode'] && row['barcode'].length > 100) {
          errors.push(`Row ${i + 1}: barcode "${row['barcode']}" is too long (max 100 characters)`);
          continue;
        }

        if (row['category'] && row['category'].length > 100) {
          errors.push(`Row ${i + 1}: category "${row['category']}" is too long (max 100 characters)`);
          continue;
        }

        if (row['model'] && row['model'].length > 100) {
          errors.push(`Row ${i + 1}: model "${row['model']}" is too long (max 100 characters)`);
          continue;
        }

        if (row['build'] && row['build'].length > 100) {
          errors.push(`Row ${i + 1}: build "${row['build']}" is too long (max 100 characters)`);
          continue;
        }

        assets.push(row as AssetRow);
      } catch (error) {
        const errorMsg = `Row ${i + 1}: Parsing error - ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        // Log the problematic line for debugging
        console.error(`Problematic line ${i + 1}: "${lines[i].substring(0, 200)}..."`);
      }
    }



    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'assets_csv_import',
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

    const syncLogId = syncLog.id;
    let successCount = 0;
    let errorCount = errors.length;

    // Function to update progress with error handling
    const updateProgress = async (processed: number, completed: number = 0, isHeartbeat: boolean = false) => {
      try {
        await supabase
          .from('sync_logs')
          .update({
            records_processed: processed,
            assets_synced: completed,
            error_details: {
              progress: `${processed}/${assets.length} records processed, ${completed} successful`,
              last_heartbeat: new Date().toISOString(),
              errors_count: errorCount
            }
          })
          .eq('id', syncLogId);
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    };

    // Process assets with robust error handling and progress tracking
    const batchSize = 50;
    let processedCount = 0;
    


    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(assets.length / batchSize);
      

      
      for (const asset of batch) {
        try {
          // Look up location ID
          let locationId = null;
          if (asset['location-name']) {
            locationId = locationMap.get(asset['location-name'].toLowerCase());
            if (!locationId) {
              errors.push(`Asset "${asset['name']}": Location "${asset['location-name']}" not found`);
              errorCount++;
              processedCount++;
              continue;
            }
          }

          const { error: insertError } = await supabase
            .from('assets')
            .insert({
              name: asset['name'],
              erp_asset_id: asset['erp_asset_id'],
              barcode: asset['barcode'] || null,
              category: asset['category'] || null,
              model: asset['model'] || null,
              build: asset['build'] || null,
              location: locationId,
              status: asset['status'] || 'active',
            });

          if (insertError) {
            errors.push(`Failed to insert asset "${asset['name']}": ${insertError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
          processedCount++;
        } catch (error) {
          errors.push(`Failed to insert asset "${asset['name']}": ${error.message}`);
          errorCount++;
          processedCount++;
        }
      }
      
      // Update progress every 5 batches or on last batch
      if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
        await updateProgress(processedCount, successCount);
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
        assets_synced: successCount,
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
      type: 'assets',
      successCount,
      errorCount,
      processingTimeMs: processingTime
    });



    // Analyze error patterns
    const validationErrors = errors.filter(e => e.includes('contains invalid characters') || e.includes('too long'));
    const locationErrors = errors.filter(e => e.includes('Location') && e.includes('not found'));
    const parsingErrors = errors.filter(e => e.includes('Parsing error') || e.includes('column mismatch'));
    const requiredFieldErrors = errors.filter(e => e.includes('is required'));


    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${successCount} assets imported successfully from ${lines.length - 1} total rows`,
        details: {
          totalRows: lines.length - 1,
          successCount,
          errorCount,
          validAssets: assets.length,
          errorBreakdown: {
            validationErrors: validationErrors.length,
            locationErrors: locationErrors.length,
            parsingErrors: parsingErrors.length,
            requiredFieldErrors: requiredFieldErrors.length
          },
          errors: errors.slice(0, 20), // Return first 20 errors for debugging
          sampleValidationErrors: validationErrors.slice(0, 5),
          sampleLocationErrors: locationErrors.slice(0, 5),
          sampleParsingErrors: parsingErrors.slice(0, 5)
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing assets CSV:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to update any existing sync log as failed
    if (typeof syncLogId !== 'undefined') {
      try {
        await supabase
          .from('sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_details: {
              error: error.message,
              processingTimeMs: Date.now() - startTime,
              failed_at_stage: 'processing'
            }
          })
          .eq('id', syncLogId);
      } catch (logError) {
        console.error('Failed to update sync log on error:', logError);
      }
    }

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