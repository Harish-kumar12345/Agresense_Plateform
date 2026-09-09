const express = require('express');
const router = express.Router();

const {
  validateOfficer,
  listOfficerQueries,
  resolveOfficerQuery,
  broadcastDistrictAlert,
  getOfficerFarmsOverview,
  listAuditLogs,
  createAuditLogEntry,
  getOfficerAlertPreferences,
  updateOfficerAlertPreferences
} = require('../controllers/officerController');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/officer/validate — verify officer credentials (public during login flow)
router.post('/validate', validateOfficer);

// GET & PUT /api/officer/queries — officer-only: list and resolve farmer queries
router.get('/queries', requireAuth, requireRole('officer'), listOfficerQueries);
router.put('/queries/:id/resolve', requireAuth, requireRole('officer'), resolveOfficerQuery);

// POST /api/officer/broadcast-alert — dispatch emergency advisory to district or all farms
router.post('/broadcast-alert', requireAuth, requireRole('officer'), broadcastDistrictAlert);

// GET /api/officer/farms-overview — officer-only: aggregated farm data
router.get('/farms-overview', requireAuth, requireRole('officer'), getOfficerFarmsOverview);

// GET & POST /api/officer/audit-logs — officer-only append-only audit trail
router.get('/audit-logs', requireAuth, requireRole('officer'), listAuditLogs);
router.post('/audit-logs', requireAuth, requireRole('officer'), createAuditLogEntry);

// GET & PUT /api/officer/alert-preferences — officer alert delivery configuration
router.get('/alert-preferences', requireAuth, requireRole('officer'), getOfficerAlertPreferences);
router.put('/alert-preferences', requireAuth, requireRole('officer'), updateOfficerAlertPreferences);

module.exports = router;
