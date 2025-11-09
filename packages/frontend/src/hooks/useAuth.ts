import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  profileSetup: boolean;
  [key: string]: unknown;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  getTokenExpirationTime: () => number | null;
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

  const signOut = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err instanceof Error ? err : new Error('Sign out failed'));
    }
  };

  const getTokenExpirationTime = (): number | null => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      // Mock implementation - in real app, decode JWT token
      const expirationTime = localStorage.getItem('token_expiration');
      return expirationTime ? parseInt(expirationTime, 10) : null;
    } catch (err) {
      console.error('Failed to get token expiration time:', err);
      return null;
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signOut,
    getTokenExpirationTime,
  };
};

export default useAuth;
