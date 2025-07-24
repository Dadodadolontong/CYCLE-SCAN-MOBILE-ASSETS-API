import { z } from 'zod';

// CSV content validation to prevent CSV injection
export const sanitizeCsvCell = (value: string): string => {
  if (!value) return '';
  
  // Remove dangerous CSV injection characters
  const sanitized = value.toString().trim();
  
  // Check for formula injection attempts
  if (sanitized.startsWith('=') || sanitized.startsWith('+') || 
      sanitized.startsWith('-') || sanitized.startsWith('@')) {
    return `'${sanitized}`; // Prefix with quote to prevent formula execution
  }
  
  return sanitized;
};

// File validation
export const validateCsvFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 20MB)
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 20MB' };
  }
  
  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    return { isValid: false, error: 'Only CSV files are allowed' };
  }
  
  // Validate filename to prevent path traversal
  const safeFilename = /^[a-zA-Z0-9._-]+\.csv$/;
  if (!safeFilename.test(file.name)) {
    return { isValid: false, error: 'Invalid filename. Only letters, numbers, dots, dashes and underscores are allowed' };
  }
  
  return { isValid: true };
};

// Sanitize filename to prevent path traversal
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 100); // Limit length
};

// Input validation schemas
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 254 characters');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const locationNameSchema = z.string()
  .min(1, 'Location name is required')
  .max(100, 'Location name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Location name contains invalid characters');

export const assetNameSchema = z.string()
  .min(1, 'Asset name is required')
  .max(200, 'Asset name must be less than 200 characters')
  .regex(/^[a-zA-Z0-9\s\-_.#\/()]+$/, 'Asset name contains invalid characters');

export const erpIdSchema = z.string()
  .min(1, 'ERP ID is required')
  .max(50, 'ERP ID must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'ERP ID can only contain letters, numbers, dashes and underscores');

// Rate limiting helper (simple client-side tracking)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Audit log helper
export const createAuditLog = (action: string, details: Record<string, any>) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    userAgent: navigator.userAgent,
    ip: 'client-side' // Note: Real IP would be logged server-side
  };
  
  console.log('Audit Log:', logEntry);
  // In production, this would send to a logging service
  
  return logEntry;
};