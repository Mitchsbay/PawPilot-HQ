/**
 * SQL Guards - Prevent application from running dangerous DDL operations
 * 
 * These functions help prevent the application from accidentally running
 * database schema changes that should only be done by administrators.
 */

export function containsDangerousDDL(sql: string): boolean {
  const dangerousPatterns = [
    // Table operations
    /\b(create|alter|drop)\s+table\b/i,
    
    // Policy operations
    /\b(create|alter|drop)\s+policy\b/i,
    
    // Schema operations
    /\b(create|alter|drop)\s+schema\b/i,
    
    // Role operations
    /\b(create|alter|drop)\s+role\b/i,
    
    // View operations
    /\b(create|alter|drop)\s+(materialized\s+)?view\b/i,
    
    // Function operations
    /\b(create|alter|drop)\s+function\b/i,
    
    // Index operations
    /\b(create|drop)\s+(unique\s+)?index\b/i,
    
    // Trigger operations
    /\b(create|alter|drop)\s+trigger\b/i,
    
    // Database operations
    /\b(create|alter|drop)\s+database\b/i,
    
    // Extension operations
    /\b(create|drop)\s+extension\b/i,
    
    // Grant/Revoke operations
    /\b(grant|revoke)\b/i,
    
    // Truncate operations
    /\btruncate\s+table\b/i
  ];

  return dangerousPatterns.some(pattern => pattern.test(sql));
}

export function validateSafeSQL(sql: string): { safe: boolean; reason?: string } {
  if (containsDangerousDDL(sql)) {
    return {
      safe: false,
      reason: 'SQL contains DDL operations that should only be run by database administrators'
    };
  }

  // Check for other potentially dangerous operations
  const suspiciousPatterns = [
    { pattern: /\bdelete\s+from\s+\w+\s*;?\s*$/i, reason: 'Bulk DELETE without WHERE clause detected' },
    { pattern: /\bupdate\s+\w+\s+set\s+.*\s*;?\s*$/i, reason: 'UPDATE without WHERE clause detected' },
    { pattern: /\bdrop\s+/i, reason: 'DROP statement detected' },
    { pattern: /\btruncate\s+/i, reason: 'TRUNCATE statement detected' }
  ];

  for (const { pattern, reason } of suspiciousPatterns) {
    if (pattern.test(sql)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

export function sanitizeSQL(sql: string): string {
  // Remove comments
  let sanitized = sql.replace(/--.*$/gm, '');
  
  // Remove multi-line comments
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

export class SQLGuardError extends Error {
  constructor(message: string, public readonly sql: string) {
    super(message);
    this.name = 'SQLGuardError';
  }
}

export function guardedExecute(sql: string): void {
  const sanitized = sanitizeSQL(sql);
  const validation = validateSafeSQL(sanitized);
  
  if (!validation.safe) {
    throw new SQLGuardError(
      `Dangerous SQL operation blocked: ${validation.reason}`,
      sanitized
    );
  }
}

// Middleware for API routes that execute SQL
export function sqlGuardMiddleware(sql: string): boolean {
  try {
    guardedExecute(sql);
    return true;
  } catch (error) {
    if (error instanceof SQLGuardError) {
      console.error('SQL Guard blocked dangerous operation:', error.message);
      console.error('SQL:', error.sql);
    }
    return false;
  }
}

// Common safe SQL patterns for reference
export const SAFE_SQL_PATTERNS = {
  SELECT: /^select\s+/i,
  INSERT: /^insert\s+into\s+\w+\s*\(/i,
  UPDATE_WITH_WHERE: /^update\s+\w+\s+set\s+.*\s+where\s+/i,
  DELETE_WITH_WHERE: /^delete\s+from\s+\w+\s+where\s+/i
} as const;