const mongoose = require('mongoose');

const { AppError, badRequest, conflict, internalServerError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: badRequest('Invalid resource identifier').message });
  }

  if (err && err.code === 11000) {
    return res.status(409).json({ message: conflict('Resource already exists').message });
  }

  console.error(err);
  return res.status(500).json({ message: internalServerError().message });
}

module.exports = {
  errorHandler,
};
