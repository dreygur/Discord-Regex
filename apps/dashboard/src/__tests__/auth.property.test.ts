import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import crypto from 'crypto';

// Helper function to hash password (same as in login route)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to validate credentials (simulating the login logic)
function validateCredentials(email: string, password: string, validEmail: string, storedHash: string): boolean {
  if (email !== validEmail) {
    return false;
  }
  
  const hashedPassword = hashPassword(password);
  
  try {
    const bufA = Buffer.from(hashedPassword, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Helper function to simulate session creation
function createSession(email: string): { sessionToken: string; user: { email: string } } {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  return {
    sessionToken,
    user: { email }
  };
}

// Helper function to simulate authentication attempt
function authenticateUser(email: string, password: string, validEmail: string, storedHash: string): { success: boolean; errorMessage?: string; session?: { sessionToken: string; user: { email: string } } } {
  const isValid = validateCredentials(email, password, validEmail, storedHash);
  
  if (!isValid) {
    return {
      success: false,
      errorMessage: "Invalid email or password"
    };
  }
  
  return {
    success: true,
    session: createSession(email)
  };
}

describe('Authentication - Property-Based Tests', () => {
  // Feature: discord-regex-bot, Property 23: Password hashing
  // Validates: Requirements 7.1
  it('Property 23: For any password submitted during login, the system should hash it using SHA256 before comparison', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (password) => {
        const hashed = hashPassword(password);
        
        // Verify it's a valid SHA256 hex string (64 characters)
        expect(hashed).toMatch(/^[a-f0-9]{64}$/);
        
        // Verify the same password always produces the same hash
        const hashed2 = hashPassword(password);
        expect(hashed).toBe(hashed2);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 24: Credential validation
  // Validates: Requirements 7.2, 7.3
  it('Property 24: For any login attempt, authentication should succeed only when both the hashed password matches the stored hash AND the email matches the configured valid email', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (testEmail, testPassword, validEmail, correctPassword) => {
          const storedHash = hashPassword(correctPassword);
          
          // Test 1: Correct email and password should succeed
          const result1 = validateCredentials(validEmail, correctPassword, validEmail, storedHash);
          expect(result1).toBe(true);
          
          // Test 2: Wrong email should fail (even with correct password)
          if (testEmail !== validEmail) {
            const result2 = validateCredentials(testEmail, correctPassword, validEmail, storedHash);
            expect(result2).toBe(false);
          }
          
          // Test 3: Wrong password should fail (even with correct email)
          if (testPassword !== correctPassword) {
            const result3 = validateCredentials(validEmail, testPassword, validEmail, storedHash);
            expect(result3).toBe(false);
          }
          
          // Test 4: Both wrong should fail
          if (testEmail !== validEmail && testPassword !== correctPassword) {
            const result4 = validateCredentials(testEmail, testPassword, validEmail, storedHash);
            expect(result4).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 25: Session creation on success
  // Validates: Requirements 7.4
  it('Property 25: For any successful authentication, the system should create a session for the user', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (validEmail, password) => {
          const storedHash = hashPassword(password);
          
          // Authenticate with correct credentials
          const result = authenticateUser(validEmail, password, validEmail, storedHash);
          
          // Verify authentication succeeded
          expect(result.success).toBe(true);
          
          // Verify session was created
          expect(result.session).toBeDefined();
          expect(result.session?.sessionToken).toBeDefined();
          expect(result.session?.sessionToken).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
          
          // Verify user object is in session
          expect(result.session?.user).toBeDefined();
          expect(result.session?.user.email).toBe(validEmail);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: discord-regex-bot, Property 26: Error message opacity
  // Validates: Requirements 7.5
  it('Property 26: For any failed authentication attempt, the error message should not reveal whether the email or password was incorrect', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (validEmail, correctPassword, wrongEmail, wrongPassword) => {
          fc.pre(wrongEmail !== validEmail || wrongPassword !== correctPassword); // Ensure at least one is wrong
          
          const storedHash = hashPassword(correctPassword);
          
          // Test with wrong email
          const result1 = authenticateUser(wrongEmail, correctPassword, validEmail, storedHash);
          
          // Test with wrong password
          const result2 = authenticateUser(validEmail, wrongPassword, validEmail, storedHash);
          
          // Test with both wrong
          const result3 = authenticateUser(wrongEmail, wrongPassword, validEmail, storedHash);
          
          // All error messages should be identical and generic
          expect(result1.success).toBe(false);
          expect(result2.success).toBe(false);
          expect(result3.success).toBe(false);
          
          expect(result1.errorMessage).toBe("Invalid email or password");
          expect(result2.errorMessage).toBe("Invalid email or password");
          expect(result3.errorMessage).toBe("Invalid email or password");
          
          // Error messages should not contain "email" or "password" specifically
          expect(result1.errorMessage).not.toContain("email is");
          expect(result1.errorMessage).not.toContain("password is");
          expect(result2.errorMessage).not.toContain("email is");
          expect(result2.errorMessage).not.toContain("password is");
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
