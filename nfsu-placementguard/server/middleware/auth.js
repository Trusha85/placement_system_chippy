/**
 * Authentication and RBAC Middleware
 * Enforces server-side authorization on every protected API endpoint.
 */

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in with a valid session to access this resource.'
    });
  }
  next();
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be logged in with a valid session.'
      });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access Denied',
        message: `Role '${userRole}' is not authorized to perform this operation. Required: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

export function validateOrigin(req, res, next) {
  // Safe methods don't mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer;
  // If Origin or Referer is present, verify against allowed hosts (local Vite dev or host)
  if (origin) {
    try {
      const url = new URL(origin);
      const allowedHosts = ['localhost', '127.0.0.1'];
      if (!allowedHosts.includes(url.hostname)) {
        return res.status(403).json({
          error: 'Cross-Site Request Forgery Blocked',
          message: 'Origin header does not match permitted local domains.'
        });
      }
    } catch {
      return res.status(400).json({ error: 'Malformed Origin or Referer header' });
    }
  }

  next();
}
