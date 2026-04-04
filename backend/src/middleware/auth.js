const { verifyAccessToken } = require("../services/auth.service");
const { unauthorized } = require("../utils/http-error");

async function requireAuth(req, res, next) {
  const headerValue = req.headers.authorization || "";
  const token = headerValue.startsWith("Bearer ")
    ? headerValue.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return next(unauthorized("Authorization header is missing or invalid"));
  }

  try {
    req.accessToken = token;
    req.currentUser = await verifyAccessToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAuth,
};
