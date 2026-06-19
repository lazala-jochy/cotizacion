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
  const [licenseNotice, setLicenseNotice] = useState('');

  const applyStatus = useCallback((status) => {
    setLicense(status);
    if (status?.revoked && status?.revokedMessage) {
      setLicenseNotice(status.revokedMessage);
    } else if (isLicenseActive(status)) {
      setLicenseNotice('');
    }
    return status;
  }, []);

  const loadLocal = useCallback(async () => {
    try {
      return applyStatus(await api.license.status());
    } catch {
      return applyStatus({ active: false, required: true, modules: [], needsSync: false });
    }
  }, [applyStatus]);

  const syncWithServer = useCallback(async () => {
    try {
      return applyStatus(await api.license.refresh());
    } catch {
      /* Sin aviso: seguir con caché local */
      return null;
    }
  }, [applyStatus]);

  const runScheduledSync = useCallback(async () => {
    try {
      const status = await api.license.syncScheduled();
      applyStatus(status);
    } catch {
      /* mantener caché local */
    }
  }, [applyStatus]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadLocal();
      if (cancelled) return;
      setLoading(false);
      if (cached?.productKey) {
        syncWithServer();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadLocal, syncWithServer]);

  useEffect(() => {
    if (loading || !license?.productKey) return undefined;

    runScheduledSync();
    const timer = window.setInterval(runScheduledSync, BACKGROUND_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [loading, license?.productKey, runScheduledSync]);

  const refresh = useCallback(async () => loadLocal(), [loadLocal]);

  const refreshModules = useCallback(async () => {
    setSyncing(true);
    try {
      const status = await api.license.refresh();
      return applyStatus(status);
    } finally {
      setSyncing(false);
    }
  }, [applyStatus]);

  const activate = async (productKey) => {
    const status = await api.license.activate(productKey);
    setLicenseNotice('');
    return applyStatus(status);
  };

  const deactivate = async () => {
    const status = await api.license.deactivate();
    setLicenseNotice('');
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
        licenseNotice,
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
