const jwt = require('jsonwebtoken');

/**
 * requireAuth — Verify JWT from Authorization header.
 * Attaches decoded payload to req.user ({ sub, role, isVerified }).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded; // { sub, role, isVerified, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * requireRole(...roles) — middleware factory that gates a route to specific roles.
 *
 * Usage:
 *   router.get('/admin', requireAuth, requireRole('officer'), handler)
 *   router.get('/any',   requireAuth, requireRole('farmer', 'officer'), handler)
 *
 * Also enforces isVerified for officers so unverified accounts cannot access
 * officer-only routes even if they somehow have a token.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This route requires role: ${roles.join(' or ')}.`,
        code: 'FORBIDDEN_ROLE'
      });
    }

    // Additional guard: officer role requires isVerified
    if (req.user.role === 'officer' && !req.user.isVerified) {
      return res.status(403).json({
        error: 'Your officer account is pending admin approval.',
        code: 'OFFICER_PENDING'
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
