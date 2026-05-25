const PORT = 3847;

module.exports = {
  PORT,
  JWT_SECRET: process.env.JWT_SECRET || 'cotizaciones-app-dev-secret-change-in-prod',
  JWT_EXPIRES: '7d',
  BASE_URL: process.env.BASE_URL || `http://127.0.0.1:${PORT}`,
};
