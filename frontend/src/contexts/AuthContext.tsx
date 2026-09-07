import React, { createContext, useContext, useEffect, useState } from 'react'

const API_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001'

interface User {
  id: string
  email?: string
  name?: string
  role?: string
  isGuest?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  continueAsGuest: () => void
  getAuthHeaders: () => Record<string, string>
}

const AuthContext = createContext(undefined)

/** Helper: return auth headers if a token exists */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('agrisense_token');
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify stored token with /me endpoint
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('agrisense_token');

      // Check for guest user
      const savedUser = localStorage.getItem('agrisense_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.isGuest) {
            setUser(parsed);
            setLoading(false);
            return;
          }
        } catch (e) {}
      }

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role
          });
        } else {
          // Token expired or invalid — clear it
          localStorage.removeItem('agrisense_token');
          localStorage.removeItem('agrisense_user');
        }
      } catch (err) {
        // Server unreachable — fall back to cached user
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try { localStorage.setItem('agrisense_user', JSON.stringify(user)); } catch (e) {}
    } else {
      try { localStorage.removeItem('agrisense_user'); } catch (e) {}
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (networkErr) {
      throw new Error('Cannot reach server. Please check if the backend is running.');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('agrisense_token', data.token);

    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role
    });
  };

  const signup = async (email: string, password: string, name: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
    } catch (networkErr) {
      throw new Error('Cannot reach server. Please check if the backend is running.');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    localStorage.setItem('agrisense_token', data.token);

    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role
    });
  };

  const logout = async () => {
    try {
      localStorage.removeItem('agrisense_user');
      localStorage.removeItem('agrisense_token');
      localStorage.removeItem('agrisense_guest_user');
    } catch (e) {}
    setUser(null);
  };

  const continueAsGuest = () => {
    const guestUser: User = {
      id: 'guest-' + Math.random().toString(36).slice(2),
      name: 'Guest User',
      isGuest: true
    };
    setUser(guestUser);
  };

  const isGuest = user?.isGuest || false;

  const value = {
    user,
    loading,
    isGuest,
    login,
    signup,
    logout,
    continueAsGuest,
    getAuthHeaders
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
