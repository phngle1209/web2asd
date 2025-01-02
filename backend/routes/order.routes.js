import express from "express";
import { getPendingOrders, getOrderDetails, updateOrderStatus } from "../controllers/order.controller.js";
import { protectRoute, sellerRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Lấy danh sách đơn hàng chưa hoàn thành
router.get("/pending", protectRoute, sellerRoute, getPendingOrders);

// Lấy chi tiết đơn hàng
router.get("/:id", protectRoute, sellerRoute, getOrderDetails);

// Cập nhật trạng thái đơn hàng
router.put("/:id/status", protectRoute, sellerRoute, updateOrderStatus);

export default router;
