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
              // Token invalid, clear storage
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

    initializeAuth();
  }, []);

  const logout = () => {
    console.log('🚪 Logging out user');
    setUser(null);
    setRole(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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