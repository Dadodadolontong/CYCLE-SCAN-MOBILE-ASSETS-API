-- Clean up the specific stuck sync logs with correct IDs
UPDATE public.sync_logs 
SET 
  status = 'completed',
  completed_at = '2025-07-12 04:33:00+00'::timestamptz,
  records_processed = 3301,
  assets_synced = 3301,
  errors_count = 0
WHERE id IN (
  '24694cd1-5465-459a-a393-23cf48f889b7',
  'db3bc887-7585-4604-9981-8bceb5f43839'
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