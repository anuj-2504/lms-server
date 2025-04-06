import express from "express";
import { getUserProfile, login, logout, register, updateProfile } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js"; // ✅ Uses 'middlewares' folder
import upload from "../utils/multer.js";

const router = express.Router();

// Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);

// Profile Routes
router.get("/profile", isAuthenticated, getUserProfile);
router.put("/profile/update", isAuthenticated, upload.single("profilePhoto"), updateProfile); // ✅ Correct order

export default router;
