/**
 * Input sanitization and validation utilities for Dashboard API routes
 */

/**
 * Sanitizes string input by removing potentially dangerous characters
 * @param input - The raw input string
 * @returns Sanitized string
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Validates and sanitizes a server ID
 * @param serverId - The server ID to validate
 * @returns Sanitized server ID
 * @throws Error if invalid
 */
export function validateServerId(serverId: unknown): string {
  const sanitized = sanitizeString(serverId);
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Server ID is required');
  }
  // Discord server IDs are numeric strings
  if (!/^\d+$/.test(sanitized)) {
    throw new Error('Invalid server ID format');
  }
  return sanitized;
}

/**
 * Validates and sanitizes a webhook name
 * @param name - The webhook name to validate
 * @returns Sanitized webhook name
 * @throws Error if invalid
 */
export function validateWebhookName(name: unknown): string {
  const sanitized = sanitizeString(name);
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Webhook name is required');
  }
  if (sanitized.length > 100) {
    throw new Error('Webhook name must be 100 characters or less');
  }
  return sanitized;
}

/**
 * Validates and sanitizes a regex pattern
 * @param pattern - The regex pattern to validate
 * @returns Sanitized regex pattern
 * @throws Error if invalid
 */
export function validateRegexPattern(pattern: unknown): string {
  const sanitized = sanitizeString(pattern);
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Regex pattern is required');
  }
  return sanitized;
}

/**
 * Validates and sanitizes a server name
 * @param name - The server name to validate
 * @returns Sanitized server name
 * @throws Error if invalid
 */
export function validateServerName(name: unknown): string {
  const sanitized = sanitizeString(name);
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Server name is required');
  }
  if (sanitized.length > 200) {
    throw new Error('Server name must be 200 characters or less');
  }
  return sanitized;
}

/**
 * Validates server status
 * @param status - The status to validate
 * @returns Validated status
 * @throws Error if invalid
 */
export function validateServerStatus(status: unknown): 'active' | 'disabled' {
  const sanitized = sanitizeString(status);
  if (sanitized !== 'active' && sanitized !== 'disabled') {
    throw new Error('Server status must be either "active" or "disabled"');
  }
  return sanitized;
}

/**
 * Validates total users count
 * @param totalUsers - The total users count to validate
 * @returns Validated total users
 * @throws Error if invalid
 */
export function validateTotalUsers(totalUsers: unknown): number {
  const num = Number(totalUsers);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    throw new Error('Total users must be a non-negative integer');
  }
  return num;
}

/**
 * Sanitizes optional data template
 * @param data - The data template to sanitize
 * @returns Sanitized data template or undefined
 */
export function sanitizeDataTemplate(data: unknown): string | undefined {
  if (data === null || data === undefined) {
    return undefined;
  }
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  // If it's an object, stringify it
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }
  return String(data);
}

/**
 * Validates and sanitizes user IDs array
 * @param userIds - The user IDs to validate
 * @returns Sanitized user IDs array or undefined
 */
export function validateUserIds(userIds: unknown): string[] | undefined {
  if (userIds === null || userIds === undefined) {
    return undefined;
  }
  if (!Array.isArray(userIds)) {
    throw new Error('User IDs must be an array');
  }
  return userIds.map(id => {
    const sanitized = sanitizeString(id);
    if (sanitized === 'All') {
      return 'All';
    }
    // Discord user IDs are numeric strings
    if (!/^\d+$/.test(sanitized)) {
      throw new Error('Invalid user ID format');
    }
    return sanitized;
  });
}

/**
 * Validates and sanitizes an email address
 * @param email - The email to validate
 * @returns Sanitized email or undefined if empty
 * @throws Error if invalid format
 */
export function validateEmail(email: unknown): string | undefined {
  if (email === null || email === undefined || email === '') {
    return undefined;
  }
  const sanitized = sanitizeString(email);
  if (sanitized.length === 0) {
    return undefined;
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  if (sanitized.length > 254) {
    throw new Error('Email must be 254 characters or less');
  }
  return sanitized;
}
