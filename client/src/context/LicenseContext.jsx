import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { moduleForClientPath } from '../licensing/modules';

const LicenseContext = createContext(null);
const BACKGROUND_CHECK_MS = 60 * 60 * 1000;

function isLicenseActive(status) {
  return Boolean(status?.active && status?.productKey);
}

export function LicenseProvider({ children }) {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const applyStatus = useCallback((status) => {
    setLicense(status);
    return status;
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setSyncing(true);

    try {
      const cached = await api.license.status();
      if (!cached.productKey) return applyStatus(cached);

      if (cached.needsSync) {
        try {
          return applyStatus(await api.license.refresh());
        } catch {
          return applyStatus(cached);
        }
      }

      return applyStatus(cached);
    } catch {
      return applyStatus({ active: false, required: true, modules: [], needsSync: false });
    } finally {
      if (!silent) setLoading(false);
      else setSyncing(false);
    }
  }, [applyStatus]);

  const refreshModules = useCallback(async () => {
    setSyncing(true);
    try {
      const status = await api.license.refresh();
      return applyStatus(status);
    } finally {
      setSyncing(false);
    }
  }, [applyStatus]);

  const runBackgroundSync = useCallback(async () => {
    if (!license?.productKey || !license?.needsSync) return;
    try {
      const status = await api.license.syncScheduled();
      applyStatus(status);
    } catch {
      /* mantener caché local */
    }
  }, [license?.productKey, license?.needsSync, applyStatus]);

  useEffect(() => {
    refresh({ silent: false });
  }, [refresh]);

  useEffect(() => {
    if (loading) return undefined;

    runBackgroundSync();
    const timer = window.setInterval(runBackgroundSync, BACKGROUND_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [loading, runBackgroundSync]);

  const activate = async (productKey) => {
    const status = await api.license.activate(productKey);
    return applyStatus(status);
  };

  const deactivate = async () => {
    const status = await api.license.deactivate();
    return applyStatus(status);
  };

  const hasModule = (code) => {
    if (!isLicenseActive(license)) return false;
    return Boolean(license.modules?.includes(code));
  };

  const canAccessPath = (pathname) => {
    const mod = moduleForClientPath(pathname);
    if (!mod) return true;
    return hasModule(mod);
  };

  return (
    <LicenseContext.Provider
      value={{
        license,
        loading,
        syncing,
        refresh,
        refreshModules,
        activate,
        deactivate,
        hasModule,
        canAccessPath,
        isLicensed: isLicenseActive(license),
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error('useLicense debe usarse dentro de LicenseProvider');
  return ctx;
}
