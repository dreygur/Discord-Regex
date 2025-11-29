/**
 * Input sanitization utilities for preventing injection attacks
 */

/**
 * Sanitizes user input by escaping special characters that could be used in injection attacks
 * @param input - The raw user input string
 * @returns Sanitized string safe for inclusion in webhook payloads
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Escape backslashes first to prevent double-escaping issues
    .replace(/\\/g, '\\\\')
    // Escape double quotes
    .replace(/"/g, '\\"')
    // Escape single quotes
    .replace(/'/g, "\\'")
    // Escape newlines
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    // Escape tabs
    .replace(/\t/g, '\\t')
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape control characters
    .replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Escapes content for safe inclusion in JSON strings
 * Prevents JSON injection attacks
 * @param content - The content to escape
 * @returns JSON-safe escaped string
 */
export function escapeForJSON(content: string): string {
  if (typeof content !== 'string') {
    return '';
  }

  // Use JSON.stringify to properly escape the string, then remove the surrounding quotes
  const escaped = JSON.stringify(content);
  return escaped.slice(1, -1);
}
