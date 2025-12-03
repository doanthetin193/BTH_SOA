import express from 'express';
import { 
    getAllOrderItems, 
    getOrderItemById, 
    createOrderItem, 
    updateOrderItem, 
    deleteOrderItem,
    getOrderItemsByOrderId
} from '../controllers/orderItemController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả routes yêu cầu authentication
router.use(authMiddleware);

// Routes cho order items
router.get('/', getAllOrderItems);                      // Lấy tất cả order items (có thể filter theo orderId)
router.get('/:id', getOrderItemById);                   // Lấy chi tiết một order item
router.post('/', createOrderItem);                      // Tạo order item mới
router.put('/:id', updateOrderItem);                    // Cập nhật order item
router.delete('/:id', deleteOrderItem);                 // Xóa order item

// Route lấy order items theo order
router.get('/order/:orderId', getOrderItemsByOrderId);  // Lấy tất cả items của một order

export default router;
