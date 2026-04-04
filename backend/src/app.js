const fs = require("node:fs");
const path = require("node:path");
const cors = require("cors");
const express = require("express");
const { appConfig } = require("./config/app-config");
const apiRoutes = require("./routes");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error-handler");

const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

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

  app.use("/api", apiRoutes);

  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        return next();
      }

      return res.sendFile(path.join(frontendDistPath, "index.html"));
    });
  } else {
    app.get("/", (req, res) => {
      res.status(200).json({
        service: appConfig.appName,
        status: "ok",
        version: appConfig.appVersion,
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
