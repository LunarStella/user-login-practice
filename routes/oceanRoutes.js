const express = require("express");
const oceanController = require("./../controllers/oceanController");
const authController = require("./../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, oceanController.getAllOceans)
  .post(authController.protect, oceanController.createOcean);

module.exports = router;
