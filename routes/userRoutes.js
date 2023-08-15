const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.protect, authController.logout);

router.route("/").get(authController.protect, userController.getAllUsers);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

module.exports = router;
