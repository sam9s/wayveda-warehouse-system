const cors = require("cors");
const express = require("express");
const { appConfig } = require("./config/app-config");
const apiRoutes = require("./routes");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error-handler");

function corsOptions() {
  if (!appConfig.corsOrigins.length) {
    return {};
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || appConfig.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  };
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (req, res) => {
    res.status(200).json({
      service: appConfig.appName,
      status: "ok",
      version: appConfig.appVersion,
    });
  });

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
