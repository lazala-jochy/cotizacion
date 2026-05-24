module.exports = {
  PORT: 3847,
  JWT_SECRET: process.env.JWT_SECRET || 'cotizaciones-app-dev-secret-change-in-prod',
  JWT_EXPIRES: '7d',
};
