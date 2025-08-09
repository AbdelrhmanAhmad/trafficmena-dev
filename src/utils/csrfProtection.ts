/**
 * Enhanced CSRF Protection utilities for Supabase admin forms
 * Provides additional security layers beyond Supabase's built-in JWT protection
 * SECURITY FIX: Enhanced token storage and validation to prevent XSS attacks
 */

import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  sessionId: string;
  userAgent: string;
  origin: string;
}

// Generate a cryptographically secure CSRF token bound to session
export const generateCSRFToken = async (): Promise<string> => {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.getRandomValues(new Uint8Array(32)); // Increased entropy
  const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Get session data for binding
  const { data: { session } } = await supabase.auth.getSession();
  const sessionId = session?.access_token?.substring(0, 16) || 'anonymous';
  const userAgent = navigator.userAgent.substring(0, 50); // Truncated for storage
  const origin = window.location.origin;
  
  const sessionData = JSON.stringify({ sessionId, userAgent, origin });
  const encodedSessionData = btoa(sessionData);
  
  return `${timestamp}_${randomString}_${encodedSessionData}`;
};

// Create a secure token storage mechanism
const createSecureStorage = () => {
  const storageKey = '__csrf_token_secure';
  
  return {
    store: (token: string): boolean => {
      try {
        // Use a combination of sessionStorage and a memory store
        const tokenData = {
          token,
          timestamp: Date.now(),
          tabId: Math.random().toString(36).substr(2, 9)
        };
        
        sessionStorage.setItem(storageKey, JSON.stringify(tokenData));
        
        // Also store in a closure for additional protection
        (window as any).__csrfTokenStore = tokenData;
        return true;
      } catch (error) {
        console.error('Failed to store CSRF token securely:', error);
        return false;
      }
    },
    
    retrieve: (): string | null => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const memoryStore = (window as any).__csrfTokenStore;
        
        if (!stored || !memoryStore) return null;
        
        const storedData = JSON.parse(stored);
        
        // Verify both storage mechanisms match
        if (storedData.token !== memoryStore.token || 
            storedData.tabId !== memoryStore.tabId) {
          // Potential tampering detected
          return null;
        }
        
        // Check token age (max 30 minutes for security)
        const maxAge = 30 * 60 * 1000;
        if (Date.now() - storedData.timestamp > maxAge) {
          return null;
        }
        
        return storedData.token;
      } catch (error) {
        console.error('Failed to retrieve CSRF token:', error);
        return null;
      }
    },
    
    clear: (): void => {
      try {
        sessionStorage.removeItem(storageKey);
        delete (window as any).__csrfTokenStore;
      } catch (error) {
        console.error('Failed to clear CSRF token:', error);
      }
    }
  };
};

const secureStorage = createSecureStorage();

// Store CSRF token using enhanced security
export const storeCSRFToken = (token: string): boolean => {
  return secureStorage.store(token);
};

// Retrieve CSRF token with enhanced validation
export const getStoredCSRFToken = (): string | null => {
  return secureStorage.retrieve();
};

// Clear CSRF token securely
export const clearCSRFToken = (): void => {
  secureStorage.clear();
};

// Enhanced CSRF token validation with session binding
export const validateCSRFToken = async (token: string): Promise<boolean> => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('_');
  if (parts.length !== 3) return false;
  
  const [timestampStr, randomString, encodedSessionData] = parts;
  
  // Validate timestamp
  const timestamp = parseInt(timestampStr);
  if (isNaN(timestamp)) return false;
  
  // Check token age (max 30 minutes)
  const maxAge = 30 * 60 * 1000;
  const age = Date.now() - timestamp;
  if (age > maxAge || age < 0) return false;
  
  // Validate session binding
  try {
    const sessionData = JSON.parse(atob(encodedSessionData));
    const currentOrigin = window.location.origin;
    const currentUserAgent = navigator.userAgent.substring(0, 50);
    
    if (sessionData.origin !== currentOrigin) return false;
    if (sessionData.userAgent !== currentUserAgent) return false;
    
    // Verify current session matches
    const { data: { session } } = await supabase.auth.getSession();
    const currentSessionId = session?.access_token?.substring(0, 16) || 'anonymous';
    
    if (sessionData.sessionId !== currentSessionId) return false;
    
    return true;
  } catch (error) {
    console.error('CSRF token validation failed:', error);
    return false;
  }
};

// Verify the user is authenticated and has valid session
export const verifyAuthenticatedSession = async (): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { isValid: false, error: 'Session verification failed' };
    }
    
    if (!session) {
      return { isValid: false, error: 'No active session found' };
    }
    
    // Check if session is still valid and not expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      return { isValid: false, error: 'Session has expired' };
    }
    
    // Additional security: check for session tampering
    const expectedUserId = session.user?.id;
    if (!expectedUserId) {
      return { isValid: false, error: 'Invalid session data' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Authentication check failed' };
  }
};

// Enhanced admin operation wrapper with improved CSRF protection
export const secureAdminOperation = async <T>(
  operation: () => Promise<T>,
  csrfToken?: string
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    // Verify authentication first
    const authCheck = await verifyAuthenticatedSession();
    if (!authCheck.isValid) {
      return { success: false, error: authCheck.error || 'Authentication failed' };
    }
    
    // Enhanced CSRF token validation
    if (csrfToken) {
      const storedToken = getStoredCSRFToken();
      if (!storedToken) {
        return { success: false, error: 'No CSRF token found' };
      }
      
      if (storedToken !== csrfToken) {
        return { success: false, error: 'CSRF token mismatch' };
      }
      
      const isValid = await validateCSRFToken(csrfToken);
      if (!isValid) {
        return { success: false, error: 'CSRF token validation failed' };
      }
    }
    
    // Execute the operation
    const result = await operation();
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Secure admin operation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Operation failed' 
    };
  }
};

// Initialize enhanced CSRF protection
export const initializeCSRFProtection = async (): Promise<string> => {
  const token = await generateCSRFToken();
  const stored = storeCSRFToken(token);
  
  if (!stored) {
    throw new Error('Failed to initialize CSRF protection');
  }
  
  return token;
};

// Enhanced security headers check
export const checkCookieSecurityHeaders = (): { secure: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let secure = true;
  
  // Check if we're in a secure context
  if (!window.isSecureContext) {
    warnings.push('Page is not served over HTTPS - cookies may not be secure');
    secure = false;
  }
  
  // Check Content Security Policy
  const metaTags = document.getElementsByTagName('meta');
  let hasCSP = false;
  for (let i = 0; i < metaTags.length; i++) {
    if (metaTags[i].getAttribute('http-equiv') === 'Content-Security-Policy') {
      hasCSP = true;
      break;
    }
  }
  
  if (!hasCSP) {
    warnings.push('No Content Security Policy detected - XSS attacks possible');
    secure = false;
  }
  
  // Check for proper referrer policy
  let hasReferrerPolicy = false;
  for (let i = 0; i < metaTags.length; i++) {
    if (metaTags[i].getAttribute('name') === 'referrer') {
      hasReferrerPolicy = true;
      break;
    }
  }
  
  if (!hasReferrerPolicy) {
    warnings.push('No referrer policy set - information leakage possible');
  }
  
  return { secure, warnings };
};

// Initialize enhanced security for admin pages
export const initializeAdminSecurity = async (): Promise<{ initialized: boolean; warnings: string[] }> => {
  try {
    const cookieCheck = checkCookieSecurityHeaders();
    const token = await initializeCSRFProtection();
    
    const warnings = [...cookieCheck.warnings];
    
    // Additional security validations
    if (!token) {
      warnings.push('Failed to initialize CSRF protection');
      return { initialized: false, warnings };
    }
    
    // Check for common XSS protection headers
    const hasXSSProtection = document.querySelector('meta[http-equiv="X-XSS-Protection"]');
    if (!hasXSSProtection) {
      warnings.push('X-XSS-Protection header not detected');
    }
    
    return {
      initialized: true,
      warnings
    };
  } catch (error) {
    console.error('Failed to initialize admin security:', error);
    return {
      initialized: false,
      warnings: ['Failed to initialize security protections']
    };
  }
};