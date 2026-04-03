import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

// 1. Types matched to your FastAPI response
type User = {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

type AuthCredentials = {
  email: string;
  password: string;
};

type SignupPayload = AuthCredentials & {
  name: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 2. Storage Helpers with platform guards to prevent "Not a function" errors
const setToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('userToken', token);
  } else {
    await SecureStore.setItemAsync('userToken', token);
  }
};

const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  } else {
    return await SecureStore.getItemAsync('userToken');
  }
};

const deleteToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('userToken');
  } else {
    // Check if available to prevent crash on web
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) await SecureStore.deleteItemAsync('userToken');
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Robust Auth Check
  const checkAuth = async () => {
    setIsLoading(true); 
    try {
      const token = await getToken();
      if (token) {
        // Explicitly set header for this request
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('Auth check failed or session expired');
      await deleteToken();
      setUser(null);
    } finally {
      setIsLoading(false); // Ensure app stops loading even on failure
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 4. Login fixed for FastAPI OAuth2 Form requirements
  async function fetchProfile(accessToken: string) {
    const profileResponse = await api.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setUser(profileResponse.data);
    return profileResponse.data;
  }

  const login = async ({ email, password }: AuthCredentials) => {
    const safeEmail = email.trim();
    const safePassword = password.trim();
    const body = `username=${encodeURIComponent(safeEmail)}&password=${encodeURIComponent(safePassword)}`;

    try {
      const response = await api.post('/auth/login', body, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
      });

      const { access_token } = response.data;
      await setToken(access_token); 
      return fetchProfile(access_token);
    } catch (error: any) {
      console.error("Login Error:", error.response?.data || error.message);
      throw error; 
    }
  };

  const signup = async ({ name, email, password }: SignupPayload) => {
    try {
      await api.post('/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: 'user',
      });

      return await login({ email, password });
    } catch (error: any) {
      console.error("Signup Error:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    await deleteToken();
    setUser(null);
  };

  // 5. The Return statement that prevents the White Screen
  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
