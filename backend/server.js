const { createApp } = require("./src/app");
const { appConfig } = require("./src/config/app-config");
const { closePool } = require("./src/db/client");

const app = createApp();
const server = app.listen(appConfig.port, () => {
  console.log(
    `${appConfig.appName} listening on port ${appConfig.port} (${appConfig.appEnv})`
  );
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await closePool();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
