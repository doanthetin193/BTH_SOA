import Order from "../models/Order.js";
import { getServiceAddress } from "../config/consul.js";

// Hàm lấy địa chỉ Product Service từ Consul
const getProductServiceUrl = async () => {
    try {
        return await getServiceAddress('product-service');
    } catch (err) {
        return process.env.PRODUCT_SERVICE || 'http://localhost:4001';
    }
};

// Hàm kiểm tra sản phẩm từ Product Service
const checkProductAvailability = async (productId, requestedQuantity) => {
    try {
        const PRODUCT_SERVICE = await getProductServiceUrl();
        const response = await fetch(`${PRODUCT_SERVICE}/api/products/${productId}`);
        
        if (!response.ok) {
            return { available: false, message: 'Product not found' };
        }
        
        const product = await response.json();
        
        if (product.quantity < requestedQuantity) {
            return { 
                available: false, 
                message: `Insufficient stock. Available: ${product.quantity}` 
            };
        }
        
        return { 
            available: true, 
            product: {
                id: product._id,
                name: product.name,
                price: product.price,
                availableQuantity: product.quantity
            }
        };
    } catch (error) {
        console.error('Error checking product availability:', error);
        return { available: false, message: 'Product service unavailable' };
    }
};

// Hàm cập nhật số lượng sản phẩm trong Product Service
const updateProductQuantity = async (productId, quantityChange, userId, username) => {
    try {
        const PRODUCT_SERVICE = await getProductServiceUrl();
        
        // Lấy thông tin sản phẩm hiện tại
        const getResponse = await fetch(`${PRODUCT_SERVICE}/api/products/${productId}`, {
            headers: { 
                'x-user-id': userId,
                'x-username': username
            }
        });
        
        if (!getResponse.ok) return { success: false };
        
        const product = await getResponse.json();
        const newQuantity = product.quantity + quantityChange;
        
        // Cập nhật số lượng mới
        const updateResponse = await fetch(`${PRODUCT_SERVICE}/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
                'x-username': username
            },
            body: JSON.stringify({
                ...product,
                quantity: newQuantity
            })
        });
        
        return { success: updateResponse.ok };
    } catch (error) {
        console.error('Error updating product quantity:', error);
        return { success: false };
    }
};

// Tạo đơn hàng mới
const createOrder = async (req, res) => {
    try {
        const { products } = req.body;
        const userId = req.user.id;
        const username = req.user.username;
        
        if (!products || products.length === 0) {
            return res.status(400).json({ message: 'Products are required' });
        }
        
        // Kiểm tra tính khả dụng của từng sản phẩm
        const productDetails = [];
        let totalAmount = 0;
        
        for (const item of products) {
            const check = await checkProductAvailability(item.productId, item.quantity);
            
            if (!check.available) {
                return res.status(400).json({ 
                    message: `Product ${item.productId}: ${check.message}` 
                });
            }
            
            const productInfo = {
                productId: check.product.id,
                name: check.product.name,
                price: check.product.price,
                quantity: item.quantity
            };
            
            productDetails.push(productInfo);
            totalAmount += check.product.price * item.quantity;
        }
        
        // Tạo đơn hàng
        const newOrder = new Order({
            user: userId,
            username: username,
            products: productDetails,
            totalAmount: totalAmount,
            status: 'pending'
        });
        
        await newOrder.save();
        
        // Cập nhật số lượng sản phẩm (trừ đi số lượng đã đặt)
        for (const item of productDetails) {
            await updateProductQuantity(item.productId, -item.quantity, userId, username);
        }
        
        res.status(201).json({ 
            message: 'Order created successfully', 
            order: newOrder 
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Lấy tất cả đơn hàng (của user hiện tại)
const getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy tất cả đơn hàng (admin - không filter theo user)
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy chi tiết 1 đơn hàng
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Kiểm tra quyền truy cập (chỉ user sở hữu mới xem được)
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Valid values: pending, processing, completed, cancelled' 
            });
        }
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Nếu hủy đơn hàng, hoàn lại số lượng sản phẩm
        if (status === 'cancelled' && order.status !== 'cancelled') {
            for (const item of order.products) {
                await updateProductQuantity(item.productId, item.quantity, req.user.id, req.user.username);
            }
        }
        
        order.status = status;
        await order.save();
        
        res.json({ 
            message: 'Order status updated successfully', 
            order 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Xóa đơn hàng
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Kiểm tra quyền xóa
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Nếu đơn hàng chưa hoàn thành, hoàn lại số lượng sản phẩm
        if (order.status !== 'completed' && order.status !== 'cancelled') {
            for (const item of order.products) {
                await updateProductQuantity(item.productId, item.quantity, req.user.id, req.user.username);
            }
        }
        
        await Order.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { 
    createOrder, 
    getOrders, 
    getAllOrders,
    getOrderById, 
    updateOrderStatus, 
    deleteOrder 
};
