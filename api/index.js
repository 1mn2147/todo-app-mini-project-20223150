// Vercel serverless function wrapper for the existing Express app
// Keeps backend logic unchanged; just exposes the exported `app` as a
// Vercel-compatible request handler.
const backend = require('../backend/index');
const handler = backend && backend.handleRequest ? backend.handleRequest : backend;

module.exports = (req, res) => {
  return handler(req, res);
};
