
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        // Only update loading state if we haven't initialized yet
        if (!initialized) {
          initialized = true;
          setLoading(false);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setError(null); // Clear any previous errors
      }
    );

    // THEN check for existing session - but don't duplicate state setting
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setError('Failed to restore session');
          if (!initialized) {
            setLoading(false);
            initialized = true;
          }
          return;
        }
        
        // Only set session if listener hasn't already handled it
        if (!initialized) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          initialized = true;
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Unexpected error getting session:', err);
        setError('Authentication system error');
        if (!initialized) {
          setLoading(false);
          initialized = true;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        
        // Force local state cleanup even if sign out fails
        setUser(null);
        setSession(null);
        
        // Don't throw here - we want to show user feedback but still clean up locally
        return { error: 'Failed to sign out properly. You may need to clear your browser data.' };
      }
      
      // Successful sign out - state will be cleared by auth state listener
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      
      // Force local cleanup on any error
      setUser(null);
      setSession(null);
      
      return { error: 'An unexpected error occurred while signing out. Local session has been cleared.' };
    } finally {
      setLoading(false);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    loading,
    error,
    signOut,
  }), [user, session, loading, error, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
