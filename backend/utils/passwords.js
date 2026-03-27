const bcrypt = require('bcryptjs');

function hashPassword(password, saltRounds = 10) {
  return bcrypt.hash(password, saltRounds);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
