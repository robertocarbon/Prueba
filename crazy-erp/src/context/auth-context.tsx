'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  theme: string;
  language: string;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
}

interface Company {
  id: string;
  name: string;
  role: string;
  lastAccessAt: string | null;
  logo: string | null;
}

interface SelectedCompany {
  id: string;
  name: string;
  cif: string;
  logo: string | null;
  currency: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  companies: Company[];
  selectedCompany: SelectedCompany | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  selectCompany: (companyId: string) => Promise<boolean>;
  switchCompany: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SelectedCompany | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearAuth = useCallback(() => {
    setUser(null);
    setCompanies([]);
    setSelectedCompany(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('selectedCompanyId');
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    clearAuth();
    router.push('/login');
  }, [token, clearAuth, router]);

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    if (savedToken) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      // Fetch user data
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(res => {
          if (!res.ok) throw new Error('Invalid token');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          setCompanies(data.user.companies.map((uc: { company: { id: string; name: string; logo: string | null }; role: string; lastAccessAt: string | null }) => ({
            id: uc.company.id,
            name: uc.company.name,
            role: uc.role,
            lastAccessAt: uc.lastAccessAt,
            logo: uc.company.logo,
          })));
          // Restore company selection
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          if (savedCompanyId) {
            selectCompanyInternal(savedCompanyId, savedToken);
          }
        })
        .catch(() => clearAuth())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCompanyInternal = async (companyId: string, authToken: string) => {
    try {
      const res = await fetch('/api/companies/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setSelectedCompany({ ...data.company, role: data.role });
      localStorage.setItem('selectedCompanyId', companyId);
      return true;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      setCompanies(data.companies);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);

      if (data.user.mustChangePassword) {
        return { success: true, mustChangePassword: true };
      }

      // Auto-select if only one company
      if (data.companies.length === 1) {
        await selectCompanyInternal(data.companies[0].id, data.token);
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const selectCompany = async (companyId: string) => {
    if (!token) return false;
    return selectCompanyInternal(companyId, token);
  };

  const switchCompany = () => {
    setSelectedCompany(null);
    localStorage.removeItem('selectedCompanyId');
    router.push('/select-company');
  };

  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{
      user, companies, selectedCompany, token, isLoading,
      login, logout, selectCompany, switchCompany, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
