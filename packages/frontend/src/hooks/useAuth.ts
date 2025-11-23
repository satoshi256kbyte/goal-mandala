import { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  profileSetup: boolean;
  [key: string]: unknown;
}

type AuthStateListener = (isAuthenticated: boolean) => void;

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  addAuthStateListener: (listener: AuthStateListener) => () => void;
  isTokenExpired: () => boolean;
  getTokenExpirationTime: () => number | null;
  refreshToken: () => Promise<void>;
}

// Create AuthContext
export const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

// Hook to use AuthContext
export const useAuthContext = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authStateListeners] = useState<Set<AuthStateListener>>(new Set());

  useEffect(() => {
    // Mock authentication check
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setError(err instanceof Error ? err : new Error('Auth check failed'));
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Mock sign in - in real app, call API
        const mockUser: User = {
          id: '1',
          email,
          name: 'Test User',
          profileSetup: true,
        };

        localStorage.setItem('auth_token', 'mock_token');
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('token_expiration', String(Date.now() + 3600000)); // 1 hour

        setUser(mockUser);

        // Notify listeners
        authStateListeners.forEach(listener => listener(true));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign in failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [authStateListeners]
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_expiration');
      setUser(null);

      // Notify listeners
      authStateListeners.forEach(listener => listener(false));
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err instanceof Error ? err : new Error('Sign out failed'));
    }
  }, [authStateListeners]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addAuthStateListener = useCallback(
    (listener: AuthStateListener) => {
      authStateListeners.add(listener);
      return () => {
        authStateListeners.delete(listener);
      };
    },
    [authStateListeners]
  );

  const getTokenExpirationTime = useCallback((): number | null => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const expirationTime = localStorage.getItem('token_expiration');
      return expirationTime ? parseInt(expirationTime, 10) : null;
    } catch (err) {
      console.error('Failed to get token expiration time:', err);
      return null;
    }
  }, []);

  const isTokenExpired = useCallback((): boolean => {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return true;
    return Date.now() >= expirationTime;
  }, [getTokenExpirationTime]);

  const refreshToken = useCallback(async () => {
    try {
      setIsLoading(true);

      // Mock token refresh - in real app, call API
      const newExpiration = Date.now() + 3600000; // 1 hour
      localStorage.setItem('token_expiration', String(newExpiration));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Token refresh failed');
      setError(error);
      // Auto logout on refresh failure
      await signOut();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signOut,
    clearError,
    addAuthStateListener,
    isTokenExpired,
    getTokenExpirationTime,
    refreshToken,
  };
};

export default useAuth;
