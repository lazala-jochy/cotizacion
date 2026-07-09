const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getExecutiveKpis, getAnalytics } = require('../dashboard/dashboardService');
const { getNotifications } = require('../dashboard/notificationsService');
const { getBusinessInsights } = require('../dashboard/insightsService');
const { getPipelineBoard, moveQuoteToStage } = require('../dashboard/pipelineService');
const {
  getSettings,
  updateSettings,
  getAutomationTasks,
} = require('../dashboard/automationService');
const { getClientCrmList, getClientCrmDetail } = require('../dashboard/clientCrmService');

const router = express.Router();
router.use(authMiddleware);

router.get('/executive', (req, res) => {
  res.json(getExecutiveKpis(req.user.id));
});

router.get('/analytics', (req, res) => {
  res.json(getAnalytics(req.user.id));
});

router.get('/notifications', (req, res) => {
  res.json(getNotifications(req.user.id));
});

router.get('/insights', (req, res) => {
  res.json(getBusinessInsights(req.user.id));
});

router.get('/pipeline', (req, res) => {
  res.json(getPipelineBoard(req.user.id));
});

router.patch('/pipeline/:quoteId', (req, res) => {
  try {
    const result = moveQuoteToStage(req.user.id, req.params.quoteId, req.body.stageId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/automations', (req, res) => {
  res.json(getSettings(req.user.id));
});

router.put('/automations', (req, res) => {
  res.json(updateSettings(req.user.id, req.body));
});

router.get('/automations/tasks', (req, res) => {
  res.json(getAutomationTasks(req.user.id));
});

router.get('/clients/crm', (req, res) => {
  res.json(getClientCrmList(req.user.id));
});

router.get('/clients/:id/crm', (req, res) => {
  const detail = getClientCrmDetail(req.user.id, req.params.id);
  if (!detail) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(detail);
});

/** Resumen completo para el dashboard ejecutivo. */
router.get('/summary', (req, res) => {
  res.json({
    kpis: getExecutiveKpis(req.user.id),
    analytics: getAnalytics(req.user.id),
    notifications: getNotifications(req.user.id),
    insights: getBusinessInsights(req.user.id),
    automations: getAutomationTasks(req.user.id),
  });
});

module.exports = router;
