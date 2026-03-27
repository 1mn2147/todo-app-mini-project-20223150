function getMissingEnvKeys(env) {
  return ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !env[key]);
}

function getRequiredEnvValue(key, env = process.env) {
  if (!env[key]) {
    const error = new Error(`Missing required environment variables: ${key}`);
    error.statusCode = 500;
    throw error;
  }

  return env[key];
}

function validateEnv(env = process.env) {
  const missingKeys = getMissingEnvKeys(env);

  if (missingKeys.length > 0) {
    const error = new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }

  return {
    mongodbUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    port: env.PORT || 5000,
  };
}

module.exports = {
  getRequiredEnvValue,
  validateEnv,
};
