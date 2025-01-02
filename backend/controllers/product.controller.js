import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({}); // find all products
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getFeaturedProducts = async (req, res) => {
	try {
		let featuredProducts = await redis.get("featured_products");
		if (featuredProducts) {
			return res.json(JSON.parse(featuredProducts));
		}

		// if not in redis, fetch from mongodb
		// .lean() is gonna return a plain javascript object instead of a mongodb document
		// which is good for performance
		featuredProducts = await Product.find({ isFeatured: true }).lean();

		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" });
		}

		// store in redis for future quick access

		await redis.set("featured_products", JSON.stringify(featuredProducts));

		res.json(featuredProducts);
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category, brand, countInStock, isFeatured } = req.body;

		let cloudinaryResponse = null;

		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
		}

		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category,
			brand,
			countInStock,
			isFeatured: isFeatured || false,
		});

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateProduct = async (req, res) => {
	try {
		const { id } = req.params; // Lấy ID sản phẩm từ URL
		const { name, description, price, category, brand, countInStock, image, isFeatured } = req.body;

		// Tìm sản phẩm trong database
		const product = await Product.findById(id);
		if (!product) {
			return res.status(404).json({ message: "Sản phẩm không tồn tại" });
		}

		// Nếu có hình ảnh mới, tải lên Cloudinary
		let updatedImageUrl = product.image;
		if (image && image !== product.image) {
			const publicId = product.image.split("/").pop().split(".")[0];
			// Xóa ảnh cũ khỏi Cloudinary
			await cloudinary.uploader.destroy(`products/${publicId}`);
			// Tải ảnh mới lên Cloudinary
			const cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
			updatedImageUrl = cloudinaryResponse.secure_url;
		}

		// Cập nhật thông tin sản phẩm
		product.name = name || product.name;
		product.description = description || product.description;
		product.price = price !== undefined ? price : product.price;
		product.category = category || product.category;
		product.brand = brand || product.brand;
		product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
		product.image = updatedImageUrl;
		product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;

		// Lưu thông tin sản phẩm vào database
		const updatedProduct = await product.save();

		// Cập nhật cache Redis nếu cần
		if (updatedProduct.isFeatured) {
			await updateFeaturedProductsCache();
		}

		res.json({ message: "Cập nhật sản phẩm thành công", product: updatedProduct });
	} catch (error) {
		console.log("Error in updateProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};


export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		if (product.image) {
			const publicId = product.image.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloduinary");
			} catch (error) {
				console.log("error deleting image from cloduinary", error);
			}
		}

		await Product.findByIdAndDelete(req.params.id);

		res.json({ message: "Product deleted successfully" });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getRecommendedProducts = async (req, res) => {
	try {
		const products = await Product.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
					category: 1,
					brand: 1,
				},
			},
		]);

		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const products = await Product.find({ category });
		res.json({ products });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleFeaturedProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			await updateFeaturedProductsCache();
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

async function updateFeaturedProductsCache() {
	try {
		// The lean() method  is used to return plain JavaScript objects instead of full Mongoose documents. This can significantly improve performance

		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts));
	} catch (error) {
		console.log("error in update cache function");
	}
}

export const searchProducts = async (req, res) => {
	try {
		const { keyword } = req.query; // Lấy từ khóa tìm kiếm từ query string

		// Nếu không có từ khóa, trả về danh sách rỗng
		if (!keyword) {
			return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
		}

		// Tạo điều kiện tìm kiếm
		const searchCondition = {
			$or: [
				{ name: { $regex: keyword, $options: "ig" } }, // Tìm theo tên sản phẩm
				{ brand: { $regex: keyword, $options: "ig" } }, // Tìm theo tên thương hiệu
				{ category: { $regex: keyword, $options: "ig" } }, // Tìm theo tên danh mục
			],
		};

		// Tìm kiếm sản phẩm trong MongoDB
		const products = await Product.find(searchCondition);

		res.json({ products });
	} catch (error) {
		console.log("Error in searchProducts controller", error.message);
		res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
	}
};

export const filterProducts = async (req, res) => {
	try {
		const { brand, category, priceRange } = req.query;

		const filterCondition = {};

		// Lọc theo brand
		if (brand) filterCondition.brand = brand;

		// Lọc theo category
		if (category) filterCondition.category = category;

		// Lọc theo mức giá
		if (priceRange) {
			if (priceRange === "below_1_million") {
				filterCondition.price = { $lt: 1000000 };
			} else if (priceRange === "1_to_2_million") {
				filterCondition.price = { $gte: 1000000, $lte: 2000000 };
			} else if (priceRange === "above_2_million") {
				filterCondition.price = { $gt: 2000000 };
			}
		}

		const products = await Product.find(filterCondition);

		res.json({ products });
	} catch (error) {
		res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
	}
};
