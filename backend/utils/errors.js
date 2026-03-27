class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

function badRequest(message) {
  return new AppError(400, message);
}

function unauthorized(message = 'Unauthorized') {
  return new AppError(401, message);
}

function notFound(message) {
  return new AppError(404, message);
}

function conflict(message) {
  return new AppError(409, message);
}

function internalServerError(message = 'Internal server error') {
  return new AppError(500, message);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  internalServerError,
};
