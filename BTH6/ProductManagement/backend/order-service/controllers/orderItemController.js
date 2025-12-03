import OrderItem from "../models/OrderItem.js";
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

// Lấy thông tin sản phẩm từ Product Service
const getProductInfo = async (productId) => {
    try {
        const PRODUCT_SERVICE = await getProductServiceUrl();
        const response = await fetch(`${PRODUCT_SERVICE}/api/products/${productId}`);
        
        if (!response.ok) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
};

// Cập nhật số lượng sản phẩm
const updateProductQuantity = async (productId, quantityChange, userId, username) => {
    try {
        const PRODUCT_SERVICE = await getProductServiceUrl();
        
        // Lấy thông tin sản phẩm hiện tại
        const product = await getProductInfo(productId);
        if (!product) return { success: false };
        
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

// Lấy tất cả order items
const getAllOrderItems = async (req, res) => {
    try {
        const { orderId } = req.query;
        
        let query = {};
        if (orderId) {
            query.orderId = orderId;
        }
        
        const orderItems = await OrderItem.find(query).sort({ createdAt: -1 });
        res.json(orderItems);
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy order item theo ID
const getOrderItemById = async (req, res) => {
    try {
        const orderItem = await OrderItem.findById(req.params.id);
        
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        
        res.json(orderItem);
    } catch (error) {
        console.error('Error fetching order item:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Tạo order item mới
const createOrderItem = async (req, res) => {
    try {
        const { orderId, productId, quantity, unitPrice } = req.body;
        const userId = req.user.id;
        const username = req.user.username;
        
        // Kiểm tra order tồn tại
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Kiểm tra sản phẩm và số lượng tồn kho
        const product = await getProductInfo(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        if (product.quantity < quantity) {
            return res.status(400).json({ 
                message: `Insufficient stock. Available: ${product.quantity}` 
            });
        }
        
        // Xác định giá (ưu tiên giá từ request, nếu không có thì lấy từ sản phẩm)
        const finalUnitPrice = unitPrice || product.price;
        
        // Tạo order item
        const newOrderItem = new OrderItem({
            orderId,
            productId,
            productName: product.name,
            quantity,
            unitPrice: finalUnitPrice,
            totalPrice: quantity * finalUnitPrice
        });
        
        await newOrderItem.save();
        
        // Cập nhật số lượng sản phẩm (trừ đi)
        await updateProductQuantity(productId, -quantity, userId, username);
        
        // Cập nhật tổng tiền của order
        const allItems = await OrderItem.find({ orderId });
        const newTotalAmount = allItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        await Order.findByIdAndUpdate(orderId, { totalAmount: newTotalAmount });
        
        res.status(201).json({ 
            message: 'Order item created successfully', 
            orderItem: newOrderItem 
        });
    } catch (error) {
        console.error('Error creating order item:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Cập nhật order item
const updateOrderItem = async (req, res) => {
    try {
        const { quantity, unitPrice } = req.body;
        const userId = req.user.id;
        const username = req.user.username;
        
        const orderItem = await OrderItem.findById(req.params.id);
        
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        
        const oldQuantity = orderItem.quantity;
        const quantityDiff = quantity - oldQuantity;
        
        // Kiểm tra tồn kho nếu tăng số lượng
        if (quantityDiff > 0) {
            const product = await getProductInfo(orderItem.productId);
            if (!product || product.quantity < quantityDiff) {
                return res.status(400).json({ 
                    message: `Insufficient stock. Available: ${product?.quantity || 0}` 
                });
            }
        }
        
        // Cập nhật order item
        orderItem.quantity = quantity;
        if (unitPrice) orderItem.unitPrice = unitPrice;
        orderItem.totalPrice = orderItem.quantity * orderItem.unitPrice;
        
        await orderItem.save();
        
        // Cập nhật số lượng sản phẩm
        if (quantityDiff !== 0) {
            await updateProductQuantity(orderItem.productId, -quantityDiff, userId, username);
        }
        
        // Cập nhật tổng tiền của order
        const allItems = await OrderItem.find({ orderId: orderItem.orderId });
        const newTotalAmount = allItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        await Order.findByIdAndUpdate(orderItem.orderId, { totalAmount: newTotalAmount });
        
        res.json({ 
            message: 'Order item updated successfully', 
            orderItem 
        });
    } catch (error) {
        console.error('Error updating order item:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Xóa order item
const deleteOrderItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        
        const orderItem = await OrderItem.findById(req.params.id);
        
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        
        const orderId = orderItem.orderId;
        
        // Hoàn lại số lượng sản phẩm
        await updateProductQuantity(orderItem.productId, orderItem.quantity, userId, username);
        
        // Xóa order item
        await OrderItem.findByIdAndDelete(req.params.id);
        
        // Cập nhật tổng tiền của order
        const remainingItems = await OrderItem.find({ orderId });
        const newTotalAmount = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        await Order.findByIdAndUpdate(orderId, { totalAmount: newTotalAmount });
        
        res.json({ message: 'Order item deleted successfully' });
    } catch (error) {
        console.error('Error deleting order item:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy tất cả order items của một order
const getOrderItemsByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const orderItems = await OrderItem.find({ orderId }).sort({ createdAt: -1 });
        
        res.json({
            orderId,
            items: orderItems,
            totalItems: orderItems.length,
            totalAmount: orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
        });
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { 
    getAllOrderItems, 
    getOrderItemById, 
    createOrderItem, 
    updateOrderItem, 
    deleteOrderItem,
    getOrderItemsByOrderId
};
