const express = require('express');
const router = express.Router();

const { validateOfficer, listOfficerQueries, getOfficerFarmsOverview } = require('../controllers/officerController');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/officer/validate — verify officer credentials (public during login flow)
router.post('/validate', validateOfficer);

// GET /api/officer/queries — officer-only: list farmer queries
router.get('/queries', requireAuth, requireRole('officer'), listOfficerQueries);

// GET /api/officer/farms-overview — officer-only: aggregated farm data
router.get('/farms-overview', requireAuth, requireRole('officer'), getOfficerFarmsOverview);

module.exports = router;
