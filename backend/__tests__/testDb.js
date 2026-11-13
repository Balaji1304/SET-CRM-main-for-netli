// Tests never use MONGODB_URI: config/cloudinary.js loads .env, which can point at production.
module.exports = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/solar-crm-test';
