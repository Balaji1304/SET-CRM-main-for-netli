/**
 * Custom Error Class with HTTP status code
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware for asynchronous controller functions
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
const errorHandler = (res, error) => {
  console.error('Error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: messages.join(', ')
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: `Resource not found with id: ${error.value}`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token. Please log in again.'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your token has expired. Please log in again.'
    });
  }

  // Custom AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = {
  errorHandler,
  AppError
}; 