const productsService = require("../services/products.service");

async function listProducts(req, res) {
  const products = await productsService.listProducts({
    includeInactive: req.query.includeInactive === "true",
  });

  res.status(200).json({ products });
}

async function getProduct(req, res) {
  const product = await productsService.getProductById(req.params.id);
  res.status(200).json({ product });
}

async function createProduct(req, res) {
  const product = await productsService.createProduct(req.body || {}, req.currentUser);
  res.status(201).json({ product });
}

async function updateProduct(req, res) {
  const product = await productsService.updateProduct(
    req.params.id,
    req.body || {},
    req.currentUser
  );
  res.status(200).json({ product });
}

async function deleteProduct(req, res) {
  const product = await productsService.softDeleteProduct(
    req.params.id,
    req.currentUser
  );
  res.status(200).json({ product });
}

async function getDeleteReadiness(req, res) {
  const readiness = await productsService.getProductDeleteReadiness(req.params.id);
  res.status(200).json({ readiness });
}

async function hardDeleteProduct(req, res) {
  const result = await productsService.hardDeleteProduct(
    req.params.id,
    req.currentUser
  );
  res.status(200).json(result);
}

module.exports = {
  createProduct,
  deleteProduct,
  getProduct,
  getDeleteReadiness,
  hardDeleteProduct,
  listProducts,
  updateProduct,
};
