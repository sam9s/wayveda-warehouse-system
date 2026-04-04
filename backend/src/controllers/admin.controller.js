const adminService = require("../services/admin.service");

async function listUsers(req, res) {
  const users = await adminService.listUsers();
  res.status(200).json({ users });
}

async function createUser(req, res) {
  const user = await adminService.createUser(req.body || {}, req.currentUser);
  res.status(201).json({ user });
}

async function listAuditLog(req, res) {
  const rows = await adminService.listAuditLog(req.query || {});
  res.status(200).json({ rows });
}

module.exports = {
  createUser,
  listAuditLog,
  listUsers,
};
