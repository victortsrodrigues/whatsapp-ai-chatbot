import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../interfaces';
import logger from '../utils/logger';

/**
 * Central error handling middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default status code and error message
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = undefined;
  
  // If this is a known API error with status code
  if ('statusCode' in err && err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError') {
    // Handle JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON payload';
  } else if (err.name === 'ValidationError') {
    // Handle validation errors
    statusCode = 400;
    message = err.message;
  }
  
  // Log the error with appropriate level
  if (statusCode >= 500) {
    logger.error(`Error: ${err.message}`, { 
      statusCode,
      stack: err.stack,
      path: req.path
    });
  } else {
    logger.warn(`Client error: ${err.message}`, { 
      statusCode,
      path: req.path
    });
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      details: details || undefined,
      status: statusCode
    }
  });
};

/**
 * Handle 404 errors - must be placed after all routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  
  res.status(404).json({
    error: {
      message: `Not found: ${req.method} ${req.path}`,
      status: 404
    }
  });
};