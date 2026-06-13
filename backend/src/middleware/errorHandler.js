/**
 * Global Express error handler.
 * Must be registered LAST with app.use() after all routes.
 *
 * Catches any error passed via next(err) and returns a
 * consistent JSON response shape:
 *   { error: "message", ...(dev: stack) }
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
