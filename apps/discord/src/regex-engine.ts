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
 * Parses a regex pattern string and returns a compiled RegExp object
 * Supports both wrapped format (/pattern/flags) and raw format (pattern)
 * @param input - The regex pattern (string or RegExp)
 * @param defaultFlags - Default flags to apply if not specified
 * @returns Compiled RegExp object
 * @throws Error if pattern is invalid or too complex
 */
export function parseRegex(input: any, defaultFlags: string = ""): RegExp {
  if (input instanceof RegExp) return input; // Already a RegExp

  if (typeof input !== "string") {
    throw new Error("Regex must be a string or RegExp");
  }

  const isWrapped = input.startsWith("/") && input.lastIndexOf("/") > 0;
  let pattern: string;
  let flags: string;

  if (isWrapped) {
    // Extract pattern and flags from `/pattern/flags`
    const lastSlash = input.lastIndexOf("/");
    pattern = input.slice(1, lastSlash);
    flags = input.slice(lastSlash + 1);
  } else {
    // Just a raw pattern, use default flags
    pattern = input;
    flags = defaultFlags;
  }

  // Check complexity before compilation
  checkComplexity(pattern);
  
  return new RegExp(pattern, flags);
}
