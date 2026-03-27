const { extractBearerToken, verifyAuthToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.get('Authorization'));
    req.auth = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth,
};
