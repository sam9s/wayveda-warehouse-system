const authService = require("../services/auth.service");

async function login(req, res) {
  const result = await authService.login(req.body || {});
  res.status(200).json(result);
}

async function me(req, res) {
  res.status(200).json({
    user: req.currentUser,
  });
}

async function changePassword(req, res) {
  const result = await authService.changePassword(req.currentUser, req.body || {});
  res.status(200).json(result);
}

async function logout(req, res) {
  const result = await authService.logout(req.accessToken, req.body?.scope);
  res.status(200).json(result);
}

module.exports = {
  changePassword,
  login,
  logout,
  me,
};
