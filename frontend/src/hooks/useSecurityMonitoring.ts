import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Hook for monitoring user sessions
export const useUserSessions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_start', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

// Hook for security metrics (admin only)
export const useSecurityMetrics = () => {
  return useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => {
      // Check if user is admin
      const { data: isAdminResult } = await supabase.rpc('is_admin');
      if (!isAdminResult) {
        throw new Error('Unauthorized');
      }
      
      // Get recent audit logs for security analysis
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('action, created_at, ip_address')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (auditError) throw auditError;
      
      // Get rate limit violations
      const { data: rateLimits, error: rateLimitError } = await supabase
        .from('rate_limits')
        .select('*')
        .not('blocked_until', 'is', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (rateLimitError) throw rateLimitError;
      
      // Calculate security metrics
      const failedLogins = auditLogs?.filter(log => log.action === 'sign_in_failed').length || 0;
      const successfulLogins = auditLogs?.filter(log => log.action === 'sign_in_success').length || 0;
      const fileUploads = auditLogs?.filter(log => log.action.includes('upload')).length || 0;
      const rateLimitViolations = rateLimits?.length || 0;
      
      return {
        failedLogins,
        successfulLogins,
        fileUploads,
        rateLimitViolations,
        totalEvents: auditLogs?.length || 0,
        recentAuditLogs: auditLogs?.slice(0, 20) || [],
        recentRateLimits: rateLimits || []
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Hook for checking if current user is admin
export const useAdminCheck = () => {
  return useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};