module.exports = {
  PORT: 3847,
  JWT_SECRET: process.env.JWT_SECRET || 'altitude-cotizaciones-dev-secret-change-in-prod',
  JWT_EXPIRES: '7d',
  EMISOR: {
    nombre: 'ALTITUDE CONSULTING',
    rnc: '04900920846',
    direccion: 'av princial, la mata, cotui, rd',
    telefono: '849-405-8727',
    email: 'jochylazala@gmail.com',
  },
};
