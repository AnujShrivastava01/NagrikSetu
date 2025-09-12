import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  picture?: string;
  sub?: string;
  locale?: string;
  reports?: Array<{
    _id: string;
    type: string;
    status: string;
    severity: string;
    createdAt: string;
  }>;
  stats?: {
    points: number;
    level: string;
    reportsSubmitted: number;
    reportsResolved: number;
    reportsInProgress?: number;
    reportsPending?: number;
    reportsVerified?: number;
    rank?: number;
  };
  googleId?: string;
  avatar?: string;
  isVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
  role: 'admin' | 'user' | null;
  setRole: (role: 'admin' | 'user' | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!user;

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('🔍 Found stored user data:', userData.name, 'Role:', userData.role);
            
            // Set user data immediately for better UX
            setUser(userData);
            setRole(userData.role);
            
            // Verify token with backend in background
            try {
              const response = await api.post('/auth/validate', { token });
              console.log('✅ Token validated successfully');
              
              // Update user data if needed
              if (response.data.user) {
                const updatedUser = response.data.user;
                console.log('🔄 Updating user data:', updatedUser.name, 'Role:', updatedUser.role);
                setUser(updatedUser);
                setRole(updatedUser.role);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } catch (error) {
              console.error('❌ Token validation failed:', error);
              // Try to refresh token before giving up
              const refreshToken = localStorage.getItem('refreshToken');
              if (refreshToken) {
                try {
                  console.log('🔄 Attempting token refresh...');
                  const refreshResponse = await api.post('/auth/refresh', { refreshToken });
                  if (refreshResponse.data.success) {
                    console.log('✅ Token refreshed successfully');
                    localStorage.setItem('accessToken', refreshResponse.data.data.accessToken);
                    localStorage.setItem('refreshToken', refreshResponse.data.data.refreshToken);
                    // Retry validation with new token
                    const validateResponse = await api.post('/auth/validate', { 
                      token: refreshResponse.data.data.accessToken 
                    });
                    if (validateResponse.data.user) {
                      const updatedUser = validateResponse.data.user;
                      setUser(updatedUser);
                      setRole(updatedUser.role);
                      localStorage.setItem('user', JSON.stringify(updatedUser));
                      return; // Success, don't clear storage
                    }
                  }
                } catch (refreshError) {
                  console.error('❌ Token refresh failed:', refreshError);
                }
              }
              
              // If refresh failed or no refresh token, clear storage gracefully
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              setUser(null);
              setRole(null);
            }
          } catch (error) {
            console.error('❌ Invalid stored user data:', error);
            // Invalid stored user data, clear storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setRole(null);
          }
        } else {
          console.log('🔍 No token or user data found in localStorage');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    // Handle token expiration events
    const handleTokenExpired = () => {
      console.log('🔔 Token expired event received');
      setUser(null);
      setRole(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    };

    // Handle browser close/refresh events
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Don't clear session data on browser close
      // This allows users to stay logged in when they return
      console.log('🔒 Browser closing - preserving session data');
    };

    // Periodic token refresh to keep session alive
    const setupTokenRefresh = () => {
      const refreshInterval = setInterval(async () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (token && refreshToken && user) {
          try {
            // Check if token is close to expiry (refresh every 6 hours)
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            const timeUntilExpiry = tokenData.exp - now;
            
            // If token expires in less than 2 hours, refresh it
            if (timeUntilExpiry < 7200) {
              console.log('🔄 Proactively refreshing token...');
              const response = await api.post('/auth/refresh', { refreshToken });
              if (response.data.success) {
                localStorage.setItem('accessToken', response.data.data.accessToken);
                localStorage.setItem('refreshToken', response.data.data.refreshToken);
                console.log('✅ Token refreshed proactively');
              }
            }
          } catch (error) {
            console.warn('Proactive token refresh failed:', error);
          }
        }
      }, 30 * 60 * 1000); // Check every 30 minutes
      
      return refreshInterval;
    };

    // Listen for token expiration events
    window.addEventListener('auth:token-expired', handleTokenExpired);
    window.addEventListener('beforeunload', handleBeforeUnload);

    initializeAuth();
    
    // Setup token refresh after auth is initialized
    const refreshInterval = setupTokenRefresh();

    // Cleanup event listeners and intervals
    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(refreshInterval);
    };
  }, []);

  const logout = async () => {
    console.log('🚪 Logging out user');
    
    try {
      // Call backend logout if we have a token
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token && user?._id) {
        try {
          await api.post('/auth/logout', { 
            refreshToken: refreshToken 
          });
        } catch (error) {
          console.warn('Backend logout failed:', error);
          // Continue with local logout even if backend fails
        }
      }
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      // Always clear local state and storage
      setUser(null);
      setRole(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('nagriksetu')) {
              caches.delete(name);
            }
          });
        });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      isAuthenticated, 
      logout, 
      role, 
      setRole,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 