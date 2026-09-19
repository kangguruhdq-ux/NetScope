import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (fullName: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('netscope_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('netscope_access_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    try {
      if (token) {
        const userData = await api.getMe();
        setUser(userData);
        localStorage.setItem('netscope_user', JSON.stringify(userData));
      }
    } catch (_) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('netscope-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('netscope-unauthorized', handleUnauthorized);
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await api.login(usernameOrEmail, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('netscope_access_token', res.access_token);
    localStorage.setItem('netscope_refresh_token', res.refresh_token);
    localStorage.setItem('netscope_user', JSON.stringify(res.user));
  };

  const register = async (fullName: string, username: string, email: string, password: string) => {
    const res = await api.register({
      full_name: fullName,
      username,
      email,
      password,
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('netscope_access_token', res.access_token);
    localStorage.setItem('netscope_refresh_token', res.refresh_token);
    localStorage.setItem('netscope_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('netscope_access_token');
    localStorage.removeItem('netscope_refresh_token');
    localStorage.removeItem('netscope_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUserData,
      }}
    >
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
