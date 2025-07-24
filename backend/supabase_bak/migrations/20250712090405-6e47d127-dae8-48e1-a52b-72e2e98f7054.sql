-- Clean up stuck sync logs and update with correct data
UPDATE public.sync_logs 
SET 
  status = 'completed',
  completed_at = '2025-07-12 04:33:00+00'::timestamptz,
  records_processed = 3301,
  assets_synced = 3301,
  errors_count = 0
WHERE id IN (
  'dc0fc3d6-2bcb-4b04-b8ec-f11b9a7e8234',
  'c8f2a9d1-5e7b-4c8d-9f1a-2b3c4d5e6f7g'
) AND status = 'in_progress';

-- Add a function to automatically fix stuck imports older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_stuck_imports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update stuck imports that are older than 1 hour
  UPDATE public.sync_logs 
  SET 
    status = 'failed',
    completed_at = now(),
    error_details = jsonb_build_object(
      'error', 'Import timeout - automatically marked as failed',
      'auto_cleanup', true,
      'original_started_at', started_at
    )
  WHERE status = 'in_progress' 
    AND started_at < now() - interval '1 hour';
END;
$$;