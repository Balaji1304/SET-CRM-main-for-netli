const config = {
    mongoURI: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    clientURL: process.env.CLIENT_URL || 'http://localhost:3000'
  };
  
  module.exports = config;