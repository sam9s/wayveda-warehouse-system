const { forbidden } = require("../utils/http-error");

function authorize(...roles) {
  return function authorizeByRole(req, res, next) {
    if (!req.currentUser) {
      return next(forbidden("Authenticated user context is missing"));
    }

    if (req.currentUser.role === "system_admin") {
      return next();
    }

    if (!roles.includes(req.currentUser.role)) {
      return next(
        forbidden(
          `This action requires one of the following roles: ${roles.join(", ")}`
        )
      );
    }

    return next();
  };
}

module.exports = {
  authorize,
};
