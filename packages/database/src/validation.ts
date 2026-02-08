// Maximum pattern length to prevent excessive memory usage
const MAX_PATTERN_LENGTH = 1000;

// Maximum nesting depth for groups and quantifiers
const MAX_NESTING_DEPTH = 10;

/**
 * Checks for potentially dangerous regex patterns that could cause ReDoS
 * @param pattern - The regex pattern string to check
 * @throws Error if pattern appears dangerous
 */
function checkComplexity(pattern: string): void {
  // Check pattern length
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`Regex pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`);
  }

  // Check nesting depth by counting nested groups
  let maxDepth = 0;
  let currentDepth = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '(' && (i === 0 || pattern[i - 1] !== '\\')) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (pattern[i] === ')' && (i === 0 || pattern[i - 1] !== '\\')) {
      currentDepth--;
    }
  }

  if (maxDepth > MAX_NESTING_DEPTH) {
    throw new Error(`Regex pattern exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`);
  }

  // Check for potentially dangerous patterns that can cause catastrophic backtracking
  // Pattern: nested quantifiers like (a+)+ or (a*)*
  const nestedQuantifiers = /(\([^)]*[*+]\)[*+])|(\([^)]*[*+]\)\{)/;
  if (nestedQuantifiers.test(pattern)) {
    throw new Error("Regex pattern contains nested quantifiers which may cause catastrophic backtracking");
  }

  // Pattern: alternation with overlapping patterns like (a|a)*
  // This is a simplified check - more sophisticated analysis would be needed for complete coverage
  const dangerousAlternation = /\([^)]*\|[^)]*\)[*+]/;
  if (dangerousAlternation.test(pattern)) {
    throw new Error("Regex pattern contains alternation with quantifiers which may cause performance issues");
  }
}

/**
 * Validates and compiles a regex pattern with complexity checks
 * @param input - The regex pattern string (wrapped or raw format)
 * @param defaultFlags - Default flags to apply if not specified
 * @returns The compiled RegExp object
 * @throws Error with descriptive message if pattern is invalid
 */
export function validateRegexPattern(input: string, defaultFlags: string = ""): RegExp {
  if (typeof input !== "string") {
    throw new Error("Regex pattern must be a string");
  }

  if (input.length === 0) {
    throw new Error("Regex pattern cannot be empty");
  }

  try {
    const isWrapped = input.startsWith("/") && input.lastIndexOf("/") > 0;
    let pattern: string;
    let flags: string;

    if (isWrapped) {
      // Extract pattern and flags from `/pattern/flags`
      const lastSlash = input.lastIndexOf("/");
      pattern = input.slice(1, lastSlash);
      flags = input.slice(lastSlash + 1);
      
      // Validate flags
      const validFlags = /^[gimsuy]*$/;
      if (!validFlags.test(flags)) {
        throw new Error(`Invalid regex flags: "${flags}". Valid flags are: g, i, m, s, u, y`);
      }
    } else {
      // Just a raw pattern, use default flags
      pattern = input;
      flags = defaultFlags;
    }

    // Check complexity before compilation
    checkComplexity(pattern);
    
    return new RegExp(pattern, flags);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid regex syntax: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validates a webhook URL
 * @param url - The URL string to validate
 * @param enforceHttps - Whether to enforce HTTPS protocol (default: false, set to true for production)
 * @throws Error with descriptive message if URL is invalid
 */
export function validateWebhookUrl(url: string, enforceHttps: boolean = false): void {
  if (typeof url !== "string") {
    throw new Error("Webhook URL must be a string");
  }

  if (url.length === 0) {
    throw new Error("Webhook URL cannot be empty");
  }

  // Check if URL starts with http:// or https://
  const startsWithHttp = url.startsWith("http://");
  const startsWithHttps = url.startsWith("https://");

  if (!startsWithHttp && !startsWithHttps) {
    throw new Error("Webhook URL must start with http:// or https://");
  }

  // Enforce HTTPS for production environments
  if (enforceHttps && !startsWithHttps) {
    throw new Error("Webhook URL must use HTTPS protocol in production environments");
  }

  // Validate URL format using URL constructor
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates server status
 * @param status - The status value to validate
 * @throws Error with descriptive message if status is invalid
 */
export function validateServerStatus(status: unknown): void {
  if (typeof status !== "string") {
    throw new Error("Server status must be a string");
  }

  if (status !== "active" && status !== "disabled") {
    throw new Error('Server status must be either "active" or "disabled"');
  }
}
