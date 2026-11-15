const serverError = require('./serverError');

// Errors while saving data an admin sent: explain what was wrong with the input (400),
// but anything else (e.g. the database going away) is our fault, so it's a logged 500
module.exports = function inputError(req, res, err) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(' ') });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  return serverError(req, res, err);
};
