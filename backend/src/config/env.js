const path = require("path");
const dotenv = require("dotenv");

let envLoaded = false;

function candidateEnvFiles() {
  const files = [];

  if (process.env.ENV_FILE) {
    files.push(path.resolve(process.cwd(), process.env.ENV_FILE));
  }

  files.push(path.resolve(process.cwd(), ".env"));
  files.push(path.resolve(__dirname, "../../.env"));

  return [...new Set(files)];
}

function loadEnv() {
  if (envLoaded) {
    return;
  }

  for (const filePath of candidateEnvFiles()) {
    dotenv.config({ path: filePath, override: false });
  }

  envLoaded = true;
}

function getEnvOrThrow(name) {
  loadEnv();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  getEnvOrThrow,
  loadEnv,
};
