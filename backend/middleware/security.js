const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Standard security headers. CSP is left to the frontend host (Netlify) since this is a JSON API.
const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// Brute-force protection for login/registration: 20 failed attempts per IP per 15 minutes.
// Successful logins are not counted, so an office sharing one IP isn't locked out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' }
});

// General API limit to blunt scraping/abuse: 1000 requests per IP per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});

/**
 * Remove MongoDB operator keys ($gt, $ne, $where, ...) from
 * user input so values like {"email": {"$ne": null}} can't change query logic.
 */
const stripOperators = (value, depth = 0) => {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(v => stripOperators(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      delete value[key];
    } else {
      value[key] = stripOperators(value[key], depth + 1);
    }
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) stripOperators(req.body);
  if (req.query) stripOperators(req.query);
  if (req.params) stripOperators(req.params);
  next();
};

module.exports = { securityHeaders, authLimiter, apiLimiter, sanitizeInput };
