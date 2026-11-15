// Unexpected server errors: log the details for us, send the player a plain message.
// Raw error text can reveal internals (database names, query shapes, stack hints).
module.exports = function serverError(req, res, err) {
  console.error(`[error] 500 ${req.method} ${req.originalUrl}:`, err?.stack || err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};
