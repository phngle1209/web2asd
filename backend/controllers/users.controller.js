import User from '../models/user.model.js';
import cloudinary from "../lib/cloudinary.js";

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, "-password"); // Không trả về trường password
        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        await user.remove();
        res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

export const updateUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Admin có quyền cập nhật tất cả các trường, trừ password
        user.name = req.body.name || user.name;
        user.first_name = req.body.first_name || user.first_name;
        user.last_name = req.body.last_name || user.last_name;
        user.email = req.body.email || user.email;

        // Xử lý avatar nếu có thay đổi
        if (req.body.avatar) {
            // Xóa avatar cũ trên Cloudinary nếu tồn tại
            if (user.avatar) {
                const publicId = user.avatar.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`users/${publicId}`);
            }

            // Tải avatar mới lên Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(req.body.avatar, {
                folder: "users",
            });
            user.avatar = uploadResponse.secure_url;
        }

        user.role = req.body.role || user.role;

        const updatedUser = await user.save();
        res.json({ message: "Cập nhật thông tin người dùng thành công", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};


export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Chỉ cho phép cập nhật các trường được phép
        user.name = req.body.name || user.name;
        user.first_name = req.body.first_name || user.first_name;
        user.last_name = req.body.last_name || user.last_name;

        // Xử lý avatar nếu có thay đổi
        if (req.body.avatar) {
            // Xóa avatar cũ trên Cloudinary nếu tồn tại
            if (user.avatar) {
                const publicId = user.avatar.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`users/${publicId}`);
            }

            // Tải avatar mới lên Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(req.body.avatar, {
                folder: "users",
            });
            user.avatar = uploadResponse.secure_url;
        }

        const updatedUser = await user.save();
        res.json({ message: "Cập nhật thông tin cá nhân thành công", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};
