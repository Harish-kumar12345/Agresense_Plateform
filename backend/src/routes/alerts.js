const express = require('express');
const router = express.Router();
const alertEngine = require('../services/alertEngine');
const { requireAuth, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/alerts/evaluate
 * Evaluates live telemetry and generates deduplicated smart alerts
 */
router.post('/evaluate', optionalAuth, async (req, res) => {
  try {
    const telemetry = req.body || {};
    const alerts = await alertEngine.evaluateTelemetry(telemetry);
    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error evaluating smart alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to evaluate smart alerts', error: error.message });
  }
});

/**
 * GET /api/alerts
 * Retrieves active smart alerts
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {
      farm_id: req.query.farm_id,
      severity: req.query.severity,
      alert_type: req.query.alert_type,
      status: req.query.status
    };
    const alerts = await alertEngine.getAlerts(filter);
    const unreadCount = alerts.filter(a => a.status === 'unread').length;

    res.json({
      success: true,
      unreadCount,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error fetching smart alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch smart alerts', error: error.message });
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Marks single alert as read
 */
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const updated = await alertEngine.markAsRead(req.params.id);
    res.json({ success: true, alert: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark alert as read' });
  }
});

/**
 * PATCH /api/alerts/read-all
 * Marks all alerts as read
 */
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const farmId = req.body?.farm_id || req.query.farm_id;
    await alertEngine.markAllAsRead(farmId);
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark all alerts as read' });
  }
});

/**
 * DELETE /api/alerts/:id
 * Dismisses / deletes an alert
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await alertEngine.deleteAlert(req.params.id);
    res.json({ success: true, message: 'Alert dismissed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to dismiss alert' });
  }
});

module.exports = router;
