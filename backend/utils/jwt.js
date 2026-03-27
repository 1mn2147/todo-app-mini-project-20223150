const jwt = require('jsonwebtoken');

const { unauthorized } = require('./errors');
const { getRequiredEnvValue } = require('./env');

function signAuthToken(payload, options = {}) {
  return jwt.sign(payload, getRequiredEnvValue('JWT_SECRET'), options);
}

function verifyAuthToken(token, options = {}) {
  try {
    return jwt.verify(token, getRequiredEnvValue('JWT_SECRET'), options);
  } catch (error) {
    throw unauthorized('Invalid or expired bearer token');
  }
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    throw unauthorized('Authorization header is required');
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Authorization header must use Bearer token');
  }

  return token;
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
  extractBearerToken,
};
