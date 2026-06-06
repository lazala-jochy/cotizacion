const { moduleForApiPath } = require('../licensing/modules');
const { hasModule, hasValidLicense } = require('../licensing/licenseService');

function requireModuleMiddleware(req, res, next) {
  if (!hasValidLicense()) return next();

  const moduleCode = moduleForApiPath(req.path);
  if (!moduleCode) return next();

  if (!hasModule(moduleCode)) {
    return res.status(403).json({
      error: `Módulo no licenciado: ${moduleCode}`,
      module: moduleCode,
      code: 'MODULE_NOT_LICENSED',
    });
  }
  next();
}

module.exports = { requireModuleMiddleware };
