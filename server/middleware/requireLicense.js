const { hasValidLicense } = require('../licensing/licenseService');

/** Sin licencia: auth, empresa, licencia y salud. El resto requiere product key activo. */
const OPEN_API_PREFIXES = [
  '/api/license',
  '/api/public',
  '/api/health',
  '/api/auth',
  '/api/emisor',
  '/api/fiscal',
];

function requireLicenseMiddleware(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  if (OPEN_API_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
    return next();
  }
  if (!hasValidLicense()) {
    return res.status(403).json({
      error: 'Debe activar una licencia antes de usar la aplicación',
      code: 'LICENSE_REQUIRED',
    });
  }
  next();
}

module.exports = { requireLicenseMiddleware };
