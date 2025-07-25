import { z } from 'zod';

// Enhanced CSV content validation with additional security checks
export const sanitizeCsvCell = (value: string): string => {
  if (!value) return '';
  
  const sanitized = value.toString().trim();
  
  // Check for formula injection attempts (expanded list)
  const dangerousStarts = ['=', '+', '-', '@', '\t', '\r', '\n'];
  if (dangerousStarts.some(start => sanitized.startsWith(start))) {
    return `'${sanitized}`; // Prefix with quote to prevent formula execution
  }
  
  // Remove potential script injections
  const scriptPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
  return sanitized.replace(scriptPattern, '');
};

// Enhanced file validation with content-type verification
export const validateCsvFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  // Enhanced file type validation
  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  const hasValidExtension = file.name.toLowerCase().endsWith('.csv');
  const hasValidType = validTypes.includes(file.type) || file.type === '';
  
  if (!hasValidExtension || !hasValidType) {
    return { isValid: false, error: 'Only CSV files are allowed' };
  }
  
  // Validate filename to prevent path traversal (enhanced)
  const safeFilename = /^[a-zA-Z0-9._-]+\.csv$/;
  if (!safeFilename.test(file.name)) {
    return { isValid: false, error: 'Invalid filename. Only letters, numbers, dots, dashes and underscores are allowed' };
  }
  
  // Check for null bytes and other suspicious characters
  if (file.name.includes('\0') || file.name.includes('..')) {
    return { isValid: false, error: 'Invalid filename characters detected' };
  }
  
  return { isValid: true };
};

// Enhanced filename sanitization
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100); // Limit length
};

// Enhanced input validation schemas with stricter patterns
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 254 characters')
  .refine(email => !email.includes('..'), 'Invalid email format'); // Prevent double dots

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

export const locationNameSchema = z.string()
  .min(1, 'Location name is required')
  .max(100, 'Location name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Location name contains invalid characters')
  .refine(name => !name.includes('..'), 'Invalid location name');

export const assetNameSchema = z.string()
  .min(1, 'Asset name is required')
  .max(200, 'Asset name must be less than 200 characters')
  .regex(/^[a-zA-Z0-9\s\-_.#\/()]+$/, 'Asset name contains invalid characters')
  .refine(name => !name.includes('..'), 'Invalid asset name');

export const erpIdSchema = z.string()
  .min(1, 'ERP ID is required')
  .max(50, 'ERP ID must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'ERP ID can only contain letters, numbers, dashes and underscores');

// URL validation for OAuth configurations
export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine(url => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL must use HTTP or HTTPS protocol')
  .refine(url => {
    const parsed = new URL(url);
    return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname) || 
           process.env.NODE_ENV === 'development';
  }, 'Localhost URLs not allowed in production');

// Server-side rate limiting check
export const checkServerRateLimit = async (
  identifier: string, 
  action: string, 
  maxAttempts: number = 5, 
  windowMinutes: number = 15
): Promise<boolean> => {
  try {
    // This function was tied to Supabase, so it's removed.
    // If rate limiting is needed, it must be implemented server-side.
    console.warn('Rate limiting check is not implemented client-side.');
    return false; // Fail closed - deny if we can't check
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false; // Fail closed
  }
};

// Enhanced audit log creation with IP and user agent
export const createSecurityAuditLog = async (
  action: string, 
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
) => {
  try {
    // This function was tied to Supabase, so it's removed.
    // If audit logging is needed, it must be implemented server-side.
    console.warn('Security audit log is not implemented client-side.');
  } catch (error) {
    console.error('Security audit log error:', error);
  }
};

// Session tracking for security monitoring
export const trackUserSession = async (action: 'start' | 'end') => {
  try {
    // This function was tied to Supabase, so it's removed.
    // If session tracking is needed, it must be implemented server-side.
    console.warn('User session tracking is not implemented client-side.');
  } catch (error) {
    console.error('Session tracking error:', error);
  }
};

// Content Security Policy generator
export const generateCSPHeader = (): string => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Relaxed for development
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');
  
  return csp;
};

// Security headers for Edge Functions
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

// Secure file upload path generation
export const generateSecureUploadPath = (userId: string, filename: string): string => {
  const sanitizedFilename = sanitizeFilename(filename);
  const timestamp = Date.now();
  return `${userId}/${timestamp}_${sanitizedFilename}`;
};

// Validate admin access
export const verifyAdminAccess = async (): Promise<boolean> => {
  try {
    // This function was tied to Supabase, so it's removed.
    // If admin verification is needed, it must be implemented server-side.
    console.warn('Admin verification is not implemented client-side.');
    return false;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
};