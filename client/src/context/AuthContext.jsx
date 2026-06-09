import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthTokens, clearAuthTokens, getRefreshToken as readRefreshToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'));

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');
  }, [refreshToken]);

  useEffect(() => {
    const onTokensRefreshed = (e) => {
      const { accessToken, refreshToken: nextRefresh, token: legacy } = e.detail || {};
      const access = accessToken || legacy;
      if (access) setToken(access);
      if (nextRefresh) setRefreshToken(nextRefresh);
    };
    window.addEventListener('auth:tokens-refreshed', onTokensRefreshed);
    return () => window.removeEventListener('auth:tokens-refreshed', onTokensRefreshed);
  }, []);

  const login = useCallback((userData, authPayload) => {
    const access = authPayload?.accessToken || authPayload?.token;
    const nextRefresh = authPayload?.refreshToken || null;
    setUser(userData);
    setToken(access);
    setRefreshToken(nextRefresh);
    if (access || nextRefresh) {
      setAuthTokens({ accessToken: access, refreshToken: nextRefresh, token: access });
    }
  }, []);

  const logout = useCallback(async () => {
    const rt = readRefreshToken();
    try {
      if (rt) await api.logout({ refreshToken: rt });
    } catch {
      /* ignore */
    }
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    clearAuthTokens();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
