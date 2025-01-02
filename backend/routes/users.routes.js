import express from "express";
import {
	getAllUsers,
	deleteUser,
	updateUserByAdmin,
	updateUserProfile,
} from "../controllers/users.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Route cho admin
router.get("/", protectRoute, adminRoute, getAllUsers); // Admin xem danh sách người dùng
router.delete("/:id", protectRoute, adminRoute, deleteUser); // Admin xóa người dùng
router.put("/:id", protectRoute, adminRoute, updateUserByAdmin); // Admin chỉnh sửa người dùng

// Route cho user
router.put("/profile", protectRoute, updateUserProfile); // User chỉnh sửa thông tin cá nhân

export default router;
