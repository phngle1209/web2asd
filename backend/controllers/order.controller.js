import Order from "../models/order.model.js";

// Lấy danh sách đơn hàng chưa hoàn thành
export const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: "Pending" })
            .populate("user", "name email")
            .populate("products.product", "name price");
        res.json({ orders });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

// Lấy chi tiết một đơn hàng
export const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("user", "name email")
            .populate("products.product", "name price");

        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        res.json({ order });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID đơn hàng từ URL
        const { status } = req.body; // Lấy trạng thái mới từ body request

        // Kiểm tra trạng thái có hợp lệ không
        const validStatuses = ["Completed", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        // Tìm đơn hàng theo ID
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        // Cập nhật trạng thái đơn hàng
        order.status = status;
        const updatedOrder = await order.save();

        res.json({ message: "Cập nhật trạng thái đơn hàng thành công", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};
