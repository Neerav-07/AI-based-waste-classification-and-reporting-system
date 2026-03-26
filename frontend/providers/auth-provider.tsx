import type { AuthUser, UserRole } from '@/types/app';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';

interface AuthContextValue {
  user: AuthUser | null;
  login: (role: UserRole, name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value: AuthContextValue = {
    user,
    login: (role, name, email) => {
      setUser({
        role,
        name: name.trim(),
        email: email.trim(),
      });
    },
    logout: () => {
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
