import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '../services/dashboardApi';

export function useDashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    return dashboardApi
      .summary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useNotifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return dashboardApi
      .notifications()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}

export function usePipeline() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    return dashboardApi
      .pipeline()
      .then(setBoard)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const moveQuote = useCallback(
    async (quoteId, stageId) => {
      await dashboardApi.movePipeline(quoteId, stageId);
      await reload();
    },
    [reload]
  );

  return { board, loading, error, reload, moveQuote };
}

export function useClientsCrm() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    return dashboardApi
      .clientsCrm()
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { clients, loading, error, reload };
}

export function useAutomations() {
  const [settings, setSettings] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    return Promise.all([dashboardApi.automations(), dashboardApi.automationTasks()])
      .then(([s, t]) => {
        setSettings(s);
        setTasks(t.tasks || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (body) => {
      setSaving(true);
      try {
        const updated = await dashboardApi.updateAutomations(body);
        setSettings(updated);
        const t = await dashboardApi.automationTasks();
        setTasks(t.tasks || []);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { settings, tasks, loading, saving, reload, save };
}
