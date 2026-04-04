const { HttpError } = require("../utils/http-error");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const payload = {
    error: {
      message:
        statusCode === 500 ? "Internal server error" : error.message,
    },
  };

  if (error instanceof HttpError && error.details !== undefined) {
    payload.error.details = error.details;
  }

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
